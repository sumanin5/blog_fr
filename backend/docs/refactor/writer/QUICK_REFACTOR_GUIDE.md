# 快速重构指南

## 一句话总结

**问题**：Dumper 有太多 `if`，Writer 职责混乱，Utils 文件过长，缺少依赖注入
**方案**：使用 Builder 模式、分离职责、分拆 Utils、添加容器

---

## 方案对比

### Dumper：Builder 模式

```python
# ❌ 当前（命令式，25+ 个 if）
def _extract_metadata(post, tags, category_slug):
    metadata = {}
    if post.excerpt:
        metadata["excerpt"] = post.excerpt
    if post.cover_media_id:
        metadata["cover_media_id"] = str(post.cover_media_id)
    # ... 更多 if
    return {k: v for k, v in metadata.items() if v is not None}

# ✅ 改进（声明式，0 个 if）
builder = MetadataBuilder()
builder.add_field("excerpt", lambda p: p.excerpt, include_if=lambda p: bool(p.excerpt))
builder.add_field("cover_media_id", lambda p: str(p.cover_media_id), include_if=lambda p: bool(p.cover_media_id))
metadata = builder.build(post, tags, category_slug)
```

**收益**：

- 代码行数：75 → 30（-60%）
- 易于添加新字段
- 易于测试

---

### Writer：分离职责

```python
# ❌ 当前（混合职责）
class FileWriter:
    async def write_post(self, post, old_post, category_slug, tags):
        # 1. 序列化内容
        content = PostDumper.dump(post, tags, category_slug)

        # 2. 计算路径
        cat_folder = category_slug or "uncategorized"
        type_folder = post.post_type.value
        ext = "mdx" if post.enable_jsx else "md"
        safe_title = self._sanitize_filename(post.title)
        # ... 更多路径计算

        # 3. 处理文件移动
        if old_post and old_post.source_path:
            # ... 移动逻辑

        # 4. 写入文件
        async with aiofiles.open(target_path, "w") as f:
            await f.write(content)

# ✅ 改进（分离职责）
class PathCalculator:
    def calculate_target_path(self, post, category_slug):
        # 只负责路径计算
        return target_path, target_relative_path

class FileOperator:
    async def write_file(self, path, content):
        # 只负责文件操作
        await aiofiles.open(path, "w").write(content)

class FileWriter:
    async def write_post(self, post, old_post, category_slug, tags):
        content = self.dumper.dump(post, tags, category_slug)
        target_path, _ = self.path_calculator.calculate_target_path(post, category_slug)
        await self.file_operator.write_file(target_path, content)
```

**收益**：

- 代码行数：130 → 50（-62%）
- 易于测试
- 易于扩展

---

### Utils：分拆为目录

```
# ❌ 当前（400+ 行单文件）
utils.py (400+ 行)
├── verify_github_signature
├── update_frontmatter_metadata
├── revalidate_nextjs_cache
├── write_post_ids_to_frontmatter
├── resolve_author_id
├── resolve_cover_media_id
├── resolve_category_id
├── resolve_tag_ids
├── handle_post_update
├── handle_post_create
└── validate_post_for_resync

# ✅ 改进（多个小文件）
utils/
├── webhook.py (30 行)
├── frontmatter.py (50 行)
├── cache.py (40 行)
├── resolvers/
│   ├── author.py (30 行)
│   ├── cover.py (80 行)
│   ├── category.py (60 行)
│   └── tag.py (30 行)
└── handlers/
    ├── post_create.py (40 行)
    ├── post_update.py (40 行)
    └── validation.py (30 行)
```

**收益**：

- 最大文件行数：400+ → 80（-80%）
- 易于定位功能
- 易于维护

---

### 依赖注入：容器模式

