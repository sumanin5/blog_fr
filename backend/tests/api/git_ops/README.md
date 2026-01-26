# Git Ops 测试套件文档

这个测试套件用于测试 Git 同步功能，验证系统如何在 Git 仓库（Markdown/MDX 文件）和数据库之间进行双向同步。

## 测试架构概览

```
Git 仓库 (MDX 文件) ←→ 数据库 (Posts 表)
         ↓
    资产文件 → 媒体库
```

- **正向同步**：Git → DB（从文件导入到数据库）
- **反向同步**：DB → Git（数据库变更写回文件）
- **资产管理**：自动提取和管理文章中的图片等资源
- **错误容错**：部分失败不影响整体同步

---

## 测试文件说明

### 1. `conftest.py` - 测试配置和公共 Fixtures

提供所有测试共用的 fixtures 和测试环境配置。

#### Fixtures:

**`mock_content_dir(tmp_path, monkeypatch)`**

- 创建临时的内容目录
- 初始化为 Git 仓库（避免 "not a git repository" 错误）
- 自动配置 Git 用户信息
- Mock `settings.CONTENT_DIR` 指向临时目录
- Mock `GitClient.pull` 防止网络操作

**`sample_git_post(mock_content_dir, superadmin_user)`**

- 创建一篇示例测试文章
- 包含完整的 frontmatter（标题、slug、标签、作者等）
- 返回文件路径供测试使用

**`resync_test_post(mock_content_dir, session, superadmin_user)`**

- 创建用于重新同步测试的文章和文件
- 包含原作者和新作者
- 文件内容与数据库不一致（用于测试同步）
- 返回 `(post, test_file_path, new_author)` 元组

---

### 2. `test_sync.py` - 基础同步流程测试

测试 Git 到数据库的基本同步功能。

#### 测试函数:

**`test_manual_sync_flow()`**

- **目的**: 测试完整的 CRUD 同步流程
- **步骤**:
  1. 创建新文件并同步 → 验证数据库中创建了文章
  2. 修改文件并同步 → 验证数据库中更新了文章
  3. 删除文件并同步 → 验证数据库中删除了文章
- **验证点**:
  - 同步响应中的 `added`/`updated`/`deleted` 统计
  - 数据库中文章的标题、内容、slug 等字段
  - 文件路径 `source_path` 正确记录

---

### 3. `test_sync_metadata.py` - 元数据字段同步测试

测试 MDX 文件 frontmatter 中各种元数据字段的解析和同步。

#### 测试函数:

**`test_sync_with_tags()`**

- 测试 YAML 数组格式的标签
- 验证多个标签正确创建和关联

**`test_sync_with_comma_separated_tags()`**

- 测试逗号分隔的标签字符串
- 验证字符串解析为多个标签

**`test_sync_with_seo_metadata()`**

- 测试 SEO 相关字段：`meta_title`、`meta_description`、`meta_keywords`
- 验证 SEO 字段正确存储

**`test_sync_with_post_type()`**

- 测试文章类型字段 `type`（ARTICLE/IDEA）
- 验证类型正确映射

**`test_sync_with_featured_flag()`**

- 测试布尔标志：`is_featured`、`allow_comments`
- 验证布尔值正确解析

**`test_sync_with_all_metadata()`**

- 综合测试：包含所有可能的元数据字段
- 验证完整的 frontmatter 解析

---

### 4. `test_resync_metadata.py` - 重新同步元数据测试

测试单篇文章的元数据重新同步 API。

#### API 端点:

```
POST /api/v1/ops/git/posts/{post_id}/resync-metadata
```

#### 测试函数:

**`test_resync_metadata_success()`**

- 测试成功的重新同步
- 验证数据库字段更新
- 验证文件中的 ID 回写

**`test_resync_metadata_post_not_found()`**

- 测试文章不存在的情况
- 验证返回 404 错误

