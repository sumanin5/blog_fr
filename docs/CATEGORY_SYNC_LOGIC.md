# 分类同步逻辑文档

## 设计原则：Git 作为真理源（Source of Truth）

本系统采用 **Git-First** 的设计理念，即 Git 仓库中的文件结构是数据的唯一真理源，数据库作为索引和查询的辅助存储。

## 同步方向

```
Git Repository (真理源) → Database (索引)
                ↓
          Frontend (展示)
```

## 分类（Category）同步逻辑

### 1. 核心原则

- ✅ **Git 优先**：Git 中的目录结构决定了哪些分类应该存在
- ✅ **单向同步**：数据库跟随 Git 的变更，而不是反过来
- ✅ **自动清理**：Git 中删除的分类会自动从数据库中删除
- ✅ **智能补全**：只为已存在的分类目录创建缺失的 `index.md`

### 2. 具体行为

#### 场景 1：Git 中删除了分类目录

**操作**：
```bash
rm -rf content/articles/old-category
git add -A
git commit -m "remove old category"
git push
```

**系统行为**：
1. Webhook 触发同步
2. 检测到目录已删除
3. **自动从数据库中删除该分类**
4. 不会重新创建目录

**日志输出**：
```
INFO: Category directory 'old-category' not found in Git, marking for deletion from database
INFO: Deleting category 'Old Category' (slug: old-category) as its directory was removed from Git
```

#### 场景 2：Git 中新增了分类目录（但数据库中不存在）

**操作**：
```bash
mkdir -p content/articles/new-category
echo "# New Category" > content/articles/new-category/first-post.md
git add -A
git commit -m "add new category"
git push
```

**系统行为**：
1. Webhook 触发同步
2. 检测到新文章
3. 解析文章的分类信息
4. **在数据库中创建分类**（如果启用了 `GIT_AUTO_CREATE_CATEGORIES`）
5. 不会自动创建 `index.md`（需要等待下一次同步或手动创建）

#### 场景 3：分类目录存在，但缺少 index.md

**操作**：
```bash
mkdir -p content/articles/existing-category
echo "test" > content/articles/existing-category/.gitkeep
git push
```

**前提条件**：
- 数据库中已存在该分类

**系统行为**：
1. Webhook 触发同步
2. 检测到分类目录存在
3. 检查数据库中是否有对应分类
4. **自动创建 index.md**（包含分类的元数据）

**日志输出**：
```
INFO: Creating missing index.md for existing category directory: existing-category
```

**生成的 index.md 示例**：
```markdown
---
title: "Existing Category"
hidden: false
order: 0
---

Category description here.
```

#### 场景 4：index.md 存在，但元数据过时

**系统行为**：
1. 读取现有的 `index.md`
2. 对比数据库中的分类元数据
3. **如果不一致，自动更新 index.md**

**日志输出**：
```
DEBUG: Updating index.md for category 'tech' due to metadata changes
```

#### 场景 5：数据库中有分类，但 Git 中没有目录

**触发方式**：
- 直接在数据库中插入分类
- 或者删除了 Git 中的目录但没有删除数据库记录

**系统行为**：
1. Webhook 触发同步
2. 检测到数据库中的分类在 Git 中不存在
3. **自动从数据库中删除该分类**
4. **不会创建目录**（尊重 Git 作为真理源）

**日志输出**：
```
INFO: Category directory 'orphan-category' not found in Git, marking for deletion from database
INFO: Deleting category 'Orphan Category' (slug: orphan-category) as its directory was removed from Git
```

### 3. 代码实现位置

**文件**：`backend/app/git_ops/components/handlers/file_processor.py`

**函数**：`sync_categories_to_disk()`

**调用时机**：
- 每次 Git 同步后（全量或增量）
- 在 `reconcile_incremental_sync()` 或 `reconcile_full_sync()` 之后

### 4. 配置选项

#### `GIT_AUTO_CREATE_CATEGORIES`

**默认值**：`true`

**作用**：
- `true`：当检测到新文章时，自动创建其所属的分类
- `false`：不自动创建分类，需要手动在数据库或管理后台创建

**位置**：`.env` 文件

```env
GIT_AUTO_CREATE_CATEGORIES=true
```

## 迁移指南

### 从旧逻辑迁移到新逻辑

如果你之前使用的是 "数据库驱动" 的逻辑（会自动创建目录），需要：