```python
# ❌ 当前（参数过多）
async def handle_post_update(
    session,
    matched_post,
    scanned,
    file_path,
    is_move,
    mapper,
    operating_user,
    content_dir,
    stats,
    processed_post_ids,
    force_write=False,
):
    # 10 个参数！

# ✅ 改进（使用容器）
class GitOpsContainer:
    def __init__(self, session, content_dir):
        self.session = session
        self.content_dir = content_dir
        self.mapper = FrontmatterMapper(session)
        self.writer = FileWriter(content_dir)
        self.scanner = MDXScanner(content_dir)

async def handle_post_update(
    container,
    matched_post,
    scanned,
    file_path,
    is_move,
    stats,
    processed_post_ids,
):
    # 只需 7 个参数，且更清晰
    mapper = container.mapper
    writer = container.writer
```

**收益**：

- 参数数量：10 → 7（-30%）
- 易于测试
- 易于扩展

---

## 实施路线图

### Week 1：分拆 Utils（高优先级）

```bash
# 1. 创建目录结构
mkdir -p backend/app/git_ops/utils/resolvers
mkdir -p backend/app/git_ops/utils/handlers

# 2. 分拆文件
# utils.py → utils/webhook.py, utils/cache.py, utils/frontmatter.py
# utils.py → utils/resolvers/{author,cover,category,tag}.py
# utils.py → utils/handlers/{post_create,post_update,validation}.py

# 3. 更新导入
# from app.git_ops.utils import resolve_author_id
# → from app.git_ops.utils.resolvers import resolve_author_id

# 4. 运行测试
pytest backend/tests/api/git_ops/
```

### Week 2：重构 Dumper（中优先级）

```bash
# 1. 创建 Builder
# backend/app/git_ops/dumper/metadata_builder.py

# 2. 重写 Dumper
# backend/app/git_ops/dumper/dumper.py

# 3. 运行测试
pytest backend/tests/unit/test_dumper.py
```

### Week 3：重构 Writer（中优先级）

```bash
# 1. 提取 PathCalculator
# backend/app/git_ops/writer/path_calculator.py

# 2. 提取 FileOperator
# backend/app/git_ops/writer/file_operator.py

# 3. 重写 Writer
# backend/app/git_ops/writer/writer.py

# 4. 运行测试
pytest backend/tests/unit/test_writer.py
```

### Week 4：添加容器（低优先级）

```bash
# 1. 创建容器
# backend/app/git_ops/container.py

# 2. 更新 Service
# backend/app/git_ops/service.py

# 3. 运行测试
pytest backend/tests/api/git_ops/
```

---

## 代码示例

### Builder 模式示例

```python
# 定义字段
builder = MetadataBuilder()
builder.add_field(
    key="excerpt",
    extractor=lambda p: p.excerpt,
    include_if=lambda p: bool(p.excerpt),
)

# 构建元数据
metadata = builder.build(post, tags, category_slug)

# 结果
# {
#     "title": "...",
#     "slug": "...",
#     "excerpt": "...",  # 只有当 excerpt 不为空时才包含
#     "tags": [...]
# }
```

### 职责分离示例

```python
# 路径计算
path_calc = PathCalculator(Path("/content"))
target_path, rel_path = path_calc.calculate_target_path(post, "tutorials")

# 文件操作
file_op = FileOperator()
await file_op.write_file(target_path, content)

# 协调
writer = FileWriter(content_dir, dumper, path_calc, file_op)
await writer.write_post(post, old_post, "tutorials", ["python"])
```

### 容器示例

```python
# 初始化容器
container = GitOpsContainer(session, Path("/content"))

# 使用依赖
scanned = await container.scanner.scan_all()
metadata = container.mapper.map_to_post(scanned[0])
await container.writer.write_post(post)
```

---

## 测试改进

### 当前测试

```python
async def test_write_post():
    # 需要 mock 很多东西
    mock_dumper = Mock()
    mock_path_calc = Mock()
    mock_file_op = Mock()

    writer = FileWriter(
        content_dir=Path("/tmp"),
        dumper=mock_dumper,
        path_calculator=mock_path_calc,
        file_operator=mock_file_op,
    )

    result = await writer.write_post(post)
    assert result == "article/uncategorized/title.md"
```

