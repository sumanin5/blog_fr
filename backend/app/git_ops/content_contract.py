"""Standalone content contract, also distributed unchanged to content/tools.

Only Python + PyYAML are needed. No app startup, database, uploads or network.
The pre-commit mode reads the complete Git index, never unstaged working files.
"""

import argparse
import io
import re
import subprocess
import sys
import time
from pathlib import Path, PurePosixPath

import yaml

VERSION = 1
MANIFEST = ".content-contract.json"
DOCUMENTS = {"README", "AGENTS", "CLAUDE", "LICENSE", "CONTRIBUTING", "CHANGELOG"}
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")


def is_content_path(value):
    path = PurePosixPath(str(value).replace("\\", "/"))
    return (path.suffix.lower() in {".md", ".mdx"}
            and path.stem.upper() not in DOCUMENTS
            and not any(part.startswith(".") for part in path.parts))


class UniqueLoader(yaml.SafeLoader):
    """Duplicate YAML keys are errors, rather than silently taking the last."""


def _mapping(loader, node, deep=False):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in result:
            raise ValueError(f"Duplicate YAML key: {key}")
        result[key] = loader.construct_object(value_node, deep=deep)
    return result


UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _mapping)


def metadata(text):
    lines = text.lstrip("\ufeff").splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    end = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), None)
    if end is None:
        raise ValueError("Unclosed frontmatter")
    value = yaml.load("\n".join(lines[1:end]), Loader=UniqueLoader)
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError("Frontmatter must be a mapping")
    return value


def validate(files):
    """Return all violations of the strict v1 schema, with conflicting paths."""
    errors, parsed, categories, articles = [], {}, {}, {}
    urls = {f"/posts/{kind}/categories": "reserved category listing"
            for kind in ("articles", "ideas")}
    for name, text in sorted(files.items()):
        if not is_content_path(name):
            continue
        path = PurePosixPath(name)
        if len(path.parts) != 3 or path.parts[0] not in {"articles", "ideas"}:
            errors.append(f"{name}: expected articles/<category>/<file> or ideas/<category>/<file>")
            continue
        try:
            meta = metadata(text)
        except (ValueError, TypeError, yaml.YAMLError) as exc:
            errors.append(f"{name}: invalid frontmatter: {exc}")
            continue
        slug = meta.get("slug")
        limit = 100 if path.name == "index.md" else 200
        if not isinstance(slug, str) or not SLUG.fullmatch(slug) or len(slug) > limit:
            errors.append(f"{name}: explicit slug required (lowercase letters, digits, hyphens; max {limit})")
            continue
        is_index = path.name == "index.md"
        if path.name.lower() == "index.md" and not is_index:
            errors.append(f"{name}: category index must be named index.md")
            continue
        parsed[name] = meta
        bucket, key = (categories, (path.parts[0], slug)) if is_index else (articles, slug)
        if key in bucket:
            errors.append(f"{name}: duplicate slug '{slug}', also used by {bucket[key]}")
        else:
            bucket[key] = name
        url = (f"/posts/{path.parts[0]}/categories/{slug}" if is_index
               else f"/posts/{path.parts[0]}/{slug}")
        if url in urls:
            errors.append(f"{name}: duplicate/reserved URL {url}, conflicts with {urls[url]}")
        else:
            urls[url] = name
    for name in parsed:
        path = PurePosixPath(name)
        if path.name != "index.md":
            index = (path.parent / "index.md").as_posix()
            if index not in parsed:
                errors.append(f"{name}: missing or invalid category index {index}")
    return errors


def working_files(root):
    root = Path(root).resolve()
    result = {}
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root).as_posix()
        if path.is_file() and is_content_path(relative):
            if not path.resolve().is_relative_to(root):
                raise ValueError(f"{relative}: source escapes repository")
            result[relative] = path.read_text(encoding="utf-8")
    return result


def staged_files(root):
    entries = subprocess.run(["git", "ls-files", "--stage", "-z"], cwd=root,
                             check=True, capture_output=True).stdout
    paths, hashes = [], []
    for entry in entries.split(b"\0"):
        if not entry:
            continue
        info, raw_path = entry.split(b"\t", 1)
        mode, oid, stage = info.split()
        name = raw_path.decode("utf-8")
        if not is_content_path(name):
            continue
        if stage != b"0":
            raise ValueError(f"{name}: unresolved merge conflict")
        if mode not in {b"100644", b"100755"}:
            raise ValueError(f"{name}: content must be a regular file")
        paths.append(name)
        hashes.append(oid)
    if not paths:
        return {}
    output = subprocess.run(["git", "cat-file", "--batch"], cwd=root, check=True,
                            input=b"\n".join(hashes) + b"\n", capture_output=True).stdout
    stream, result = io.BytesIO(output), {}
    for name in paths:
        header = stream.readline().split()
        if len(header) != 3 or header[1] != b"blob":
            raise ValueError(f"{name}: cannot read staged blob")
        result[name] = stream.read(int(header[2])).decode("utf-8")
        stream.read(1)
    return result


def main():
    parser = argparse.ArgumentParser(description="Validate explicit content slugs and final URLs")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--staged", action="store_true", help="Validate complete Git index")
    args = parser.parse_args()
    start = time.perf_counter()
    try:
        files = staged_files(args.root) if args.staged else working_files(args.root)
        errors = validate(files)
    except (OSError, ValueError, UnicodeError, subprocess.CalledProcessError) as exc:
        print(f"Content validation failed: {exc}", file=sys.stderr)
        return 1
    for error in errors:
        print(error, file=sys.stderr)
    if errors:
        print(f"Commit/import blocked: {len(errors)} content errors", file=sys.stderr)
        return 1
    print(f"Content validation passed: {len(files)} files in {(time.perf_counter()-start)*1000:.1f} ms")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
