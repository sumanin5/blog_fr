"""Shared eligibility rules for full scans, diffs and rename pre-scans."""

from pathlib import Path

DOCUMENT_STEMS = {"README", "AGENTS", "CLAUDE", "LICENSE", "CONTRIBUTING", "CHANGELOG"}


def is_content_path(path: str | Path) -> bool:
    path = Path(str(path).replace("\\", "/"))
    return (
        path.suffix.lower() in {".md", ".mdx"}
        and path.stem.upper() not in DOCUMENT_STEMS
        and not any(part.startswith(".") for part in path.parts)
    )
