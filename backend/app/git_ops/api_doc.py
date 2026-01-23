TRIGGER_SYNC = """
手动触发 Git 同步

  权限：
  - 需要管理员权限

  功能说明：
  - 从 Git 仓库同步 Markdown/MDX 文件到数据库
  - 支持增量同步（默认）和全量同步
  - 自动处理文件的创建、更新、删除

  查询参数：
  - force_full: 是否强制全量同步（默认 false）
    - false: 增量同步，只处理变动的文件（快速）
    - true: 全量同步，扫描所有文件（耗时较长，用于修复数据）

  返回：
  ```json
  {
      "total_scanned": 10,
      "created": 2,
      "updated": 3,
      "deleted": 1,
      "skipped": 4,
      "errors": []
  }
  ```

  字段说明：
  - total_scanned: 扫描的文件总数
  - created: 新创建的文章数
  - updated: 更新的文章数
  - deleted: 删除的文章数
  - skipped: 跳过的文件数（未变更）
  - errors: 错误列表

  示例：
  - POST /git-ops/sync - 增量同步
  - POST /git-ops/sync?force_full=true - 全量同步

  错误码：
  - 401: 未登录
  - 403: 权限不足（非管理员）
  - 500: Git 操作失败

  注意：
  - 增量同步基于 Git commit 历史，速度快
  - 全量同步会扫描所有文件，适合修复数据不一致
  - 同步过程中会自动处理图片上传和标签创建
  - 建议在低峰期执行全量同步
  """
PREVIEW_SYNC = """
预览 Git 同步变更（Dry Run）

权限：
- 需要管理员权限

功能说明：
- 预览即将发生的变更，不会修改数据库
- 用于在实际同步前检查变更内容
- 帮助识别潜在问题

返回：
```json
{
    "to_create": [
        {
            "path": "content/articles/new-post.md",
            "title": "新文章标题",
            "reason": "文件存在于 Git 但不在数据库"
        }
    ],
    "to_update": [
        {
            "path": "content/articles/existing-post.md",
            "title": "现有文章",
            "reason": "Git hash 不匹配"
        }
    ],
    "to_delete": [
        {
            "path": "content/articles/deleted-post.md",
            "title": "已删除文章",
            "reason": "文件不存在于 Git"
        }
    ],
    "summary": {
        "total_to_create": 1,
        "total_to_update": 1,
        "total_to_delete": 1
    }
}
```

示例：
- GET /git-ops/preview

错误码：
- 401: 未登录
- 403: 权限不足（非管理员）
- 500: Git 操作失败

注意：
- 此接口只读，不会修改任何数据
- 建议在执行同步前先预览变更
- 可以帮助发现配置错误或意外删除
"""

RESYNC_POST_METADATA = """
重新同步指定文章的 Frontmatter 元数据

权限：
- 需要管理员权限

功能说明：
- 从 Git 文件重新读取 Frontmatter 元数据
- 更新数据库中的文章信息
- 用于修复元数据不一致的问题

路径参数：
- post_id: 文章ID（UUID格式）

适用场景：
- 手动修改了 Git 文件的 Frontmatter
- 数据库元数据与文件不一致
- 需要强制刷新文章元数据

返回：
```json
{
    "status": "success",
    "message": "Post {post_id} metadata resynced successfully"
}
```

示例：
- POST /git-ops/posts/550e8400-e29b-41d4-a716-446655440000/resync-metadata

错误码：
- 400: 文章没有关联的 Git 文件（source_path 为空）
- 401: 未登录
- 403: 权限不足（非管理员）
- 404: 文章不存在
- 404: Git 文件不存在

注意：
- 只适用于通过 Git 同步创建的文章（有 source_path）
- 不会修改文章内容，只更新元数据（标题、分类、标签等）
- 会自动处理标签的创建和关联
"""
GITHUB_WEBHOOK = """
接收 GitHub Webhook 推送事件

权限：
- 公开接口（通过签名验证）

功能说明：
- 接收 GitHub 的 Push 事件
- 验证 Webhook 签名确保安全
- 触发后台增量同步任务

配置要求：
1. 在 GitHub 仓库设置中配置 Webhook
    - Payload URL: https://your-domain.com/api/v1/git-ops/webhook
    - Content type: application/json
    - Secret: 与环境变量 WEBHOOK_SECRET 一致
    - Events: 选择 "Just the push event"

2. 设置环境变量
    ```
    WEBHOOK_SECRET=your-secret-key
    ```

请求头：
- X-Hub-Signature-256: GitHub 生成的 HMAC 签名

返回：
```json
{
    "status": "triggered"
}
```

工作流程：
1. GitHub 检测到 Push 事件
2. 发送 Webhook 到此接口
3. 验证签名
4. 触发后台增量同步任务
5. 立即返回响应（不等待同步完成）

示例：
- POST /git-ops/webhook
  ```
  X-Hub-Signature-256: sha256=xxx
  ```

错误码：
- 400: 签名验证失败
- 400: 缺少签名头
- 500: 后台任务启动失败

注意：
- 签名验证失败会抛出异常，拒绝请求
- 同步任务在后台异步执行，不会阻塞响应
- 建议配置 Webhook 重试机制
- 可以在日志中查看同步结果
"""


class git_doc:
    trigger_sync = TRIGGER_SYNC
    preview_sync = PREVIEW_SYNC
    resync_post_metadata = RESYNC_POST_METADATA
    github_webhook = GITHUB_WEBHOOK
