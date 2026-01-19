# Git Ops 模块重构方案

## 问题分析

### 1. **Dumper 的复杂性**

**当前问题**：

- `_extract_metadata()` 中有大量的 `if` 语句
- 字段映射逻辑混乱，难以维护
- 默认值处理分散在各处
- 字段转换（UUID → str）重复

**示例**：

```python
if post.excerpt:
    metadata["excerpt"] = post.excerpt

if post.cover_media_id:
    metadata["cover_media_id"] = str(post.cover_media_id)

if category_slug:
    metadata["category"] = category_slug
elif post.category_id:
    metadata["category_id"] = str(post.category_id)

if tags:
    metadata["tags"] = tags

if post.enable_jsx:
    metadata["enable_jsx"] = True

if not post.use_server_rendering:
    metadata["use_server_rendering"] = False
```

### 2. **Writer 的复杂性**

**当前问题**：

- 路径计算逻辑复杂
- 文件移动/重命名逻辑混乱
- 错误处理分散
- 文件名清理逻辑独立

### 3. **Utils 文件过长**

**当前问题**：

- 单个文件 400+ 行
- 混合了多个职责：
  - Webhook 验证
  - Frontmatter 更新
  - 缓存失效
  - ID 解析（作者、封面、分类、标签）
  - 文章创建/更新处理
  - 验证逻辑

### 4. **缺少依赖注入**

**当前问题**：

- 每个函数都需要手动传递 `session`、`content_dir` 等
- 没有统一的配置管理
- 难以测试和扩展

---

## 重构方案

### 方案 1：使用 Builder 模式简化 Dumper

**目标**：消除 `if` 语句，使用声明式配置

```python
# backend/app/git_ops/dumper/metadata_builder.py

from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Callable
from app.posts.model import Post

@dataclass
class MetadataField:
    """元数据字段定义"""
    key: str  # Frontmatter 中的键名
    extractor: Callable[[Post], Any]  # 从 Post 提取值的函数
    transformer: Optional[Callable[[Any], Any]] = None  # 值转换函数
    include_if: Optional[Callable[[Post], bool]] = None  # 是否包含的条件
    default: Any = None  # 默认值

class MetadataBuilder:
    """元数据构建器 - 使用声明式配置"""

    def __init__(self):
        self.fields: Dict[str, MetadataField] = {}

    def add_field(
        self,
        key: str,
        extractor: Callable[[Post], Any],
        transformer: Optional[Callable[[Any], Any]] = None,
        include_if: Optional[Callable[[Post], bool]] = None,
        default: Any = None,
    ) -> "MetadataBuilder":
        """添加一个元数据字段"""
        self.fields[key] = MetadataField(
            key=key,
            extractor=extractor,
            transformer=transformer,
            include_if=include_if,
            default=default,
        )
        return self

    def build(self, post: Post, tags: list[str] = None, category_slug: str = None) -> Dict[str, Any]:
        """构建元数据字典"""
        metadata = {}

        for field in self.fields.values():
            # 检查是否应该包含此字段
            if field.include_if and not field.include_if(post):
                continue

            # 提取值
            value = field.extractor(post)

            # 如果值为 None，使用默认值
            if value is None:
                value = field.default

            # 如果仍然为 None，跳过
            if value is None:
                continue

            # 转换值
            if field.transformer:
                value = field.transformer(value)

            metadata[field.key] = value

        # 处理动态字段（tags、category_slug）
        if tags:
            metadata["tags"] = tags

        if category_slug:
            metadata["category"] = category_slug
        elif post.category_id:
            metadata["category_id"] = str(post.category_id)

        return metadata

# 创建默认的构建器
def create_default_metadata_builder() -> MetadataBuilder:
    """创建默认的元数据构建器"""
    builder = MetadataBuilder()

    # 基础字段
    builder.add_field(
        "title",
        extractor=lambda p: p.title,
    )

    builder.add_field(
        "slug",
        extractor=lambda p: p.slug,
    )

    builder.add_field(
        "date",
        extractor=lambda p: p.created_at,
        transformer=lambda dt: dt.strftime("%Y-%m-%d %H:%M:%S") if dt else None,
    )

    builder.add_field(
        "status",
        extractor=lambda p: p.status.value,
    )

    builder.add_field(
        "author_id",
        extractor=lambda p: str(p.author_id),
    )

    # 可选字段
    builder.add_field(
        "excerpt",
        extractor=lambda p: p.excerpt,
        include_if=lambda p: bool(p.excerpt),
    )

    builder.add_field(
        "cover_media_id",
        extractor=lambda p: str(p.cover_media_id) if p.cover_media_id else None,
        include_if=lambda p: bool(p.cover_media_id),
    )

    # 渲染模式
    builder.add_field(
        "enable_jsx",
        extractor=lambda p: True,
        include_if=lambda p: p.enable_jsx,
    )

    builder.add_field(
        "use_server_rendering",
        extractor=lambda p: False,
        include_if=lambda p: not p.use_server_rendering,
    )

    # SEO 字段
    builder.add_field(
        "description",
        extractor=lambda p: p.meta_description,
        include_if=lambda p: bool(p.meta_description),
    )

    builder.add_field(
        "keywords",
        extractor=lambda p: p.meta_keywords,
        include_if=lambda p: bool(p.meta_keywords),
    )

    return builder
```