### 改进后的测试

```python
# 测试 PathCalculator
def test_path_calculator():
    calc = PathCalculator(Path("/tmp"))
    path, rel_path = calc.calculate_target_path(post, "tutorials")
    assert path == Path("/tmp/article/tutorials/title.md")
    assert rel_path == "article/tutorials/title.md"

# 测试 MetadataBuilder
def test_metadata_builder():
    builder = create_default_metadata_builder()
    metadata = builder.build(post)
    assert metadata["title"] == post.title
    assert "excerpt" not in metadata  # 因为 excerpt 为空

# 测试 FileWriter
async def test_file_writer():
    container = GitOpsContainer(session, Path("/tmp"))
    result = await container.writer.write_post(post)
    assert result == "article/uncategorized/title.md"
```

---

## 检查清单

### 分拆 Utils

- [ ] 创建 `utils/` 目录结构
- [ ] 创建 `webhook.py`
- [ ] 创建 `cache.py`
- [ ] 创建 `frontmatter.py`
- [ ] 创建 `resolvers/` 目录
- [ ] 创建 `resolvers/author.py`
- [ ] 创建 `resolvers/cover.py`
- [ ] 创建 `resolvers/category.py`
- [ ] 创建 `resolvers/tag.py`
- [ ] 创建 `handlers/` 目录
- [ ] 创建 `handlers/post_create.py`
- [ ] 创建 `handlers/post_update.py`
- [ ] 创建 `handlers/validation.py`
- [ ] 更新所有导入
- [ ] 运行测试
- [ ] 删除旧的 `utils.py`

### 重构 Dumper

- [ ] 创建 `dumper/` 目录
- [ ] 创建 `dumper/metadata_builder.py`
- [ ] 重写 `dumper/dumper.py`
- [ ] 添加单元测试
- [ ] 运行测试
- [ ] 删除旧的 `dumper.py`

### 重构 Writer

- [ ] 创建 `writer/` 目录
- [ ] 创建 `writer/path_calculator.py`
- [ ] 创建 `writer/file_operator.py`
- [ ] 重写 `writer/writer.py`
- [ ] 添加单元测试
- [ ] 运行测试
- [ ] 删除旧的 `writer.py`

### 添加容器

- [ ] 创建 `container.py`
- [ ] 更新 `service.py`
- [ ] 添加单元测试
- [ ] 运行测试

---

## 预期结果

| 指标         | 当前 | 目标 | 改进 |
| ------------ | ---- | ---- | ---- |
| 平均文件行数 | 150  | 80   | -47% |
| 最大文件行数 | 400+ | 100  | -75% |
| if 语句数量  | 25+  | 5    | -80% |
| 函数参数数   | 8    | 4    | -50% |
| 测试覆盖率   | 60%  | 90%  | +30% |

---

## 常见问题

**Q: 这会影响性能吗？**
A: 不会。Builder 模式和职责分离都是编译时优化，运行时无额外开销。

**Q: 需要修改数据库吗？**
A: 不需要。这只是代码重构，不涉及数据库变更。

**Q: 需要修改 API 吗？**
A: 不需要。这只是内部重构，API 保持不变。

**Q: 如何回滚？**
A: 使用 `git revert <commit-hash>` 回滚到之前的版本。

**Q: 需要多长时间？**
A: 预计 2-3 周（每周一个主要改进）。

---

## 参考资源

- [Builder 模式](https://refactoring.guru/design-patterns/builder)
- [单一职责原则](https://en.wikipedia.org/wiki/Single-responsibility_principle)
- [依赖注入](https://en.wikipedia.org/wiki/Dependency_injection)
- [SOLID 原则](https://en.wikipedia.org/wiki/SOLID)