1. **清理孤儿分类**

   在升级前，删除数据库中存在但 Git 中不存在的分类：

   ```bash
   # 备份数据库
   docker-compose exec db pg_dump -U postgres blog_fr > backup.sql
   
   # 手动检查并删除孤儿分类
   docker-compose exec backend python manage.py cleanup_orphan_categories
   ```

2. **触发一次全量同步**

   ```bash
   # 通过 API 触发全量同步
   curl -X POST https://your-domain.com/api/v1/ops/git/sync?force_full=true \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **验证结果**

   - 检查 Git 中删除的分类是否也从数据库中删除
   - 确认没有自动创建不需要的目录

## 最佳实践

### 1. 创建新分类的推荐流程

```bash
# 步骤 1: 在 Git 中创建目录和第一篇文章
mkdir -p content/articles/new-tech
cat > content/articles/new-tech/first-post.md << 'EOF'
---
title: "First Post"
slug: "first-post"
category: "new-tech"
---

Content here.
EOF

# 步骤 2: 提交到 Git
git add .
git commit -m "feat: add new-tech category"
git push

# 步骤 3: Webhook 自动触发
# - 创建分类（如果启用了 GIT_AUTO_CREATE_CATEGORIES）
# - 导入文章
# - 创建 index.md

# 步骤 4: （可选）在管理后台完善分类信息
# - 设置图标
# - 设置封面
# - 设置描述
```

### 2. 删除分类的推荐流程

```bash
# 步骤 1: 删除目录
rm -rf content/articles/old-category

# 步骤 2: 提交到 Git
git add -A
git commit -m "remove old-category"
git push

# 步骤 3: Webhook 自动触发
# - 删除该分类下的所有文章（从数据库）
# - 删除分类（从数据库）
```

### 3. 重命名分类

```bash
# 步骤 1: 重命名目录
git mv content/articles/old-name content/articles/new-name

# 步骤 2: 更新该目录下所有文章的 frontmatter
find content/articles/new-name -name "*.md" -type f -exec \
  sed -i 's/category: "old-name"/category: "new-name"/g' {} +

# 步骤 3: 提交到 Git
git add -A
git commit -m "rename category: old-name -> new-name"
git push

# 步骤 4: Webhook 自动触发
# - 删除旧分类
# - 创建新分类
# - 重新导入所有文章
```

## 故障排查

### 问题：分类被删除了但又自动出现

**原因**：旧版本的逻辑会强制从数据库重建所有分类

**解决方案**：
1. 升级到最新版本的代码
2. 从数据库中删除该分类
3. 删除 Git 中的目录
4. 提交并推送

### 问题：新建的分类目录没有 index.md

**原因**：需要先在数据库中创建分类

**解决方案**：
1. 在管理后台创建分类
2. 或者在目录中添加一篇文章，系统会自动创建分类（如果启用了 `GIT_AUTO_CREATE_CATEGORIES`）
3. 触发同步后会自动生成 `index.md`

### 问题：index.md 的元数据不正确

**原因**：数据库中的分类元数据可能已更新

**解决方案**：
1. 在管理后台更新分类信息
2. 触发同步，系统会自动更新 `index.md`
3. 或者手动编辑 `index.md` 并推送，系统会更新数据库

## 技术细节

### 同步顺序

```
1. Git Pull（拉取最新变更）
2. 分析文件变更（added/modified/deleted）
3. 更新数据库（文章、分类）
4. sync_categories_to_disk()
   ├─ 遍历数据库中的所有分类
   ├─ 检查 Git 中是否存在对应目录
   ├─ 如果不存在 → 删除分类
   └─ 如果存在 → 创建/更新 index.md
5. Git Commit & Push（提交元数据变更）
```

### 防止循环触发

所有自动提交都带有 `[skip ci]` 标记：

```
chore: sync metadata from database (+2) [skip ci]
```

Webhook 会检测到这个标记并跳过，避免无限循环。

### 性能优化

- 只读取变更的文件，不扫描整个仓库
- 使用 SHA 去重避免重复处理
- 异步 I/O 提高文件读写效率

## 版本历史

- **v2.0**（当前版本）：Git-First 设计，分类跟随 Git 变更
- **v1.0**（已废弃）：数据库驱动，会强制创建分类目录

## 相关文档

- [Git 同步指南](./GIT_SYNC_GUIDE.md)
- [Webhook 配置](./WEBHOOK_SETUP.md)
- [架构设计](./ARCHITECTURE.md)