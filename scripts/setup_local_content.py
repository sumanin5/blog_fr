"""Select local content and update only GitOps keys in backend/.env.local.

No database writes, Git commands, network calls or remote credentials required.
"""
import argparse
from pathlib import Path
import shutil


def configure(project: Path, preferred: Path | None = None) -> Path:
    project = project.resolve()
    fallback = project / "content"
    if preferred is not None:
        preferred = (project / preferred).resolve()
        if not preferred.is_dir():
            print(f"Preferred directory not found: {preferred}; using {fallback}")
    selected = preferred if preferred is not None and preferred.is_dir() else fallback
    if not selected.exists():
        shutil.copytree(project / "content-template", selected)
    if not selected.is_dir():
        raise ValueError(f"Not a directory: {selected}")
    if any(character in str(selected) for character in ("\n", "\r")):
        raise ValueError("Content directory must be a single-line path")

    # Quote dotenv values for paths containing spaces or '#'. Escape backslashes
    # by storing POSIX separators; never read or rewrite the credential .env.
    updates = {
        "CONTENT_DIR": '"' + selected.as_posix().replace('"', '\\"') + '"',
        "GIT_PULL_BEFORE_SYNC": "false",
        "ENABLE_GIT_AUTO_SYNC": "false",
    }
    target = project / "backend/.env.local"
    original = target.read_text(encoding="utf-8-sig") if target.exists() else ""
    output = []
    for line in original.splitlines():
        key = line.strip().removeprefix("export ").partition("=")[0].strip()
        if key not in updates:
            output.append(line)
    output.extend(f"{key}={value}" for key, value in updates.items())
    target.write_text("\n".join(output) + "\n", encoding="utf-8")
    print(f"Local content: {selected}")
    print("Remote pull: disabled; automatic sync: disabled. Database configuration unchanged.")
    return selected


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--content-dir", type=Path, help="Optional directory; relative to project root")
    args = parser.parse_args()
    configure(Path(__file__).resolve().parents[1], args.content_dir)
