"""Exercise release ordering and failure handling without a Docker daemon."""

import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "deploy-release.sh"
RELEASE = "a" * 40
PREVIOUS = "b" * 40


class ReleaseTests(unittest.TestCase):
    def run_release(self, failure="", tag=RELEASE):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            release_dir = root / ".deploy" / RELEASE
            release_dir.mkdir(parents=True)
            (release_dir / "docker-compose.yml").write_text("services: {}\n")
            (root / "docker-compose.yml").write_text("old configuration\n")
            (root / ".env").write_text("ENVIRONMENT=production\n")
            (root / ".release.env").write_text(f"IMAGE_TAG={PREVIOUS}\n")
            log = root / "calls.jsonl"
            docker = root / "docker"
            docker.write_text('''#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
with open(os.environ["DEPLOY_TEST_LOG"], "a") as log:
    log.write(json.dumps({"args": args, "tag": os.environ.get("IMAGE_TAG")}) + "\\n")
fail = os.environ.get("DEPLOY_TEST_FAIL")
if (fail == "pull" and args[-1] == "pull"
    or fail == "migration" and "run" in args
    or fail == "health" and "--wait-timeout" in args and args[-1] == "180"
    or fail == "smoke" and "exec" in args):
    sys.exit(1)
''')
            docker.chmod(0o755)
            environment = dict(os.environ, PATH=f"{root}:{os.environ['PATH']}",
                               DEPLOY_TEST_LOG=str(log), DEPLOY_TEST_FAIL=failure)
            result = subprocess.run(["bash", str(SCRIPT), str(root), tag],
                                    env=environment, capture_output=True, text=True)
            calls = [json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []
            current = (root / ".release.env").read_text()
            previous = (root / ".previous-release.env").read_text() if (root / ".previous-release.env").exists() else None
            return result, calls, current, previous

    def test_migration_failure_preserves_running_release(self):
        result, calls, current, previous = self.run_release("migration")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("failed during migration", result.stderr)
        self.assertFalse(any("up" in call["args"] and call["args"][-1] == "180" for call in calls))
        self.assertEqual(current, f"IMAGE_TAG={PREVIOUS}\n")
        self.assertIsNone(previous)

    def test_pull_failure_never_runs_migrations(self):
        result, calls, _, _ = self.run_release("pull")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any("run" in call["args"] for call in calls))

    def test_success_uses_one_release_and_preserves_previous_tag(self):
        result, calls, current, previous = self.run_release()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(all(call["tag"] == RELEASE for call in calls))
        migration = next(i for i, call in enumerate(calls) if "run" in call["args"])
        app_start = next(i for i, call in enumerate(calls) if "up" in call["args"] and call["args"][-1] == "180")
        self.assertLess(migration, app_start)
        self.assertEqual(current, f"IMAGE_TAG={RELEASE}\n")
        self.assertEqual(previous, f"IMAGE_TAG={PREVIOUS}\n")
        self.assertIn("deployed and healthy", result.stdout)

    def test_health_failures_do_not_report_success(self):
        for failure in ("health", "smoke"):
            with self.subTest(failure=failure):
                result, _, _, _ = self.run_release(failure)
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn("deployed and healthy", result.stdout)

    def test_mutable_tag_is_rejected_before_docker(self):
        result, calls, _, _ = self.run_release(tag="latest")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(calls, [])

    def test_read_only_compose_file_does_not_break_deploy(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            release_dir = root / ".deploy" / RELEASE
            release_dir.mkdir(parents=True)
            (release_dir / "docker-compose.yml").write_text("services: {}\n")
            old_compose = root / "docker-compose.yml"
            old_compose.write_text("old configuration\n")
            old_compose.chmod(0o444)
            (root / ".env").write_text("ENVIRONMENT=production\n")
            (root / ".release.env").write_text(f"IMAGE_TAG={PREVIOUS}\n")
            log = root / "calls.jsonl"
            docker = root / "docker"
            docker.write_text('''#!/usr/bin/env python3
import sys
sys.exit(0)
''')
            docker.chmod(0o755)
            environment = dict(os.environ, PATH=f"{root}:{os.environ['PATH']}",
                               DEPLOY_TEST_LOG=str(log))
            result = subprocess.run(["bash", str(SCRIPT), str(root), RELEASE],
                                    env=environment, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual((root / "docker-compose.yml").read_text(), "services: {}\n")
            self.assertEqual((root / ".previous-compose.yml").read_text(), "old configuration\n")


if __name__ == "__main__":
    unittest.main()
