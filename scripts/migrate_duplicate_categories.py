#!/usr/bin/env python3
"""整理内容仓库中同一 category_id 的中文/拼音重复分类目录。

设计原则：
- 只在显式 --apply 时修改文件；默认 dry-run。
- 修改前把非 canonical 目录完整复制到内容仓库外的 archive 目录。
- canonical 目录默认选择 ASCII slug 目录；中文显示名保留在 index.md title。
- 文章显式 slug、category_id 不变；缺失 slug 时按旧路径生成稳定 slug。
- 正文不一致、媒体同名不同内容、无法确定 canonical 时中止该组，不强行合并。
- 这是内容迁移脚本，不属于网站同步器；网站仍然只做 Git → 数据库单向导入。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from contextlib import contextmanager
import shutil
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import frontmatter
from slugify import slugify

ARTICLE_SUFFIXES = {".md", ".mdx"}
INDEX_NAME = "index.md"
ARTICLE_ONLY_FIELDS = {
    "author",
    "author_id",
    "status",
    "slug",
    "date",
    "tags",
    "summary",
    "meta_title",
    "meta_description",
    "meta_keywords",
    "allow_comments",
    "use_server_rendering",
    "type",
}


def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha_text(text: str) -> str:
    return sha_bytes(text.encode("utf-8"))


@contextmanager
def staging_workspace(parent: Path, root: Path):
    workspace = Path(tempfile.mkdtemp(prefix=".category-merge-", dir=parent)).resolve()
    if not workspace.is_relative_to(root.resolve()):
        raise ValueError("Staging directory escaped repository")
    try:
        yield workspace
    except BaseException:
        # Keep any recovery files if restoring originals also failed.
        raise
    else:
        shutil.rmtree(workspace)


def is_ascii_dir_name(name: str) -> bool:
    return bool(name) and all(ch.isascii() and (ch.isalnum() or ch in "-_") for ch in name)


def dump_frontmatter(path: Path, metadata: dict[str, Any], body: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        frontmatter.dumps(frontmatter.Post(body, **metadata)),
        encoding="utf-8",
    )


def stable_slug_for_old_path(rel_path: str) -> str:
    stem = Path(rel_path).stem
    return f"{slugify(stem) or 'post'}-{sha_text(rel_path)[:8]}"


def choose_canonical(dirs: list[Path], mode: str) -> Path:
    ascii_dirs = [d for d in dirs if is_ascii_dir_name(d.name)]
    non_ascii_dirs = [d for d in dirs if d not in ascii_dirs]
    if mode == "ascii":
        candidates = ascii_dirs
    else:
        candidates = non_ascii_dirs
    if len(candidates) != 1:
        raise ValueError(
            f"Cannot choose canonical ({mode}) from {[d.name for d in dirs]}"
        )
    return candidates[0]


def merge_index_metadata(
    canonical_path: Path,
    canonical_meta: dict[str, Any],
    other_items: list[tuple[Path, dict[str, Any]]],
    archive_group: Path,
) -> tuple[dict[str, Any], list[str], list[str]]:
    merged = dict(canonical_meta)
    merged_fields: list[str] = []
    ambiguities: list[str] = []

    canonical_dir = canonical_path.parent
    for other_path, other_meta in other_items:
        if not any(field in other_meta for field in ARTICLE_ONLY_FIELDS):
            continue
        # 中文 index 里混入的文章字段不是分类字段，不能合并进分类。
        article_fields = sorted(set(other_meta) & ARTICLE_ONLY_FIELDS)
        if article_fields:
            ambiguities.append(
                f"{other_path.parent.name}/index.md 含文章字段 {article_fields}；"
                "已保留在 archive，未合并进分类"
            )

    for other_path, other_meta in other_items:
        other_dir = other_path.parent
        # icon 优先取实际存在的相对路径；icon_id 也保留供数据库复用。
        if "icon" not in merged and other_meta.get("icon"):
            icon_path = Path(str(other_meta["icon"]))
            if (other_dir / icon_path).is_file():
                merged["icon"] = icon_path.as_posix()
                merged_fields.append("icon")
        if "icon_id" not in merged and other_meta.get("icon_id"):
            merged["icon_id"] = other_meta["icon_id"]
            merged_fields.append("icon_id")
        if "excerpt" not in merged and other_meta.get("excerpt"):
            merged["excerpt"] = other_meta["excerpt"]
            merged_fields.append("excerpt")
        if "order" not in merged and other_meta.get("order") is not None:
            merged["order"] = other_meta["order"]
            merged_fields.append("order")
        if "order" not in merged and other_meta.get("sort") is not None:
            merged["order"] = other_meta["sort"]
            merged_fields.append("order(from sort)")
        if "hidden" not in merged and other_meta.get("hidden") is not None:
            merged["hidden"] = other_meta["hidden"]
            merged_fields.append("hidden")
        if "post_sort" not in merged and other_meta.get("post_sort"):
            merged["post_sort"] = other_meta["post_sort"]
            merged_fields.append("post_sort")

    # cover：canonical 的裸文件名可能无法在本地解析；使用其他目录里实际存在的相对路径。
    canonical_cover = merged.get("cover")
    cover_exists = False
    if canonical_cover:
        cover_exists = (canonical_dir / str(canonical_cover)).is_file()
    if not cover_exists:
        for other_path, other_meta in other_items:
            other_cover = other_meta.get("cover")
            if not other_cover:
                continue
            if (other_path.parent / str(other_cover)).is_file():
                if (merged.get("cover_media_id") and other_meta.get("cover_media_id")
                        and merged["cover_media_id"] != other_meta["cover_media_id"]):
                    ambiguities.append("Conflicting cover IDs: choose an authoritative source image before applying")
                    continue
                merged["cover"] = Path(str(other_cover)).as_posix()
                merged_fields.append("cover")
                break

    return merged, merged_fields, ambiguities


def merge_group(
    content_dir: Path,
    archive_root: Path,
    group_dirs: list[Path],
    apply: bool,
    canonical_mode: str,
) -> dict[str, Any]:
    canonical = choose_canonical(group_dirs, canonical_mode)
    others = [d for d in group_dirs if d != canonical]
    canonical_index = canonical / INDEX_NAME
    canonical_post = frontmatter.loads(canonical_index.read_text(encoding="utf-8"))
    others_data = [
        (
            d / INDEX_NAME,
            frontmatter.loads((d / INDEX_NAME).read_text(encoding="utf-8")),
        )
        for d in others
    ]

    canonical_body_hash = sha_text(canonical_post.content)
    for other_path, other_post in others_data:
        if sha_text(other_post.content) != canonical_body_hash:
            return {
                "group": [d.as_posix() for d in group_dirs],
                "status": "blocked",
                "reason": f"{other_path} 正文与 canonical 不一致，需人工判断",
            }

    archive_group = archive_root / canonical.parent.name / canonical.name
    report: dict[str, Any] = {
        "group": [d.as_posix() for d in group_dirs],
        "canonical": canonical.as_posix(),
        "status": "planned" if not apply else "applied",
        "archive": archive_group.as_posix(),
        "merged_fields": [],
        "moved_articles": [],
        "moved_assets": [],
        "ambiguities": [],
    }

    merged_meta, merged_fields, ambiguities = merge_index_metadata(
        canonical_index,
        canonical_post.metadata,
        [(path, post.metadata) for path, post in others_data],
        archive_group,
    )
    report["merged_fields"] = merged_fields
    report["ambiguities"] = ambiguities

    if any("Conflicting cover IDs" in item for item in ambiguities):
        return {**report, "status": "blocked", "reason": "Conflicting cover IDs require an explicit content decision"}

    # Validate every destination and prepare all bytes before touching sources.
    content_dir = content_dir.resolve()
    group_dirs = [d.resolve() for d in group_dirs]
    canonical = canonical.resolve()
    others = [d for d in group_dirs if d != canonical]
    archive_group = archive_group.resolve()
    if archive_group.is_relative_to(content_dir):
        raise ValueError("Archive must be outside the content repository")
    for folder in group_dirs:
        if not folder.is_relative_to(content_dir) or folder == content_dir:
            raise ValueError("Group must stay within content repository")
        if folder.is_symlink() or folder.is_junction():
            raise ValueError("Linked category directories are not supported")
        if any(p.is_symlink() or p.is_junction() for p in folder.rglob("*")):
            raise ValueError("Linked content is not supported")

    files = {p.relative_to(canonical): p.read_bytes()
             for p in canonical.rglob("*") if p.is_file()}
    source_paths = {rel: (canonical / rel).relative_to(content_dir).as_posix()
                    for rel in files}
    for other in others:
        for source in sorted(other.rglob("*")):
            if not source.is_file():
                continue
            rel = source.relative_to(other)
            if rel.as_posix() == INDEX_NAME:
                continue
            data = source.read_bytes()
            if rel in files and files[rel] != data:
                return {**report, "status": "blocked",
                        "reason": f"File conflict: {source} and {canonical / rel}"}
            files.setdefault(rel, data)
            source_paths.setdefault(rel, source.relative_to(content_dir).as_posix())
            key = "moved_articles" if source.suffix.lower() in ARTICLE_SUFFIXES else "moved_assets"
            report[key].append(rel.as_posix())

    ignored = {"README", "AGENTS", "CLAUDE", "LICENSE", "CONTRIBUTING", "CHANGELOG"}
    for rel, data in list(files.items()):
        if (rel.name == INDEX_NAME or rel.suffix.lower() not in ARTICLE_SUFFIXES
                or rel.stem.upper() in ignored):
            continue
        post = frontmatter.loads(data.decode("utf-8"))
        changed = False
        if not post.metadata.get("slug"):
            post.metadata["slug"] = stable_slug_for_old_path(source_paths[rel])
            changed = True
        if not post.metadata.get("category_id") and merged_meta.get("category_id"):
            post.metadata["category_id"] = merged_meta["category_id"]
            changed = True
        if changed:
            files[rel] = frontmatter.dumps(post).encode("utf-8")
    files[Path(INDEX_NAME)] = frontmatter.dumps(
        frontmatter.Post(canonical_post.content, **merged_meta)
    ).encode("utf-8")
    if not apply:
        return report

    # Back up canonical as well as duplicates, including untracked local files.
    if archive_group.exists():
        raise FileExistsError(f"Archive already exists: {archive_group}")
    archive_group.mkdir(parents=True)
    for folder in group_dirs:
        shutil.copytree(folder, archive_group / folder.name)

    # Stage on the same filesystem. Originals are renamed, not deleted, until
    # the entire replacement succeeds. On any failure restore every original.
    with staging_workspace(canonical.parent, content_dir) as workspace:
        if not workspace.is_relative_to(content_dir):
            raise ValueError("Staging directory escaped repository")
        staged = workspace / "prepared"
        staged.mkdir()
        for rel, data in files.items():
            target = staged / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        saved = []
        activated = False
        try:
            for index, folder in enumerate(group_dirs):
                backup = workspace / f"original-{index}"
                os.replace(folder, backup)
                saved.append((folder, backup))
            os.replace(staged, canonical)
            activated = True
        except BaseException:
            if activated:
                os.replace(canonical, staged)
            for folder, backup in reversed(saved):
                os.replace(backup, folder)
            raise
        # TemporaryDirectory only removes the verified staging subtree after
        # successful activation; a complete external archive remains available.
    report["archived_indexes"] = [str(archive_group / d.name / INDEX_NAME) for d in others]
    report["status"] = "applied"
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--content-dir", type=Path, required=True)
    parser.add_argument("--archive-dir", type=Path)
    parser.add_argument("--canonical", choices=["ascii", "chinese"], default="ascii")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()

    content_dir = args.content_dir.resolve()
    if not content_dir.is_dir():
        print(f"content dir not found: {content_dir}", file=sys.stderr)
        return 2

    archive_root = args.archive_dir or (
        content_dir.parent
        / "blog-content-migration-archive"
        / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    )
    groups: dict[str, list[Path]] = defaultdict(list)
    for index in sorted(content_dir.rglob(INDEX_NAME)):
        rel = index.relative_to(content_dir)
        if rel.parts[0] not in {"articles", "ideas"} or len(rel.parts) < 3:
            continue
        post = frontmatter.loads(index.read_text(encoding="utf-8"))
        category_id = post.metadata.get("category_id")
        if category_id:
            groups[str(category_id)].append(index.parent)

    report = {
        "content_dir": content_dir.as_posix(),
        "archive_dir": archive_root.as_posix() if args.apply else None,
        "apply": args.apply,
        "groups": [],
    }
    exit_code = 0
    for category_id, dirs in groups.items():
        if len(dirs) < 2:
            continue
        try:
            result = merge_group(
                content_dir, archive_root, sorted(dirs), args.apply, args.canonical
            )
        except Exception as exc:
            import traceback

            result = {
                "group": [d.as_posix() for d in dirs],
                "status": "error",
                "reason": f"{type(exc).__name__}: {exc}",
                "traceback": traceback.format_exc(),
            }
        result["category_id"] = category_id
        report["groups"].append(result)
        if result["status"] in {"blocked", "error"}:
            exit_code = 1

    text = json.dumps(report, ensure_ascii=False, indent=2)
    print(text)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(text + "\n", encoding="utf-8")
    if args.apply and archive_root.exists():
        (archive_root / "migration-report.json").write_text(
            text + "\n", encoding="utf-8"
        )
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
