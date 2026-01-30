# Git Auto-Commit 功能修复总结

## 问题描述

在实现自动提交到 GitHub 的功能时，遇到了以下问题：

1. **Event Loop 冲突**：`GitClient._ensure_git_config()` 在 `__init__` 中同步调用，但内部使用 `asyncio.get_event_loop().run_until_complete()`，导致事件循环冲突
2. **配置作用域错误**：使用全局 Git 配置而非仓库本地配置
3. **单元测试失败**：测试期望本地配置但实际继承了全局配置

## 解决方案

### 1. 异步延迟初始化

将 `_ensure_git_config()` 改为异步方法，并在需要时才调用：

```python
class GitClient:
    def __init__(self, repo_path: Path):
        self.repo_path = repo_path
        self._config_initialized = False  # 添加标志位
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
```

### 2. 在 Git 操作前调用配置初始化

在所有需要用户信息的 Git 操作前调用 `_ensure_git_config()`：

```python
async def add(self, paths: List[str]):
    await self._ensure_git_config()
    # ... rest of the code

async def commit(self, message: str):
    await self._ensure_git_config()
    # ... rest of the code

async def push(self):
    await self._ensure_git_config()
    # ... rest of the code

async def pull(self) -> str:
    await self._ensure_git_config()
    # ... rest of the code
```

### 3. 使用 --local 配置

使用 `--local` 标志确保配置只作用于当前仓库：

```bash
git config --local user.email "admin@blog.local"
git config --local user.name "Blog Admin"
```

### 4. 更新单元测试

修改测试以验证本地配置：

```python
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
```

## 测试结果

所有单元测试通过：

```bash
tests/unit/git_ops/test_git_client.py::test_git_client_auto_config PASSED
tests/unit/git_ops/test_git_client.py::test_commit_with_no_changes PASSED
tests/unit/git_ops/test_git_client.py::test_git_add_and_commit PASSED
```

## 完整工作流程

1. **创建/更新文章** → 触发 `run_background_commit()`
2. **导出文章** → `service.export_to_git()` 将数据库内容写入 MDX 文件
3. **Git 操作**：
   - `git add .` - 添加所有更改（首次调用时自动配置用户信息）
   - `git commit -m "..."` - 提交更改
   - `git pull` - 拉取远程更新（避免冲突）
   - `git push` - 推送到 GitHub

## 相关文件

- `backend/app/git_ops/git_client.py` - Git 客户端（已修复）
- `backend/app/git_ops/services/commit_service.py` - 提交服务
- `backend/app/git_ops/background_tasks.py` - 后台任务
- `backend/app/posts/routers/posts/editor.py` - 编辑器路由（触发自动提交）
- `backend/tests/unit/git_ops/test_git_client.py` - 单元测试
- `content/.gitignore` - 忽略同步状态文件

## 部署说明

修复已在本地测试通过，可以部署到生产环境：

1. 提交代码到主仓库
2. GitHub Actions 自动部署
3. 服务器上的 Git 配置会自动初始化（如果未配置）
4. 测试创建/更新文章，验证自动推送到 blog-content 仓库

## 注意事项

- SSH 密钥必须已配置在服务器上
- content 目录必须是 Git 仓库
- 如果遇到推送冲突，会先尝试 pull 再 push
- 所有 Git 操作都在后台任务中执行，不会阻塞 API 响应
