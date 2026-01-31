import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from app.core.exceptions import InsufficientPermissionsError
from app.posts import cruds as crud
from app.posts.exceptions import (
    CategoryNotFoundError,
    CategoryTypeMismatchError,
    PostNotFoundError,
)
from app.posts.model import Post, PostStatus, PostType
from app.posts.schemas import PostCreate, PostUpdate
from app.posts.utils import (
    PostProcessor,
    generate_slug_with_random_suffix,
    sync_post_tags,
)
from app.users.model import User
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


async def _sync_to_disk(
    session: AsyncSession, post_id: UUID, old_source_path: str | None = None
):
    """
    辅助函数：将文章同步写入到物理磁盘（反向同步）
    """
    """
    辅助函数：将文章同步写入到物理磁盘（反向同步）
    """
    from app.git_ops.components.writer import FileWriter

    # 重新查询以确保加载所有关系（Tags, Category）
    # 使用 select IN 预加载（虽然 crud.get_post_by_id 应该已经做了，但再次确保）
    post = await crud.get_post_by_id(session, post_id)

    writer = FileWriter(session=session)

    # 准备数据
    tag_names = [t.name for t in post.tags]
    category_slug = post.category.slug if post.category else "uncategorized"

    # 构造一个临时的 old_post 对象用于传递 source_path
    # 只需要 source_path 字段
    old_post_stub = None
    if old_source_path:
        old_post_stub = type("PostStub", (), {"source_path": old_source_path})()

    # 执行写入
    relative_path = await writer.write_post(
        post,
        old_post=old_post_stub,  # type: ignore
        category_slug=category_slug,
        tags=tag_names,
    )

    # 如果计算出的路径与当前数据库记录不一致，更新数据库
    if post.source_path != relative_path:
        logger.info(
            f"Updating source_path for post {post.id}: {post.source_path} -> {relative_path}"
        )
        post.source_path = relative_path
        session.add(post)
        await session.commit()
        await session.refresh(post)


async def generate_unique_slug(
    session: AsyncSession, title: str, post_id: Optional[UUID] = None
) -> str:
    """生成唯一的文章 Slug（带随机后缀）

    新策略：使用 6 位随机字符确保唯一性，完全避免数据库查询
    格式：base-slug-xxxxxx (例如: my-article-a3f2k8)

    Args:
        session: 数据库会话（保留用于向后兼容，但不再使用）
        title: 文章标题
        post_id: 编辑时的文章 ID（保留用于向后兼容，但不再使用）

    Returns:
        唯一的 slug
    """
    return generate_slug_with_random_suffix(title)


async def get_post_detail(
    session: AsyncSession,
    post_id: UUID,
    post_type: PostType,
    current_user: Optional[User] = None,
) -> Post:
    """获取文章详情（带权限检查）

    权限规则：
    1. 已发布文章：任何人可访问（包括未登录用户）
    2. 草稿文章：
       - 未登录 → 401 Unauthorized
       - 非作者且非超级管理员 → 403 Forbidden
       - 作者或超级管理员 → 200 OK

    Args:
        session: 数据库会话
        post_id: 文章ID
        post_type: 板块类型（用于验证）
        current_user: 当前用户（可选）

    Returns:
        文章对象

    Raises:
        PostNotFoundError: 文章不存在或类型不匹配
        InvalidCredentialsError: 未登录访问草稿
        InsufficientPermissionsError: 无权访问草稿
    """
    from app.users.exceptions import InvalidCredentialsError

    # 1. 查询文章
    post = await crud.get_post_by_id(session, post_id)
    if not post or post.post_type != post_type:
        raise PostNotFoundError()

    # 2. 权限检查（只针对草稿）
    if post.status == PostStatus.DRAFT:
        # 草稿必须登录
        if not current_user:
            logger.warning(f"Unauthorized access to draft post: post_id={post_id}")
            raise InvalidCredentialsError("请先登录")

        # 只有作者或超级管理员可以访问
        if post.author_id != current_user.id and not current_user.is_superadmin:
            logger.warning(
                f"Forbidden access to draft post: post_id={post_id}, user_id={current_user.id}"
            )
            raise InsufficientPermissionsError("无权访问此草稿")

    # 3. 浏览量统计逻辑
    # 只有当用户不是管理员时，才增加浏览量
    # - 匿名用户 (None): +1
    # - 普通用户 (USER): +1
    # - 管理员 (ADMIN/SUPERADMIN): 不计数
    should_increment_view = True
    if current_user and current_user.is_admin:
        should_increment_view = False
        logger.debug(
            f"Admin user {current_user.username} accessing post, view count skipped"
        )

    if should_increment_view:
        await crud.increment_view_count(session, post.id)

    logger.debug(
        f"Post detail accessed: post_id={post_id}, status={post.status}, user={'guest' if not current_user else current_user.username}"
    )
    return post


