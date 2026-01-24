"""
API Tags Metadata - OpenAPI 文档标签描述

集中管理所有 API 模块的标签元数据，用于生成清晰的 API 文档。
每个模块可以在自己的 router.py 中定义详细的 metadata，然后在这里汇总。
"""

from app.git_ops.tag_metadata import GITOPS_TAG_METADATA
from app.media.tag_metadata import MEDIA_TAGS_METADATA
from app.posts.tag_metadata import POSTS_TAGS_METADATA
from app.users.tag_metadata import USERS_TAG_METADATA

# ============================================================
# 汇总所有 Tags Metadata
# ============================================================
TAGS_METADATA = [
    USERS_TAG_METADATA,
    *MEDIA_TAGS_METADATA,  # media 的子标签
    *POSTS_TAGS_METADATA,  # posts 的子标签
    GITOPS_TAG_METADATA,
]

DESCRIPTION = """
## 博客系统 API

一个功能完整的现代化博客系统后端 API，支持 Markdown/MDX 内容管理和 GitOps 自动化同步。

### 核心特性

- 🔐 **用户认证**：基于 JWT 的安全认证系统
- 📝 **内容管理**：支持 Markdown/MDX 格式的文章创建和编辑
- 🎨 **三种渲染模式**：后端渲染、前端 SSR、前端 CSR
- 📁 **媒体管理**：图片、视频等媒体文件的上传和管理
- 🔄 **GitOps 同步**：Git 仓库与数据库的双向自动化同步
- 🔗 **Webhook 集成**：支持 GitHub Webhook 自动触发同步

### 技术栈

- **框架**：FastAPI + SQLModel + PostgreSQL
- **认证**：JWT + OAuth2
- **内容处理**：markdown-it-py + MDX
- **异步支持**：asyncio + aiofiles

### 快速开始

1. 注册账号：`POST /api/v1/users/register`
2. 登录获取 token：`POST /api/v1/users/login`
3. 使用 token 访问受保护的接口：`Authorization: Bearer <token>`

### 文档

- [Swagger UI](/docs) - 交互式 API 文档
- [Scalar UI](/scalar) - 现代化 API 文档
- [OpenAPI JSON](/openapi.json) - OpenAPI 规范文件
    """