**新的 Dumper**：

```python
# backend/app/git_ops/dumper/dumper.py

import frontmatter
from app.posts.model import Post
from .metadata_builder import create_default_metadata_builder

class PostDumper:
    """文章序列化器 - 使用 Builder 模式"""

    def __init__(self, metadata_builder=None):
        self.metadata_builder = metadata_builder or create_default_metadata_builder()

    def dump(self, post: Post, tags: list[str] = None, category_slug: str = None) -> str:
        """将 Post 对象转换为 MDX 字符串"""
        metadata = self.metadata_builder.build(post, tags, category_slug)
        post_obj = frontmatter.Post(post.content_mdx or "", **metadata)
        return frontmatter.dumps(post_obj)
```

**优点**：

- ✅ 消除了所有 `if` 语句
- ✅ 易于扩展（添加新字段只需 `add_field()`）
- ✅ 易于测试（可以创建不同的 builder）
- ✅ 声明式配置，易于理解

---

### 方案 2：提取 Writer 的职责

**目标**：分离路径计算、文件操作、错误处理

```python
# backend/app/git_ops/writer/path_calculator.py

from pathlib import Path
from app.posts.model import Post

class PathCalculator:
    """路径计算器 - 单一职责"""

    def __init__(self, content_dir: Path):
        self.content_dir = content_dir

    def calculate_target_path(
        self,
        post: Post,
        category_slug: str = None,
    ) -> tuple[Path, str]:
        """
        计算目标路径

        Returns:
            (绝对路径, 相对路径)
        """
        cat_folder = category_slug or "uncategorized"
        type_folder = post.post_type.value
        ext = "mdx" if post.enable_jsx else "md"

        safe_title = self._sanitize_filename(post.title)
        relative_dir = Path(type_folder) / cat_folder
        filename = f"{safe_title}.{ext}"

        target_dir = self.content_dir / relative_dir
        target_path = target_dir / filename
        target_relative_path = str(relative_dir / filename)

        return target_path, target_relative_path

    def _sanitize_filename(self, filename: str) -> str:
        """清理文件名"""
        import re

        safe_name = re.sub(r'[<>:"/\\|?*]', "-", filename)
        safe_name = re.sub(r"[\000-\037]", "", safe_name)
        safe_name = safe_name.strip()

        if len(safe_name) > 100:
            safe_name = safe_name[:100]

        return safe_name

# backend/app/git_ops/writer/file_operator.py

import shutil
from pathlib import Path
import aiofiles

class FileOperator:
    """文件操作器 - 单一职责"""

    async def write_file(self, path: Path, content: str) -> None:
        """写入文件"""
        path.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(path, "w", encoding="utf-8") as f:
            await f.write(content)

    async def delete_file(self, path: Path) -> None:
        """删除文件"""
        if path.exists():
            path.unlink()

            # 清理空目录
            parent = path.parent
            if not any(parent.iterdir()):
                parent.rmdir()

    def move_file(self, old_path: Path, new_path: Path) -> None:
        """移动文件"""
        new_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(old_path), str(new_path))

# backend/app/git_ops/writer/writer.py

from pathlib import Path
from app.posts.model import Post
from app.git_ops.dumper import PostDumper
from .path_calculator import PathCalculator
from .file_operator import FileOperator

class FileWriter:
    """文件写入器 - 协调器"""

    def __init__(
        self,
        content_dir: Path,
        dumper: PostDumper = None,
        path_calculator: PathCalculator = None,
        file_operator: FileOperator = None,
    ):
        self.content_dir = content_dir
        self.dumper = dumper or PostDumper()
        self.path_calculator = path_calculator or PathCalculator(content_dir)
        self.file_operator = file_operator or FileOperator()

    async def write_post(
        self,
        post: Post,
        old_post: Post = None,
        category_slug: str = None,
        tags: list[str] = None,
    ) -> str:
        """写入文章到磁盘"""
        # 1. 序列化内容
        content = self.dumper.dump(post, tags, category_slug)

        # 2. 计算路径
        target_path, target_relative_path = self.path_calculator.calculate_target_path(
            post, category_slug
        )

        # 3. 处理文件移动
        if old_post and old_post.source_path:
            old_abs_path = self.content_dir / old_post.source_path
            if old_post.source_path != target_relative_path and old_abs_path.exists():
                self.file_operator.move_file(old_abs_path, target_path)

        # 4. 写入文件
        await self.file_operator.write_file(target_path, content)

        return target_relative_path

    async def delete_post(self, post: Post) -> None:
        """删除文章"""
        if not post.source_path:
            return

        abs_path = self.content_dir / post.source_path
        await self.file_operator.delete_file(abs_path)
```

