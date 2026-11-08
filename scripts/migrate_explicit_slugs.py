"""One-time, reversible directory rename. URLs/slugs stay unchanged. No Git push."""

import argparse
import importlib.util
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def migrate(root, mapping, apply=False):
    root = Path(root).resolve()
    changes, moves = {}, []
    for before, after in mapping.items():
        source, target = root / before, root / after
        if not source.resolve().is_relative_to(root) or not target.resolve().is_relative_to(root):
            raise ValueError("Migration paths must remain within repository")
        if not source.is_dir() or target.exists():
            raise ValueError(f"Expected old directory and no target: {before} -> {after}")
        if source.is_symlink() or source.is_junction():
            raise ValueError("Linked directories are not supported")
        moves.append((source, target))
        index = source / "index.md"
        text = index.read_text(encoding="utf-8")
        meta = contract.metadata(text)
        expected_slug = Path(before).name
        if meta.get("slug") not in (None, expected_slug):
            raise ValueError(f"Existing category slug differs: {before}")
        if not meta.get("slug"):
            text = text.replace("---\n", f"---\nslug: {expected_slug}\n", 1)
        changes[index] = text.encode("utf-8")

    files = contract.working_files(root)
    projected = {}
    for name, text in files.items():
        path = root / name
        text = changes.get(path, text.encode("utf-8")).decode("utf-8")

        def rewrite(match):
            dest = match.group(2)
            if "://" in dest or dest.startswith(("/", "mailto:", "#")):
                return match.group(0)
            for old, new in mapping.items():
                dest = dest.replace(Path(old).name + "/", Path(new).name + "/")
            return match.group(1) + dest + match.group(3)

        text = re.sub(r"(!?\[[^\]]*\]\()([^)]+)(\))", rewrite, text)
        if text != files[name]:
            changes[path] = text.encode("utf-8")
        translated = name
        for old, new in mapping.items():
            if name.startswith(old + "/"):
                translated = new + name[len(old):]
                break
        projected[translated] = text
    errors = contract.validate(projected)
    if errors:
        raise ValueError("\n".join(errors))
    report = {"mapping": mapping, "articles": sum(Path(p).name != "index.md" for p in projected),
              "categories": sum(Path(p).name == "index.md" for p in projected),
              "urls_unchanged": True, "applied": apply}
    if not apply:
        return report
    originals = {p: p.read_bytes() for p in changes}
    manifest = root / contract.MANIFEST
    manifest_before = manifest.read_bytes() if manifest.exists() else None
    completed = []
    try:
        for path, data in changes.items():
            path.write_bytes(data)
        for source, target in moves:
            source.rename(target)
            completed.append((source, target))
        manifest.write_text('{"version": 1}\n', encoding="utf-8")
    except BaseException:
        for source, target in reversed(completed):
            target.rename(source)
        for path, data in originals.items():
            path.write_bytes(data)
        if manifest_before is None:
            manifest.unlink(missing_ok=True)
        else:
            manifest.write_bytes(manifest_before)
        raise
    return report


spec = importlib.util.spec_from_file_location("content_contract", REPO / "backend/app/git_ops/content_contract.py")
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--mapping", type=Path, default=REPO / "scripts/content-chinese-directories.json")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    print(json.dumps(migrate(args.root, json.loads(args.mapping.read_text(encoding="utf-8")), args.apply), ensure_ascii=False, indent=2))
