from typing import Annotated
from uuid import UUID

from app.core.db import get_async_session
from app.git_ops.background_tasks import run_background_commit
from app.posts import service, utils
from app.posts.model import PostType
from app.posts.schema import (
    PostCreate,
    PostDetailResponse,
    PostPreviewRequest,
    PostPreviewResponse,
    PostUpdate,
)
from app.users.dependencies import get_current_active_user
from app.users.model import User
from fastapi import APIRouter, BackgroundTasks, Depends, Path, status
from sqlmodel.ext.asyncio.session import AsyncSession

router = APIRouter()


@router.post("/preview", response_model=PostPreviewResponse, summary="文章实时预览")
async def preview_post(request: PostPreviewRequest):
    """预览 MDX 内容（实时渲染）

    权限：
    - 公开接口，无需登录

    功能说明：
    - 将 MDX 内容转换为 AST 结构
    - 生成文章目录（TOC）
    - 计算阅读时间
    - 生成摘要

    请求体：
    ```json
    {
        "content_mdx": "# 标题\n\n这是内容..."
    }
    ```

    返回：
    ```json
    {
        "content_ast": {
            "type": "root",
            "children": [...]
        },
        "toc": [
            {
                "id": "heading-1",
                "title": "标题",
                "level": 1
            }
        ],
        "reading_time": 5,
        "excerpt": "这是内容..."
    }
    ```

    字段说明：
    - content_ast: AST 结构（用于前端渲染）
    - toc: 文章目录
    - reading_time: 预计阅读时间（分钟）
    - excerpt: 自动生成的摘要（前200字符）

    示例：
    - POST /posts/preview

    使用场景：
    - 编辑器实时预览
    - 发布前检查渲染效果
    - 测试 MDX 语法

    注意：
    - 此接口不会保存数据
    - 支持完整的 Markdown 和 MDX 语法
    - 支持数学公式、代码高亮等
    """
    return await utils.PostProcessor(request.content_mdx).process()


# ========================================
# 创作接口 (需要认证)
# ========================================


@router.post(
    "/{post_type}",
    response_model=PostDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建文章",
)
async def create_post_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    post_in: PostCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    background_tasks: BackgroundTasks,
):
    """创建新文章

    权限：
    - 需要登录

    路径参数：
    - post_type: 板块类型（article/idea）

    请求体：
    ```json
    {
        "title": "文章标题",
        "slug": "article-slug",
        "content_mdx": "# 标题\n\n内容...",
        "excerpt": "文章摘要",
        "status": "draft",
        "category_id": "uuid",
        "tags": ["Python", "FastAPI"],
        "cover_media_id": "uuid",
        "is_featured": false,
        "enable_jsx": false,
        "meta_title": "SEO标题",
        "meta_description": "SEO描述"
    }
    ```

    字段说明：
    - title: 文章标题（必填）
    - slug: URL别名（可选，自动生成）
    - content_mdx: MDX内容（必填）
    - excerpt: 摘要（可选，自动生成）
    - status: 状态（draft/published/archived，默认draft）
    - category_id: 分类ID（可选）
    - tags: 标签名称列表（可选，自动创建不存在的标签）
    - cover_media_id: 封面图ID（可选）
    - is_featured: 是否推荐（默认false）
    - enable_jsx: 是否启用JSX组件（默认false）

    返回：
    - 创建成功的文章对象（包含生成的AST、TOC等）

    示例：
    - POST /posts/article - 创建文章
    - POST /posts/idea - 创建想法

    错误码：
    - 400: Slug已存在
    - 401: 未登录
    - 404: 分类或封面图不存在
    - 422: 数据验证失败

    注意：
    - 创建后会自动触发 Git 提交（后台任务）
    - 如果不提供 slug，会自动生成
    - 标签会自动创建并关联
    - 会自动生成 AST、TOC、阅读时间等
    """
    # 确保 post_type 匹配
    post_in.post_type = post_type
    post = await service.create_post(session, post_in, current_user.id)

    # 触发自动提交
    background_tasks.add_task(run_background_commit, f"Create post: {post.title}")

    return post


@router.patch(
    "/{post_type}/{post_id}", response_model=PostDetailResponse, summary="更新文章"
)
async def update_post_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    post_id: UUID,
    post_in: PostUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    background_tasks: BackgroundTasks,
):
    """更新文章

    权限：
    - 需要登录
    - 只有作者或超级管理员可以更新

    路径参数：
    - post_type: 板块类型（article/idea）
    - post_id: 文章ID（UUID格式）

    请求体（所有字段都是可选的）：
    ```json
    {
        "title": "新标题",
        "content_mdx": "# 新内容",
        "status": "published",
        "category_id": "uuid",
        "tags": ["新标签"],
        "is_featured": true
    }
    ```

    字段说明：
    - 只更新提供的字段
    - 未提供的字段保持不变
    - tags: 会完全替换现有标签（不是追加）

    返回：
    - 更新后的文章对象

    示例：
    - PATCH /posts/article/550e8400-e29b-41d4-a716-446655440000
      ```json
      {
          "status": "published"
      }
      ```

    错误码：
    - 400: Slug已被其他文章使用
    - 401: 未登录
    - 403: 无权更新（非作者且非超级管理员）
    - 404: 文章不存在
    - 422: 数据验证失败

    注意：
    - 更新后会自动触发 Git 提交（后台任务）
    - 更新内容会重新生成 AST、TOC等
    - 更新标签会自动创建不存在的标签
    - 不能修改 post_type（需要删除后重建）
    """
    post = await service.update_post(session, post_id, post_in, current_user)

    # 触发自动提交
    background_tasks.add_task(run_background_commit, f"Update post: {post.title}")

    return post


@router.delete(
    "/{post_type}/{post_id}", status_code=status.HTTP_204_NO_CONTENT, summary="删除文章"
)
async def delete_post_by_type(
    post_type: Annotated[PostType, Path(description="板块类型")],
    post_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    background_tasks: BackgroundTasks,
):
    """删除文章

    权限：
    - 需要登录
    - 只有作者或超级管理员可以删除

    路径参数：
    - post_type: 板块类型（article/idea）
    - post_id: 文章ID（UUID格式）

    返回：
    - 204 No Content（无响应体）

    示例：
    - DELETE /posts/article/550e8400-e29b-41d4-a716-446655440000
    - DELETE /posts/idea/550e8400-e29b-41d4-a716-446655440000

    错误码：
    - 401: 未登录
    - 403: 无权删除（非作者且非超级管理员）
    - 404: 文章不存在

    注意：
    - 删除操作不可恢复
    - 会同时删除文章的所有关联数据（标签关联、版本历史等）
    - 删除后会自动触发 Git 提交（后台任务）
    - 如果文章有 source_path，对应的 Git 文件也会被删除
    """
    await service.delete_post(session, post_id, current_user)

    # 触发自动提交
    background_tasks.add_task(run_background_commit, f"Delete post: {post_id}")

    return None