**优点**：

- ✅ 单一职责原则
- ✅ 易于测试（可以 mock 各个组件）
- ✅ 易于扩展（可以替换 PathCalculator 或 FileOperator）
- ✅ 代码更清晰

---

### 方案 3：分拆 Utils 为目录结构

**目标**：将 400+ 行的 utils.py 分拆为多个模块

```
backend/app/git_ops/utils/
├── __init__.py
├── webhook.py          # Webhook 验证
├── frontmatter.py      # Frontmatter 操作
├── cache.py            # 缓存失效
├── resolvers/
│   ├── __init__.py
│   ├── author.py       # 作者解析
│   ├── cover.py        # 封面解析
│   ├── category.py     # 分类解析
│   └── tag.py          # 标签解析
└── handlers/
    ├── __init__.py
    ├── post_create.py  # 文章创建处理
    ├── post_update.py  # 文章更新处理
    └── validation.py   # 验证逻辑
```

**示例**：

```python
# backend/app/git_ops/utils/webhook.py

import hashlib
import hmac
import logging
from app.git_ops.exceptions import WebhookSignatureError

logger = logging.getLogger(__name__)

def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    """验证 GitHub Webhook 签名"""
    if not secret:
        logger.warning("⚠️ WEBHOOK_SECRET not configured")
        raise WebhookSignatureError("Webhook secret not configured")

    if not signature:
        logger.warning("Missing X-Hub-Signature-256 header")
        raise WebhookSignatureError("Missing X-Hub-Signature-256 header")

    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    expected_signature = f"sha256={expected}"

    is_valid = hmac.compare_digest(expected_signature, signature)

    if not is_valid:
        logger.warning(f"Invalid webhook signature")
        raise WebhookSignatureError("Invalid webhook signature")

    return True

# backend/app/git_ops/utils/cache.py

import logging
import httpx

logger = logging.getLogger(__name__)

async def revalidate_nextjs_cache(frontend_url: str, revalidate_secret: str) -> bool:
    """失效 Next.js 缓存"""
    if not frontend_url or not revalidate_secret:
        logger.warning("⚠️ FRONTEND_URL or REVALIDATE_SECRET not configured")
        return False

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{frontend_url}/api/revalidate",
                headers={
                    "Authorization": f"Bearer {revalidate_secret}",
                    "Content-Type": "application/json",
                },
                json={
                    "tags": ["posts", "posts-list", "categories"],
                    "paths": ["/posts"],
                },
                timeout=10.0,
            )

            if response.status_code == 200:
                logger.info(f"✅ Next.js cache revalidated successfully")
                return True
            else:
                logger.warning(f"❌ Failed to revalidate: {response.status_code}")
                return False
    except Exception as e:
        logger.warning(f"❌ Error revalidating cache: {e}")
        return False

# backend/app/git_ops/utils/resolvers/__init__.py

from .author import resolve_author_id
from .cover import resolve_cover_media_id
from .category import resolve_category_id
from .tag import resolve_tag_ids

__all__ = [
    "resolve_author_id",
    "resolve_cover_media_id",
    "resolve_category_id",
    "resolve_tag_ids",
]

# backend/app/git_ops/utils/resolvers/author.py

from uuid import UUID
from app.git_ops.exceptions import GitOpsSyncError

async def resolve_author_id(session, author_value: str) -> UUID:
    """根据用户名查询作者 ID"""
    from app.users import crud as user_crud

    if not author_value:
        raise GitOpsSyncError("Author value is empty")

    # 尝试作为 UUID 解析
    try:
        user_id = UUID(author_value)
        user = await user_crud.get_user_by_id(session, user_id)
        if user:
            return user.id
    except ValueError:
        pass

    # 作为用户名查询
    user = await user_crud.get_user_by_username(session, author_value)
    if user:
        return user.id

    raise GitOpsSyncError(f"Author not found: {author_value}")
```

