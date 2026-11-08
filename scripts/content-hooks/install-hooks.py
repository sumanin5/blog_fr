"""Run using a Python interpreter with PyYAML installed; no Node/Husky needed."""

import importlib.util
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
if importlib.util.find_spec("yaml") is None:
    raise SystemExit("Install requirements first: python -m pip install -r tools/requirements.txt")
result = subprocess.run(["git", "config", "--local", "--get", "core.hooksPath"], cwd=root, capture_output=True, text=True)
if result.returncode == 0 and result.stdout.strip() != ".githooks":
    raise SystemExit("Existing custom hooks detected; integrate pre-commit manually instead of replacing them")
subprocess.run(["git", "config", "--local", "core.hooksPath", ".githooks"], cwd=root, check=True)
subprocess.run(["git", "config", "--local", "content.python", sys.executable], cwd=root, check=True)
(root / ".githooks/pre-commit").chmod(0o755)
print("Installed content validation hook for this clone using", sys.executable)
