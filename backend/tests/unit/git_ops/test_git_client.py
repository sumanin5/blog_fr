"""
单元测试：GitClient 自动配置功能
"""

import subprocess
import tempfile
from pathlib import Path

import pytest
from app.git_ops.git_client import GitClient


@pytest.mark.unit
@pytest.mark.asyncio
async def test_git_client_auto_config():
    """测试 GitClient 自动配置用户信息"""
    with tempfile.TemporaryDirectory() as tmpdir:
        repo_path = Path(tmpdir)

        # 初始化 Git 仓库
        subprocess.run(["git", "init"], cwd=repo_path, check=True, capture_output=True)

        # 创建 GitClient
        client = GitClient(repo_path)

        # 触发配置初始化（通过调用需要配置的操作）
        (repo_path / "test.txt").write_text("test")
        await client.add(["test.txt"])

        # 验证本地用户信息已配置
        code, email, _ = await client.run("config", "--local", "user.email")
        assert code == 0
        assert email == "admin@blog.local"

        code, name, _ = await client.run("config", "--local", "user.name")
        assert code == 0
        assert name == "Blog Admin"


@pytest.mark.unit
@pytest.mark.asyncio
async def test_commit_with_no_changes():
    """测试没有更改时的提交行为（应该优雅处理）"""
    with tempfile.TemporaryDirectory() as tmpdir:
        repo_path = Path(tmpdir)

        # 初始化 Git 仓库
        subprocess.run(["git", "init"], cwd=repo_path, check=True, capture_output=True)
        subprocess.run(
            ["git", "config", "user.email", "test@test.com"],
            cwd=repo_path,
            check=True,
            capture_output=True,
        )
        subprocess.run(
            ["git", "config", "user.name", "Test"],
            cwd=repo_path,
            check=True,
            capture_output=True,
        )

        # 创建初始提交
        (repo_path / "README.md").write_text("# Test")
        subprocess.run(
            ["git", "add", "."], cwd=repo_path, check=True, capture_output=True
        )
        subprocess.run(
            ["git", "commit", "-m", "Initial commit"],
            cwd=repo_path,
            check=True,
            capture_output=True,
        )

        # 尝试提交（没有更改）
        client = GitClient(repo_path)
        await client.add(["."])
        await client.commit("No changes")  # 应该不会报错

        # 验证：应该没有新的提交
        result = subprocess.run(
            ["git", "log", "--oneline"],
            cwd=repo_path,
            capture_output=True,
            text=True,
        )
        assert result.stdout.count("\n") == 1  # 只有一个提交


@pytest.mark.unit
@pytest.mark.asyncio
async def test_git_add_and_commit():
    """测试正常的 add 和 commit 流程"""
    with tempfile.TemporaryDirectory() as tmpdir:
        repo_path = Path(tmpdir)

        # 初始化 Git 仓库
        subprocess.run(["git", "init"], cwd=repo_path, check=True, capture_output=True)

        # 创建 GitClient
        client = GitClient(repo_path)

        # 创建文件
        (repo_path / "test.txt").write_text("Hello World")

        # 添加并提交
        await client.add(["test.txt"])
        await client.commit("Add test file")

        # 验证提交成功
        result = subprocess.run(
            ["git", "log", "--oneline"],
            cwd=repo_path,
            capture_output=True,
            text=True,
        )
        assert "Add test file" in result.stdout