async def delete_post(session: AsyncSession, post_id: UUID, current_user: User) -> None:
    """删除文章（带细粒度权限检查）

    Args:
        session: 数据库会话
        post_id: 文章ID
        current_user: 当前用户

    Raises:
        PostNotFoundError: 文章不存在
        InsufficientPermissionsError: 权限不足（非作者且非超级管理员）
    """

    post = await crud.get_post_by_id(session, post_id)

    # 细粒度权限检查：超级管理员可以删除任何文章，普通用户只能删除自己的
    if not current_user.is_superadmin and post.author_id != current_user.id:
        raise InsufficientPermissionsError("只能删除自己的文章")

    # 尝试删除物理文件 (Git-First 反向同步)
    try:
        from app.git_ops.components.writer import FileWriter

        writer = FileWriter(session=session)
        await writer.delete_post(post)
    except Exception as e:
        logger.error(f"Failed to delete physical file for post {post.id}: {e}")

    await session.delete(post)
    await session.commit()
    logger.info(f"文章已删除: {post.id} by user {current_user.id}")


async def create_post(
    session: AsyncSession,
    post_in: PostCreate,
    author_id: UUID,
    preserve_slug: bool = False,
    source_path: str | None = None,
) -> Post:
    """
    创建文章流水线
    ... (保持注释一致)
    Args:
        session: 数据库会话
        post_in: 文章创建数据
        author_id: 作者ID
        preserve_slug: 是否保留原始 slug（Git 同步时使用）
        source_path: Git 源代码文件相对路径 (用于解析正文图片)
    """
    # 1. 校验分类与板块逻辑隔离
    if post_in.category_id:
        category = await crud.get_category_by_id(session, post_in.category_id)
        if not category:
            # 🔄 尝试强制刷新 Session 状态，应对 SQLAlchemy 事务可见性问题
            session.expire_all()
            category = await crud.get_category_by_id(session, post_in.category_id)

            if not category:
                logger.error(
                    f"❌ Create Post Failed: Category {post_in.category_id} not found for type {post_in.post_type}!"
                )
                raise CategoryNotFoundError()
        if category.post_type != post_in.post_type:
            raise CategoryTypeMismatchError(
                f"分类 '{category.name}' (类型:{category.post_type}) 与文章类型 '{post_in.post_type}' 不匹配"
            )

    # 2. 解析 MDX 内容
    processor = PostProcessor(
        post_in.content_mdx, mdx_path=source_path, session=session
    )
    await processor.process()

    # 3. 合并元数据与请求数据
    metadata = processor.metadata
    title = metadata.get("title", post_in.title)

    # 4. 处理 Slug
    slug = post_in.slug or metadata.get("slug")
    if not slug:
        # 没有指定 slug，从标题生成
        slug = await generate_unique_slug(session, title)
    else:
        # Git 同步时保留原始 slug，API 创建时添加随机后缀
        if not preserve_slug:
            slug = await generate_unique_slug(session, slug)

    # 5. 组装对象
    db_post = Post(
        **post_in.model_dump(
            exclude={
                "content_mdx",
                "slug",
                "tags",
                "commit_message",
                "title",  # 排除 title，因为下面会显式设置
                "published_at",  # 🆕 排除 published_at，下面会特殊处理
                # excerpt 不再排除，允许用户通过 API 传入
            }
        ),
        title=title,
        slug=slug,
        author_id=author_id,
        content_mdx=processor.content_mdx,
        content_ast=processor.content_ast,
        toc=processor.toc,
        reading_time=processor.reading_time,
    )

    # 🆕 处理发布时间：
    # 1. 如果用户指定了 published_at，使用用户指定的时间（支持定时发布）
    # 2. 如果状态是 PUBLISHED 但没有指定 published_at，使用当前时间
    # 3. 如果状态是 DRAFT，published_at 保持 None
    if post_in.published_at:
        db_post.published_at = post_in.published_at
    elif post_in.status == PostStatus.PUBLISHED:
        db_post.published_at = datetime.now()

    # 处理 excerpt：优先级 用户传入 > MDX frontmatter > 自动生成
    if not db_post.excerpt:  # 如果用户没有通过 API 传入
        db_post.excerpt = metadata.get("excerpt") or processor.excerpt

    # 如果 MDX 里指定了关键词或描述，覆盖它
    if "description" in metadata:
        db_post.meta_description = metadata["description"]
    if "keywords" in metadata:
        db_post.meta_keywords = metadata["keywords"]

    # 渲染模式配置 (从 Frontmatter 读取)
    if "enable_jsx" in metadata:
        db_post.enable_jsx = bool(metadata["enable_jsx"])
    if "use_server_rendering" in metadata:
        db_post.use_server_rendering = bool(metadata["use_server_rendering"])

    session.add(db_post)
    await session.flush()  # 拿到 ID 以便处理标签

    # 6. 同步标签：优先级 用户传入 > MDX frontmatter
    tags_to_sync = post_in.tags if post_in.tags else metadata.get("tags", [])
    if tags_to_sync:
        await sync_post_tags(session, db_post, tags_to_sync)
        await session.flush()  # 确保标签关联已保存

    await session.commit()
    # 使用 CRUD 层重新查询（带关联预加载），避免懒加载问题
    db_post = await crud.get_post_by_id(session, db_post.id)

    # 7. 反向同步：如果不是从 Git 同步（即 source_path 为 None），则写入磁盘
    if source_path is None:
        await _sync_to_disk(session, db_post.id)
        # _sync_to_disk 可能提交了事务，导致对象过期，重新加载以确保关系可用
        db_post = await crud.get_post_by_id(session, db_post.id)

    logger.info(f"文章创建成功: {db_post.title} (ID: {db_post.id})")
    return db_post