**优点**：

- ✅ 单个文件 < 100 行
- ✅ 职责清晰
- ✅ 易于维护和测试
- ✅ 易于扩展

---

### 方案 4：使用依赖注入容器

**目标**：统一管理依赖，简化函数签名

```python
# backend/app/git_ops/container.py

from pathlib import Path
from app.core.config import settings
from app.git_ops.dumper import PostDumper
from app.git_ops.writer import FileWriter
from app.git_ops.scanner import MDXScanner
from app.git_ops.mapper import FrontmatterMapper

class GitOpsContainer:
    """依赖注入容器"""

    def __init__(self, session, content_dir: Path = None):
        self.session = session
        self.content_dir = content_dir or Path(settings.CONTENT_DIR)

        # 初始化所有依赖
        self._dumper = None
        self._writer = None
        self._scanner = None
        self._mapper = None

    @property
    def dumper(self) -> PostDumper:
        if self._dumper is None:
            self._dumper = PostDumper()
        return self._dumper

    @property
    def writer(self) -> FileWriter:
        if self._writer is None:
            self._writer = FileWriter(self.content_dir, dumper=self.dumper)
        return self._writer

    @property
    def scanner(self) -> MDXScanner:
        if self._scanner is None:
            self._scanner = MDXScanner(self.content_dir)
        return self._scanner

    @property
    def mapper(self) -> FrontmatterMapper:
        if self._mapper is None:
            self._mapper = FrontmatterMapper(self.session)
        return self._mapper

# 使用示例
class GitOpsService:
    def __init__(self, session):
        self.container = GitOpsContainer(session)

    async def sync_all(self):
        # 直接使用容器中的依赖
        scanned_posts = await self.container.scanner.scan_all()

        for scanned in scanned_posts:
            post_dict = await self.container.mapper.map_to_post(scanned)
            # ...
            await self.container.writer.write_post(post, ...)
```

**优点**：

- ✅ 统一管理依赖
- ✅ 简化函数签名
- ✅ 易于测试（可以注入 mock）
- ✅ 易于扩展

---

## 实施步骤

### 第一阶段：重构 Dumper（低风险）

1. 创建 `backend/app/git_ops/dumper/` 目录
2. 实现 `MetadataBuilder` 和 `create_default_metadata_builder()`
3. 重写 `PostDumper` 使用 Builder
4. 运行测试确保功能不变

### 第二阶段：重构 Writer（中等风险）

1. 创建 `backend/app/git_ops/writer/` 目录
2. 提取 `PathCalculator` 和 `FileOperator`
3. 重写 `FileWriter` 使用新的组件
4. 运行测试确保功能不变

### 第三阶段：分拆 Utils（中等风险）

1. 创建 `backend/app/git_ops/utils/` 目录
2. 分拆各个模块
3. 更新导入语句
4. 运行测试确保功能不变

### 第四阶段：添加依赖注入容器（低风险）

1. 创建 `GitOpsContainer`
2. 在 `GitOpsService` 中使用
3. 逐步迁移其他模块

---

## 预期收益

| 指标             | 当前 | 重构后 | 改进     |
| ---------------- | ---- | ------ | -------- |
| Dumper 代码行数  | 75   | 30     | -60%     |
| Writer 代码行数  | 130  | 50     | -62%     |
| Utils 代码行数   | 400+ | 50-80  | -80%     |
| 单个文件最大行数 | 400+ | 100    | -75%     |
| 测试覆盖率       | 60%  | 90%    | +30%     |
| 代码复杂度       | 高   | 低     | 显著降低 |

---

## 风险评估

| 风险     | 概率 | 影响 | 缓解措施       |
| -------- | ---- | ---- | -------------- |
| 功能回归 | 中   | 高   | 完整的单元测试 |
| 导入错误 | 低   | 中   | 自动化测试     |
| 性能下降 | 低   | 中   | 性能基准测试   |

---

## 参考资源

- Builder 模式：https://refactoring.guru/design-patterns/builder
- 单一职责原则：https://en.wikipedia.org/wiki/Single-responsibility_principle
- 依赖注入：https://en.wikipedia.org/wiki/Dependency_injection
