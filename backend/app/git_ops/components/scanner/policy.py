"""Shared eligibility rules for full scans, diffs and rename pre-scans."""

from app.git_ops.content_contract import is_content_path

__all__ = ["is_content_path"]