async def update_post(
    session: AsyncSession,
    post_id: UUID,
    post_in: PostUpdate,
    current_user: User,
    source_path: str | None = None,
) -> Post:
    """更新文章（带细粒度权限检查）

    Args:
        session: 数据库会话
        post_id: 文章ID
        post_in: 更新数据
        current_user: 当前用户
        source_path: Git 源代码文件相对路径 (用于解析正文图片)
    """

    db_post = await crud.get_post_by_id(session, post_id)

    # 细粒度权限检查：超级管理员可以修改任何文章，普通用户只能修改自己的
    if not current_user.is_superadmin and db_post.author_id != current_user.id:
        raise InsufficientPermissionsError("只能修改自己的文章")

    # 捕获旧的路径，用于重命名检测
    old_source_path = db_post.source_path

    # 如果有正文更新，需要处理图片并同步派生字段
    if post_in.content_mdx is not None:
        processor = PostProcessor(
            post_in.content_mdx, mdx_path=source_path, session=session
        )
        await processor.process()

        # 更新处理后的正文及派生字段
        db_post.content_mdx = processor.content_mdx
        db_post.content_ast = processor.content_ast
        db_post.toc = processor.toc
        db_post.reading_time = processor.reading_time
        # 即使 MDX 里没写摘要，如果正文变了也尝试重刷一下
        db_post.excerpt = processor.excerpt or processor.metadata.get(
            "excerpt", db_post.excerpt
        )

        # 同步 MDX 中的标签（如果存在）
        if "tags" in processor.metadata:
            await sync_post_tags(session, db_post, processor.metadata["tags"])

        # 同步渲染配置 (从 Frontmatter 读取)
        if "enable_jsx" in processor.metadata:
            db_post.enable_jsx = bool(processor.metadata["enable_jsx"])
        if "use_server_rendering" in processor.metadata:
            db_post.use_server_rendering = bool(
                processor.metadata["use_server_rendering"]
            )

    update_data = post_in.model_dump(exclude_unset=True)

    # 安全检查：禁止普通用户修改作者
    if "author_id" in update_data and not current_user.is_superadmin:
        if update_data["author_id"] != db_post.author_id:
            raise InsufficientPermissionsError("仅管理员可以修改文章作者")

    # 0. 在更新前保存当前版本作为快照
    # TODO: PostVersion 功能暂时禁用，因为当前采用 Git-First 架构
    # Git 已经管理了完整的版本历史，PostVersion 会造成数据重复
    # 如果未来需要数据库级别的版本管理（如快速回滚、审计日志），可以重新启用
    # await save_post_version(
    #     session, db_post, commit_message=update_data.get("commit_message")
    # )

    # 1. 校验分类与板块逻辑隔离 (如果更新了分类或板块)
    new_category_id = update_data.get("category_id", db_post.category_id)
    new_post_type = update_data.get("post_type", db_post.post_type)

    if "category_id" in update_data or "post_type" in update_data:
        if new_category_id:
            category = await crud.get_category_by_id(session, new_category_id)
            if not category:
                raise CategoryNotFoundError()
            if category.post_type != new_post_type:
                raise CategoryTypeMismatchError(
                    f"分类 '{category.name}' (类型:{category.post_type}) 与文章类型 '{new_post_type}' 不匹配"
                )

    # 2. 如果更新了内容，重新解析 MDX (逻辑已在上方合并处理)
    pass

    # 3. 处理发布时间
    # 🆕 更新逻辑：
    # 1. 如果用户显式设置了 published_at，使用用户设置的值（支持修改定时发布时间）
    # 2. 如果状态从 DRAFT 改为 PUBLISHED，且没有设置 published_at，使用当前时间
    # 3. 如果状态从 PUBLISHED 改为 DRAFT，保持原 published_at 不变（方便重新发布）
    if "published_at" in update_data:
        # 用户显式设置了 published_at
        db_post.published_at = update_data["published_at"]
    elif update_data.get("status") == PostStatus.PUBLISHED and not db_post.published_at:
        # 状态改为 PUBLISHED，但没有 published_at，使用当前时间
        db_post.published_at = datetime.now()

    # 4. 处理显式传入的标签更新 (优先级高于 MDX 中的标签)
    if "tags" in update_data:
        await sync_post_tags(session, db_post, update_data["tags"])

    # 5. 应用其他字段更新
    for field, value in update_data.items():
        if field not in ["content_mdx", "commit_message", "tags"]:
            setattr(db_post, field, value)

    session.add(db_post)
    await session.commit()
    # 强制刷新关联对象，确保返回最新的数据
    await session.refresh(db_post, attribute_names=["category", "tags"])
    # 使用 CRUD 层重新查询（带关联预加载），确保所有字段（包括 author 等）都已加载
    db_post = await crud.get_post_by_id(session, db_post.id)

    # 6. 反向同步：如果不是从 Git 同步（即 source_path 为 None），则写入磁盘
    if source_path is None:
        await _sync_to_disk(session, db_post.id, old_source_path=old_source_path)
        # _sync_to_disk 可能提交了事务，导致对象过期，重新加载以确保关系可用
        db_post = await crud.get_post_by_id(session, db_post.id)

    logger.info(f"文章更新成功: {db_post.title}")
    return db_post
