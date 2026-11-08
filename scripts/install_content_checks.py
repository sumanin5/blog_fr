"""Distribute the exact backend validator and hook/CI templates to a content clone."""

import argparse
import shutil
from pathlib import Path


def install(root):
    source = Path(__file__).resolve().parents[1]
    root = Path(root).resolve()
    if not (root / ".git").exists():
        raise ValueError("Target must be a content Git checkout")
    templates = source / "scripts/content-hooks"
    for original, relative in [
        (source / "backend/app/git_ops/content_contract.py", "tools/content_contract.py"),
        (templates / "pre-commit", ".githooks/pre-commit"),
        (templates / "install-hooks.py", "tools/install-hooks.py"),
        (templates / "validate-content.yml", ".github/workflows/validate-content.yml"),
    ]:
        target = root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        if relative == ".githooks/pre-commit":
            target.write_bytes(original.read_bytes().replace(b"\r\n", b"\n"))
        else:
            shutil.copyfile(original, target)
    (root / "tools/requirements.txt").write_text("PyYAML==6.0.3\n", encoding="utf-8")
    attributes = root / ".gitattributes"
    text = attributes.read_text(encoding="utf-8") if attributes.exists() else ""
    rule = ".githooks/* text eol=lf"
    if rule not in text.splitlines():
        attributes.write_text(text.rstrip("\n") + ("\n" if text else "") + rule + "\n", encoding="utf-8", newline="\n")
    (root / ".githooks/pre-commit").chmod(0o755)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("content_dir", type=Path)
    install(parser.parse_args().content_dir)