**`test_resync_metadata_no_source_path()`**

- 测试文章没有 `source_path` 的情况
- 验证返回 400 错误

**`test_resync_metadata_file_not_found()`**

- 测试源文件不存在的情况
- 验证返回 400 错误

**`test_resync_metadata_requires_admin()`**

- 测试权限控制
- 验证普通用户无法调用（返回 403）

---

### 5. `test_sync_cover.py` - 封面图关联测试

测试文章封面图的解析和关联功能。

#### 测试函数:

**`test_sync_with_valid_cover()`**

- 测试有效的封面图路径
- 验证封面图正确关联到 `cover_media_id`

**`test_sync_with_nonexistent_cover()`**

- 测试不存在的封面图路径
- 验证文章创建成功但封面为空

**`test_sync_with_cover_by_filename()`**

- 测试通过文件名匹配封面图
- 验证模糊匹配功能

**`test_sync_without_cover()`**

- 测试没有封面图的文章
- 验证 `cover_media_id` 为 null

---

### 6. `test_sync_author.py` - 作者字段测试

测试作者字段的解析和验证。

#### 测试函数:

**`test_sync_with_valid_author()`**

- 测试有效的作者用户名
- 验证作者正确关联到 `author_id`

**`test_sync_without_author_field()`**

- 测试缺少 `author` 字段
- 验证返回错误，文章未创建

**`test_sync_with_nonexistent_author()`**

- 测试不存在的作者用户名
- 验证返回错误，文章未创建

**`test_sync_with_author_uuid()`**

- 测试使用 UUID 指定作者
- 验证 UUID 格式的作者 ID 正确解析

---

### 7. `test_reverse_write.py` - 反向写入测试（DB → Git）

测试数据库变更自动写回 Git 文件的功能。

#### 测试函数:

**`test_create_post_generates_file()`**

- 测试通过 API 创建文章时自动生成物理文件
- 验证文件路径、内容、frontmatter
- 验证后台 Git 提交任务被触发

**`test_update_post_updates_file()`**

- 测试更新文章时更新物理文件
- 验证标题变更导致文件重命名
- 验证内容更新

**`test_rename_post_moves_file()`**

- 测试修改 slug 时的文件处理
- 验证文件名基于 title 而非 slug

**`test_delete_post_removes_file()`**

- 测试删除文章时删除物理文件
- 验证文件被正确删除

---

### 8. `test_git_asset_sync.py` - 资产文件同步测试

测试文章中引用的图片等资产的自动导入和管理。

#### 测试函数:

**`test_git_first_mapping_and_asset_ingestion()`**

- **核心集成测试**，验证：
  1. **Git 优先的目录映射**：根据文件路径自动识别分类和类型
  2. **资产自动摄入**：提取文章中的图片并导入媒体库
  3. **SHA256 去重**：相同内容的文件只存储一次
- **目录结构示例**:
  ```
  content/
    Articles/Tech/post-a.mdx  → ARTICLE 类型, Tech 分类
    Ideas/Life/post-b.mdx     → IDEA 类型, Life 分类
  ```
- **验证点**:
  - 分类和类型根据路径正确识别（忽略 frontmatter 中的错误值）
  - 图片路径替换为媒体 URL
  - 多篇文章引用同一图片时只存储一份

**`test_git_cover_asset_ingestion()`**

- 测试封面图相对路径的自动上传
- 验证封面图正确导入媒体库并关联

---

### 9. `test_sync_errors.py` - 错误处理测试

测试各种错误场景的处理。

#### 测试函数:

**`test_sync_with_multiple_files_some_invalid()`**

- 测试部分文件有效、部分无效的情况
- 验证有效文件正常同步，无效文件记录错误
- 验证错误信息清晰

**`test_sync_with_invalid_frontmatter()`**

- 测试 YAML 格式错误的 frontmatter
- 验证跳过该文件或返回错误

**`test_sync_empty_directory()`**

