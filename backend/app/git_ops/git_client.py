import asyncio
import logging
from pathlib import Path
from typing import List, Tuple

from app.git_ops.exceptions import GitError, GitOpsReadOnlyError, NotGitRepositoryError

logger = logging.getLogger(__name__)

# 重命名保留旧、新路径，其余状态只有目标路径。
FileChange = Tuple[str, str] | Tuple[str, str, str]


class GitClient:
    def __init__(self, repo_path: Path):
        self.repo_path = repo_path
        self._config_initialized = False
        if not (repo_path / ".git").exists():
            logger.warning(f"GitClient initialized with non-git directory: {repo_path}")

    async def run(self, *args: str) -> Tuple[int, str, str]:
        """运行只读 git 命令 (非阻塞)"""
        import os

        allowed_commands = {"pull", "rev-parse", "diff", "ls-files", "status"}
        if not args or args[0] not in allowed_commands:
            raise GitOpsReadOnlyError()

        cmd = ["git", "-c", "core.quotepath=false"]
        if os.getenv("GIT_SAFE_DIR") == "*":
            cmd += ["-c", f"safe.directory={self.repo_path.resolve()}"]
        cmd += list(args)
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
        code, out, err = await self.run("pull", "--ff-only", remote, branch)
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

    async def list_tracked_markdown_files(self) -> List[str]:
        """列出 HEAD 跟踪的 Markdown/MDX 文件，用于校验全量扫描完整性。"""
        code, out, err = await self.run(
            "ls-files", "-z", "--", "*.md", "*.mdx"
        )
        if code != 0:
            raise GitError(f"Failed to list tracked files: {err}")

        return [
            path.replace("\\", "/")
            for path in out.split("\0")
            if path
        ]

    async def get_changed_files(self, since_hash: str) -> List[str]:
        """获取自指定 hash 以来的变更文件列表"""
        # git diff --name-only <old>..HEAD
        code, out, err = await self.run("diff", "--name-only", f"{since_hash}..HEAD")
        if code != 0:
            raise GitError(f"Failed to get diff: {err}")

        # 过滤掉空行
        return [f.strip() for f in out.splitlines() if f.strip()]

    async def get_changed_files_with_status(self, since_hash: str) -> List[FileChange]:
        """获取变更文件及其状态

        Args:
            since_hash: 可以是单个 hash 或者 hash 范围（如 "abc123" 或 "abc123..def456"）
                       - 单个 hash: 对比该 hash 和工作区
                       - hash 范围: 对比两个 commit 之间的变更（不包含工作区）

        Returns:
            List of (status, filepath)，重命名为 ("R", old_path, new_path)
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
        code, out, err = await self.run("diff", "--no-renames", "--name-status", since_hash)
        if code != 0:
            raise GitError(f"Failed to get diff: {err}")

        results = []
        seen_files = set()

        for line in out.splitlines():
            if not line.strip():
                continue
            parts = line.split("\t")
            s_code = parts[0][0]  # 处理 R100/C100 等相似度标记
            if s_code in ("R", "C") and len(parts) == 3:
                old_path, new_path = parts[1:]
                if s_code == "R":
                    results.append(("R", old_path, new_path))
                else:
                    results.append(("A", new_path))
                seen_files.add(new_path)
            elif len(parts) == 2:
                results.append((s_code, parts[1]))
                seen_files.add(parts[1])

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
        raise GitOpsReadOnlyError()

    async def commit(self, message: str):
        raise GitOpsReadOnlyError()

    async def push(self):
        raise GitOpsReadOnlyError()
