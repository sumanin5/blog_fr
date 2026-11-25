"""宿主机内容监听与预检同步脚本（scripts/watch_content.py）单元测试。"""

from __future__ import annotations

import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest import mock

WATCH_SCRIPT_PATH = Path(__file__).resolve().parents[1] / "watch_content.py"


def _load_watch_module():
    spec = importlib.util.spec_from_file_location("watch_content", WATCH_SCRIPT_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


watch_content = _load_watch_module()


class WatchContentTests(unittest.TestCase):
    def test_read_env_value_and_resolve_content_dir_priority(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            repo_root = Path(tmp)
            env_file = repo_root / ".env"
            env_file.write_text(
                "# comment\nCONTENT_HOST_DIR=\"./from-env-file\"\nOTHER=secret\n",
                encoding="utf-8",
            )

            self.assertEqual(
                watch_content.read_env_value(env_file, "CONTENT_HOST_DIR"),
                "./from-env-file",
            )
            self.assertIsNone(watch_content.read_env_value(env_file, "MISSING_KEY"))

            with mock.patch.dict(os.environ, {}, clear=False):
                os.environ.pop("CONTENT_HOST_DIR", None)
                self.assertEqual(
                    watch_content.resolve_content_dir(repo_root),
                    (repo_root / "from-env-file").resolve(),
                )
                os.environ["CONTENT_HOST_DIR"] = str(repo_root / "from-environ")
                self.assertEqual(
                    watch_content.resolve_content_dir(repo_root),
                    (repo_root / "from-environ").resolve(),
                )
                self.assertEqual(
                    watch_content.resolve_content_dir(repo_root, "./explicit"),
                    (repo_root / "explicit").resolve(),
                )

    def test_is_ignored_watch_path(self) -> None:
        for ignored in (
            ".git/HEAD",
            ".obsidian/workspace.json",
            "tools/content_contract.py",
            "articles/tech/.draft.mdx",
            "ideas/note/post.mdx.tmp",
            "articles/tech/~editing.md",
        ):
            self.assertTrue(
                watch_content.is_ignored_watch_path(ignored),
                f"expected ignored path: {ignored}",
            )

        for watched in (
            "articles/tech/post.mdx",
            "ideas/比特漫笔/抽象.mdx",
            "ideas/比特漫笔/assets/diagram.png",
        ):
            self.assertFalse(
                watch_content.is_ignored_watch_path(watched),
                f"expected watched path: {watched}",
            )

    def test_diff_snapshots(self) -> None:
        prev = {
            "articles/tech/unchanged.md": (100, 10),
            "articles/tech/edited.mdx": (100, 10),
            "articles/tech/removed.md": (100, 10),
        }
        curr = {
            "articles/tech/unchanged.md": (100, 10),
            "articles/tech/edited.mdx": (200, 12),
            "articles/tech/added.mdx": (150, 20),
        }
        self.assertEqual(
            watch_content.diff_snapshots(prev, curr),
            [
                ("A", "articles/tech/added.mdx"),
                ("M", "articles/tech/edited.mdx"),
                ("D", "articles/tech/removed.md"),
            ],
        )

    def test_plan_sync_changes_maps_articles_assets_and_index(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cat_dir = root / "ideas" / "比特漫笔"
            (cat_dir / "assets").mkdir(parents=True)
            (cat_dir / "index.md").write_text("---\ntitle: Cat\n---\n", encoding="utf-8")
            (cat_dir / "post.mdx").write_text("---\ntitle: Post\n---\n", encoding="utf-8")
            (cat_dir / "README.md").write_text("notes", encoding="utf-8")
            (cat_dir / "assets" / "fig.png").write_bytes(b"png")

            # 非文章根目录文档变更忽略
            requires_full, changes = watch_content.plan_sync_changes(
                [("M", "AGENTS.md"), ("M", "docs/notes.md")],
                root,
            )
            self.assertFalse(requires_full)
            self.assertEqual(changes, [])

            # 分类内资源变更联动刷新同专栏文章与 index.md（跳过 README.md）
            requires_full, changes = watch_content.plan_sync_changes(
                [("M", "ideas/比特漫笔/assets/fig.png")],
                root,
            )
            self.assertFalse(requires_full)
            self.assertEqual(
                changes,
                [
                    ("M", "ideas/比特漫笔/index.md"),
                    ("M", "ideas/比特漫笔/post.mdx"),
                ],
            )

            # index.md 新增或删除触发全量对齐
            requires_full, changes = watch_content.plan_sync_changes(
                [("A", "ideas/比特漫笔/index.md")],
                root,
            )
            self.assertTrue(requires_full)
            self.assertEqual(changes, [])

    def test_find_unregistered_jsx_tags_ignores_code_blocks(self) -> None:
        registered = {"Tabs", "TabsList", "Callout"}
        body = (
            "正文开始 <Callout>hi</Callout>\n\n"
            "行内示例 `<FakeInline />`。\n\n"
            "```tsx\n<FakeInFence />\n```\n\n"
            "<UnknownWidget title=\"bad\" />\n"
        )
        self.assertEqual(
            watch_content.find_unregistered_jsx_tags(body, registered),
            ["UnknownWidget"],
        )

    def test_execute_sync_cycle_gates_on_prechecks_and_builds_command(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with (
                mock.patch.object(
                    watch_content, "run_contract_check", return_value=(False, "contract err")
                ),
                mock.patch.object(watch_content.subprocess, "run") as sub_run,
            ):
                ok = watch_content.execute_sync_cycle(
                    repo_root=root,
                    content_root=root / "content",
                    python_exe="python",
                    requires_full=False,
                    changes=[("M", "ideas/cat/post.mdx")],
                    mode="docker",
                )
            self.assertFalse(ok)
            sub_run.assert_not_called()

            with (
                mock.patch.object(
                    watch_content, "run_contract_check", return_value=(True, "ok")
                ),
                mock.patch.object(
                    watch_content, "run_mdx_precheck", return_value=(False, "mdx syntax err")
                ),
                mock.patch.object(watch_content.subprocess, "run") as sub_run,
            ):
                ok = watch_content.execute_sync_cycle(
                    repo_root=root,
                    content_root=root / "content",
                    python_exe="python",
                    requires_full=False,
                    changes=[("M", "ideas/cat/post.mdx")],
                    mode="docker",
                )
            self.assertFalse(ok)
            sub_run.assert_not_called()

            cmd, env, cwd = watch_content.build_sync_command(
                mode="docker",
                repo_root=root,
                content_root=root / "content",
                python_exe="python",
                requires_full=False,
                changes=[("M", "ideas/cat/post.mdx")],
            )
            self.assertIsNone(env)
            self.assertEqual(cwd, root)
            self.assertEqual(
                cmd,
                [
                    "docker",
                    "compose",
                    "-f",
                    "docker-compose.dev.yml",
                    "exec",
                    "-T",
                    "backend",
                    "python",
                    "scripts/sync_git_content.py",
                    "--change",
                    "M:ideas/cat/post.mdx",
                ],
            )


if __name__ == "__main__":
    unittest.main()
