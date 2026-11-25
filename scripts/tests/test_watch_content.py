"""宿主机 OS 事件推送与本地内容同步脚本（scripts/watch_content.py）单元测试。"""

from __future__ import annotations

import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest import mock
import urllib.error

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
                '# comment\nCONTENT_HOST_DIR="./from-env-file"\nOTHER=secret\n',
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

    def test_resolve_fs_event_handles_files_dirs_deletes_and_ignores(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cat_dir = root / "ideas" / "比特漫笔"
            (cat_dir / "assets").mkdir(parents=True)
            (cat_dir / "index.md").write_text("---\ntitle: Cat\nslug: cat\n---\n", encoding="utf-8")
            (cat_dir / "post.mdx").write_text("---\ntitle: Post\nslug: post\n---\n", encoding="utf-8")

            # 目录的 change 心跳事件应被忽略，但目录 rename/新建应展开内部文件
            self.assertEqual(
                watch_content.resolve_fs_event(root, r"ideas\比特漫笔", "change"),
                [],
            )
            self.assertEqual(
                watch_content.resolve_fs_event(root, r"ideas\比特漫笔", "rename"),
                [
                    ("A", "ideas/比特漫笔/index.md"),
                    ("M", "ideas/比特漫笔/post.mdx"),
                ],
            )

            # 文件写入/删除映射到相对 POSIX 路径
            self.assertEqual(
                watch_content.resolve_fs_event(root, r"ideas\比特漫笔\post.mdx", "change"),
                [("M", "ideas/比特漫笔/post.mdx")],
            )
            self.assertEqual(
                watch_content.resolve_fs_event(root, r"ideas\比特漫笔\deleted.mdx", "rename"),
                [("D", "ideas/比特漫笔/deleted.mdx")],
            )

            # 隐藏与越界路径忽略
            self.assertEqual(
                watch_content.resolve_fs_event(root, r".git\index.lock", "rename"),
                [],
            )
            self.assertEqual(
                watch_content.resolve_fs_event(root, r"..\outside.mdx", "change"),
                [],
            )

    def test_debounced_event_batcher_coalesces_events_without_polling(self) -> None:
        flushed: list[list[tuple[str, str]]] = []
        done = threading.Event()

        def _on_flush(batch: list[tuple[str, str]]) -> None:
            flushed.append(batch)
            done.set()

        batcher = watch_content.DebouncedEventBatcher(0.1, _on_flush)
        try:
            batcher.add_events([("M", "ideas/cat/a.mdx")])
            batcher.add_events([("D", "ideas/cat/a.mdx"), ("M", "ideas/cat/b.mdx")])
            self.assertTrue(done.wait(timeout=2.0))
        finally:
            batcher.close()

        self.assertEqual(len(flushed), 1)
        self.assertEqual(
            flushed[0],
            [("D", "ideas/cat/a.mdx"), ("M", "ideas/cat/b.mdx")],
        )

    def test_plan_sync_changes_maps_articles_assets_index_and_deleted_dirs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            cat_dir = root / "ideas" / "比特漫笔"
            (cat_dir / "assets").mkdir(parents=True)
            (cat_dir / "index.md").write_text("---\ntitle: Cat\n---\n", encoding="utf-8")
            (cat_dir / "post.mdx").write_text("---\ntitle: Post\n---\n", encoding="utf-8")
            (cat_dir / "README.md").write_text("notes", encoding="utf-8")
            (cat_dir / "assets" / "fig.png").write_bytes(b"png")

            requires_full, changes = watch_content.plan_sync_changes(
                [("M", "AGENTS.md"), ("M", "docs/notes.md")],
                root,
            )
            self.assertFalse(requires_full)
            self.assertEqual(changes, [])

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

            requires_full, changes = watch_content.plan_sync_changes(
                [("A", "ideas/比特漫笔/index.md")],
                root,
            )
            self.assertTrue(requires_full)
            self.assertEqual(changes, [])

            requires_full, _ = watch_content.plan_sync_changes(
                [("D", "ideas/已删除专栏")],
                root,
            )
            self.assertTrue(requires_full)

    def test_push_changes_to_backend_and_dispatch(self) -> None:
        fake_resp = mock.MagicMock()
        fake_resp.status = 200
        fake_resp.read.return_value = json.dumps(
            {
                "status": "synced",
                "stats": {"added": [], "updated": ["ideas/cat/post.mdx"], "deleted": [], "duration": 0.12},
            }
        ).encode("utf-8")
        fake_resp.__enter__.return_value = fake_resp
        fake_resp.__exit__.return_value = None

        with mock.patch.object(urllib.request, "urlopen", return_value=fake_resp) as open_mock:
            ok = watch_content.dispatch_push_or_cli(
                repo_root=Path("."),
                content_root=Path("."),
                python_exe="python",
                backend_url="http://localhost:8000",
                secret="secret",
                changes=[("M", "ideas/cat/post.mdx")],
                requires_full=False,
                mode="http",
            )
        self.assertTrue(ok)
        req = open_mock.call_args.args[0]
        self.assertEqual(req.full_url, "http://localhost:8000/api/v1/ops/git/local-changes")
        self.assertEqual(req.get_header("Authorization"), "Bearer secret")

        err_422 = urllib.error.HTTPError(
            url="http://localhost:8000/api/v1/ops/git/local-changes",
            code=422,
            msg="Unprocessable Entity",
            hdrs={},  # type: ignore[arg-type]
            fp=io.BytesIO(
                json.dumps(
                    {
                        "status": "blocked",
                        "stage": "mdx",
                        "errors": ["ideas/cat/post.mdx: 未注册组件 Foo"],
                    }
                ).encode("utf-8")
            ),
        )
        with mock.patch.object(urllib.request, "urlopen", side_effect=err_422):
            ok_422 = watch_content.dispatch_push_or_cli(
                repo_root=Path("."),
                content_root=Path("."),
                python_exe="python",
                backend_url="http://localhost:8000",
                secret="secret",
                changes=[("M", "ideas/cat/post.mdx")],
                requires_full=False,
                mode="http",
            )
        self.assertFalse(ok_422)


if __name__ == "__main__":
    unittest.main()
