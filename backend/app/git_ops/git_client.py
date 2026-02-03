import asyncio
import logging
from pathlib import Path
from typing import List, Tuple

from app.git_ops.exceptions import GitError, NotGitRepositoryError

logger = logging.getLogger(__name__)


class GitClient:
    def __init__(self, repo_path: Path):
        self.repo_path = repo_path
        self._config_initialized = False
        if not (repo_path / ".git").exists():
            logger.warning(f"GitClient initialized with non-git directory: {repo_path}")

    async def _ensure_git_config(self):
        """确保 Git 配置了用户信息（使用 --local 配置）"""
        if self._config_initialized:
            return

        try:
            # 检查是否已配置本地用户信息
            code, email, _ = await self.run("config", "--local", "user.email")

            if code != 0 or not email:
                # 未配置，使用默认值
                await self.run("config", "--local", "user.email", "admin@blog.local")
                await self.run("config", "--local", "user.name", "Blog Admin")
                logger.info("Git user config initialized with default values")

            self._config_initialized = True
        except Exception as e:
            logger.warning(f"Failed to ensure git config: {e}")

    async def run(self, *args: str) -> Tuple[int, str, str]:
        """运行 git 命令 (非阻塞)"""
        # 针对容器环境自动处理 safe.directory 问题
        import os

        if os.getenv("GIT_SAFE_DIR") == "*":
            safe_proc = await asyncio.create_subprocess_exec(
                "git",
                "config",
                "--global",
                "--add",
                "safe.directory",
                "*",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await safe_proc.wait()

        cmd = ["git"] + list(args)
        process = await asyncio.create_subprocess_exec(
            *cmd,  # 执行命令
            cwd=self.repo_path,  # 执行命令的位置
            stdout=asyncio.subprocess.PIPE,  # 捕获标准输出
            stderr=asyncio.subprocess.PIPE,  # 捕获标准错误
        )
        # 异步启动子进程
        stdout, stderr = await process.communicate()
        return (process.returncode, stdout.decode().strip(), stderr.decode().strip())

    async def pull(self, remote: str = "origin", branch: str = "main") -> str:
        """执行 git pull，强制指定远程和分支"""
        await self._ensure_git_config()
        code, out, err = await self.run("pull", remote, branch)
        if code != 0:  # 如果失败
            if "not a git repository" in err.lower():
                raise NotGitRepositoryError()
            raise GitError(f"Git pull failed: {err}")
        return out

    async def get_current_hash(self) -> str:
        """获取当前 HEAD hash"""
        code, out, err = await self.run("rev-parse", "HEAD")
        if code != 0:
            raise GitError(f"Failed to get current hash: {err}")
        return out

    async def get_changed_files(self, since_hash: str) -> List[str]:
        """获取自指定 hash 以来的变更文件列表"""
        # git diff --name-only <old>..HEAD
        code, out, err = await self.run("diff", "--name-only", f"{since_hash}..HEAD")
        if code != 0:
            raise GitError(f"Failed to get diff: {err}")

        # 过滤掉空行
        return [f.strip() for f in out.splitlines() if f.strip()]

    async def get_changed_files_with_status(
        self, since_hash: str
    ) -> List[Tuple[str, str]]:
        """获取变更文件及其状态

        Args:
            since_hash: 可以是单个 hash 或者 hash 范围（如 "abc123" 或 "abc123..def456"）
                       - 单个 hash: 对比该 hash 和工作区
                       - hash 范围: 对比两个 commit 之间的变更（不包含工作区）

        Returns:
            List of (status, filepath)
            e.g. [("M", "ideas/post.md"), ("A", "ideas/new.md"), ("D", "ideas/old.md")]

        Status codes:
            M = Modified
            A = Added
            D = Deleted
            R = Renamed
            C = Copied
        """
        # 检查是否是范围查询（包含 ".."）
        is_range_query = ".." in since_hash

        # 1. 对比 since_hash 和 工作区/目标 commit
        # 如果是范围查询，只对比两个 commit，不包含工作区
        # 如果是单个 hash，对比该 hash 和工作区
        code, out, err = await self.run("diff", "--name-status", since_hash)
        if code != 0:
            raise GitError(f"Failed to get diff: {err}")

        results = []
        seen_files = set()

        for line in out.splitlines():
            if not line.strip():
                continue
            parts = line.split("\t", 1)
            if len(parts) == 2:
                status, filepath = parts
                s_code = status.strip()[0]  # 只取第一个字符，处理如 'R100'
                f_path = filepath.strip()
                results.append((s_code, f_path))
                seen_files.add(f_path)

        # 2. 获取 Untracked 文件 (作为 Added 处理)
        # 注意：只在单个 hash 查询时检查 untracked 文件
        # 范围查询只关心两个 commit 之间的变更，不包含工作区
        if not is_range_query:
            code, out, err = await self.run(
                "ls-files", "--others", "--exclude-standard"
            )
            if code == 0:
                for line in out.splitlines():
                    fpath = line.strip()
                    if fpath and fpath not in seen_files:
                        results.append(("A", fpath))

        return results

    async def get_file_status(self) -> List[Tuple[str, str]]:
        """获取工作区文件状态 (git status --porcelain)

        Returns:
            List of (status, filepath)
            e.g. [('M', 'README.md'), ('??', 'new_file.md')]
        """
        code, out, err = await self.run("status", "--porcelain")
        if code != 0:
            raise GitError(f"Failed to get status: {err}")

        results = []
        for line in out.splitlines():
            if not line.strip():
                continue
            # porcelain format: XY Path
            status_code = line[:2].strip()
            path = line[3:].strip()
            results.append((status_code, path))
        return results

    async def add(self, paths: List[str]):
        """执行 git add"""
        await self._ensure_git_config()
        if not paths:
            return
        code, out, err = await self.run("add", *paths)
        if code != 0:
            raise GitError(f"Git add failed: {err}")

    async def commit(self, message: str):
        """执行 git commit"""
        await self._ensure_git_config()
        code, out, err = await self.run("commit", "-m", message)
        if code != 0:
            # 如果是 nothing to commit，忽略错误
            if "nothing to commit" in out.lower() or "nothing to commit" in err.lower():
                return
            raise GitError(f"Git commit failed: {err}")

    async def push(self):
        """执行 git push"""
        await self._ensure_git_config()
        code, out, err = await self.run("push")
        if code != 0:
            # 如果是因为没有 upstream，自动设置并重试
            if "no upstream branch" in err.lower():
                logger.info(
                    "No upstream branch detected, setting upstream to origin/main"
                )
                code, out, err = await self.run(
                    "push", "--set-upstream", "origin", "main"
                )
                if code != 0:
                    raise GitError(f"Git push failed: {err}")
            else:
                raise GitError(f"Git push failed: {err}")