- 测试空目录同步
- 验证返回空结果，无错误

**`test_sync_without_admin_permission()`**

- 测试权限控制
- 验证普通用户无法触发同步（返回 403）

**`test_sync_without_authentication()`**

- 测试未登录用户
- 验证返回 401 未认证

---

### 10. `test_sync_preview_webhook.py` - 预览和 Webhook 测试

测试预览模式和 Webhook 触发功能。

#### Preview API 测试:

**`test_preview_sync_with_new_files()`**

- 测试预览模式显示待创建的文件
- 不实际写入数据库

**`test_preview_sync_no_changes()`**

- 测试无变更时的预览结果

**`test_preview_sync_requires_admin()`**

- 测试预览接口的权限控制

#### Webhook API 测试:

**`test_webhook_with_valid_signature()`**

- 测试有效的 HMAC 签名
- 验证 Webhook 触发同步

**`test_webhook_with_invalid_signature()`**

- 测试无效签名被拒绝（返回 401）

**`test_webhook_missing_signature()`**

- 测试缺少签名被拒绝

**`test_webhook_without_secret_configured()`**

- 测试未配置 secret 时拒绝请求

---

### 11. `test_sync_incremental.py` - 增量同步核心逻辑测试

测试基于 Git Diff 的增量同步功能。

#### 测试函数:

**`test_incremental_sync_with_new_file()`**

- 测试增量同步检测并同步新增文件
- 验证只处理变更文件

**`test_incremental_sync_with_modified_file()`**

- 测试增量同步检测并更新修改的文件
- 验证文件被标记为 updated

**`test_incremental_sync_with_deleted_file()`**

- 测试增量同步检测并删除已删除的文件
- 验证数据库中文章被删除

**`test_incremental_sync_no_changes()`**

- 测试无变更时快速返回
- 验证不执行任何操作

**`test_incremental_sync_multiple_changes()`**

- 测试一次 commit 包含多个变更（新增、修改、删除）
- 验证所有变更都被正确处理

**`test_incremental_sync_fallback_to_full_on_no_hash()`**

- 测试没有 last_hash 时自动回退到全量同步
- 验证 .gitops_last_sync 文件被创建

**`test_incremental_sync_ignores_non_markdown_files()`**

- 测试增量同步忽略非 Markdown 文件
- 验证只处理 .md 和 .mdx 文件

**`test_hash_file_persistence()`**

- 测试 .gitops_last_sync 文件的持久化
- 验证 hash 值正确保存和更新

---

### 12. `test_sync_concurrent.py` - 并发同步测试

测试 sync_lock 锁机制和并发场景。

#### 测试函数:

**`test_concurrent_sync_requests_are_serialized()`**

- 测试并发同步请求被序列化执行
- 验证所有请求都成功完成

**`test_concurrent_incremental_and_full_sync()`**

- 测试增量同步和全量同步并发执行
- 验证锁机制正确工作

**`test_sync_during_file_modification()`**

- 测试同步过程中文件被修改
- 验证并发安全性

**`test_lock_prevents_race_conditions()`**

- 测试锁机制防止竞态条件
- 验证数据库一致性（无重复文章）

**`test_sync_with_rapid_file_changes()`**

- 测试快速连续修改文件
- 验证最终状态正确

**`test_concurrent_sync_and_preview()`**

- 测试同步和预览并发执行
- 验证不同操作的并发兼容性

---

### 13. `test_sync_git_failures.py` - Git 操作失败场景测试

测试各种 Git 操作失败时的错误处理和降级策略。

#### 测试函数:

**`test_sync_continues_when_git_pull_fails()`**

- 测试 git pull 失败时同步继续执行
- 验证错误被记录但不阻止同步

**`test_incremental_sync_fallback_on_git_diff_failure()`**

- 测试 git diff 失败时回退到全量同步
- 验证降级策略正确执行

**`test_sync_with_corrupted_hash_file()`**

- 测试 .gitops_last_sync 文件损坏时的处理
- 验证自动回退到全量同步

**`test_sync_with_empty_hash_file()`**

- 测试空的 hash 文件处理
- 验证 hash 文件被更新为有效值

**`test_get_current_hash_failure_handling()`**

- 测试获取当前 hash 失败的处理
- 验证同步继续执行

**`test_incremental_sync_with_no_commits()`**

- 测试 Git 仓库没有新提交
- 验证快速返回无变更

**`test_sync_with_git_diff_returning_empty_list()`**

- 测试 git diff 返回空列表
- 验证正确处理空结果

**`test_sync_with_partial_git_operations_failure()`**

- 测试部分 Git 操作失败但同步继续
- 验证容错机制

**`test_sync_recovers_from_transient_git_errors()`**

- 测试从临时 Git 错误中恢复
- 验证错误恢复能力

---

## 运行测试

### 运行所有 Git Ops 测试:

```bash
pytest backend/tests/api/git_ops/ -v
```

### 运行特定测试文件:

```bash
pytest backend/tests/api/git_ops/test_sync.py -v
```

### 运行特定测试函数:

```bash
pytest backend/tests/api/git_ops/test_sync.py::test_manual_sync_flow -v
```

### 运行带标记的测试:

```bash
pytest -m git_ops -v
```

---

## 测试覆盖的功能点

### 正向同步（Git → DB）

- ✅ 新增文件创建文章
- ✅ 修改文件更新文章
- ✅ 删除文件删除文章
- ✅ Frontmatter 元数据解析
- ✅ 标签、分类、作者关联
- ✅ 封面图关联
- ✅ SEO 字段处理
- ✅ 资产文件自动导入
- ✅ SHA256 去重

### 增量同步（Git Diff）

- ✅ 基于 commit hash 的增量检测
- ✅ .gitops_last_sync 文件读写
- ✅ 只处理变更文件
- ✅ 无变更时快速返回
- ✅ 增量同步失败时回退到全量同步
- ✅ 忽略非 Markdown 文件
- ✅ Hash 文件持久化

### 反向同步（DB → Git）

- ✅ 创建文章生成文件
- ✅ 更新文章更新文件
- ✅ 删除文章删除文件
- ✅ 标题变更重命名文件
- ✅ 后台 Git 提交

### 错误处理

- ✅ 部分文件失败不影响其他文件
- ✅ 缺少必填字段
- ✅ 引用不存在的资源
- ✅ 无效的 frontmatter 格式
- ✅ 权限控制
- ✅ Git pull 失败容错
- ✅ Git diff 失败降级
- ✅ Hash 文件损坏恢复
- ✅ 临时 Git 错误恢复

### 并发控制

- ✅ 并发同步请求序列化
- ✅ sync_lock 锁机制
- ✅ 数据库一致性保护
- ✅ 防止竞态条件
- ✅ 快速连续修改处理
- ✅ 同步与预览并发兼容

### 高级功能

- ✅ Git 优先的目录映射
- ✅ 预览模式
- ✅ Webhook 触发
- ✅ HMAC 签名验证
- ✅ 重新同步元数据

---

## 注意事项

1. **测试隔离**: 每个测试使用独立的临时目录和 Git 仓库
2. **异步测试**: 所有测试都是异步的，使用 `@pytest.mark.asyncio`
3. **数据库清理**: 使用 session fixtures 自动清理测试数据
4. **Mock 网络**: GitClient.pull 被 mock 以避免真实的网络操作
5. **权限测试**: 使用不同的 token headers 测试权限控制

---

## 相关文档

- [Git Sync Guide](../../../../../GIT_SYNC_GUIDE.md)
- [Git Ops Architecture](../../../../app/git_ops/ARCHITECTURE.md)
- [Git Ops README](../../../../app/git_ops/README.md)
