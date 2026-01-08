"""
文章模块业务逻辑 (Service)

负责协调工具类、数据库操作和复杂的业务规则
"""

import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from app.core.exceptions import InsufficientPermissionsError
from app.posts import crud
from app.posts.exceptions import (
    CategoryNotFoundError,
    CategoryTypeMismatchError,
    PostNotFoundError,
    SlugConflictError,
    TagNotFoundError,
)
from app.posts.model import Category, Post, PostStatus, PostType, PostVersion, Tag
from app.posts.schema import (
    CategoryCreate,
    CategoryUpdate,
    PostCreate,
    PostUpdate,
    TagUpdate,
)
from app.posts.utils import (
    PostProcessor,
    generate_slug_with_random_suffix,
    sync_post_tags,  # 从 utils 导入标签同步函数
)
from app.users.model import User
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)


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


async def save_post_version(
    session: AsyncSession, post: Post, commit_message: Optional[str] = None
):
    """为文章创建一个历史版本快照"""
    max_version = await crud.get_max_post_version(session, post.id)

    version = PostVersion(
        post_id=post.id,
        version_num=max_version + 1,
        title=post.title,
        content_mdx=post.content_mdx,
        git_hash=post.git_hash,
        commit_message=commit_message or f"Auto-snapshot (v{max_version + 1})",
    )
    session.add(version)
    logger.debug(f"已保存文章版本快照: {post.title} v{version.version_num}")


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

    # 3. 已发布文章，任何人都可以访问
    # 增加浏览量
    await crud.increment_view_count(session, post.id)

    logger.debug(
        f"Post detail accessed: post_id={post_id}, status={post.status}, user={'guest' if not current_user else current_user.id}"
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
    if not post:
        raise PostNotFoundError()

    # 细粒度权限检查：超级管理员可以删除任何文章，普通用户只能删除自己的
    if not current_user.is_superadmin and post.author_id != current_user.id:
        raise InsufficientPermissionsError("只能删除自己的文章")

    await session.delete(post)
    await session.commit()
    logger.info(f"文章已删除: {post.id} by user {current_user.id}")


async def create_post(
    session: AsyncSession, post_in: PostCreate, author_id: UUID
) -> Post:
    """
    创建文章流水线
    1. 校验分类与板块匹配性
    2. 解析 MDX (Frontmatter, TOC, MathML, Reading Time)
    3. 如果 Frontmatter 中有元数据，优先覆盖请求数据
    4. 生成唯一 Slug
    5. 保存核心数据
    6. 自动同步标签
    """
    # 1. 校验分类与板块逻辑隔离
    if post_in.category_id:
        category = await crud.get_category_by_id(session, post_in.category_id)
        if not category:
            raise CategoryNotFoundError()
        if category.post_type != post_in.post_type:
            raise CategoryTypeMismatchError(
                f"分类 '{category.name}' (类型:{category.post_type}) 与文章类型 '{post_in.post_type}' 不匹配"
            )

    # 2. 解析 MDX 内容
    processor = PostProcessor(post_in.content_mdx).process()

    # 3. 合并元数据与请求数据
    metadata = processor.metadata
    title = metadata.get("title", post_in.title)

    # 4. 处理 Slug
    slug = post_in.slug or metadata.get("slug")
    if not slug:
        slug = await generate_unique_slug(session, title)
    else:
        # 如果手动指定了 slug，也要确保唯一
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
                # excerpt 不再排除，允许用户通过 API 传入
            }
        ),
        title=title,
        slug=slug,
        author_id=author_id,
        content_mdx=processor.content_mdx,
        content_html=processor.content_html,
        toc=processor.toc,
        reading_time=processor.reading_time,
        published_at=datetime.now() if post_in.status == PostStatus.PUBLISHED else None,
    )

    # 处理 excerpt：优先级 用户传入 > MDX frontmatter > 自动生成
    if not db_post.excerpt:  # 如果用户没有通过 API 传入
        db_post.excerpt = metadata.get("excerpt") or processor.excerpt

    # 如果 MDX 里指定了关键词或描述，覆盖它
    if "description" in metadata:
        db_post.meta_description = metadata["description"]
    if "keywords" in metadata:
        db_post.meta_keywords = metadata["keywords"]

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
    logger.info(f"文章创建成功: {db_post.title} (ID: {db_post.id})")
    return db_post


async def update_post(
    session: AsyncSession, post_id: UUID, post_in: PostUpdate, current_user: User
) -> Post:
    """更新文章（带细粒度权限检查）

    Args:
        session: 数据库会话
        post_id: 文章ID
        post_in: 更新数据
        current_user: 当前用户

    Raises:
        PostNotFoundError: 文章不存在
        InsufficientPermissionsError: 权限不足（非作者且非超级管理员）
    """

    db_post = await crud.get_post_by_id(session, post_id)
    if not db_post:
        raise PostNotFoundError()

    # 细粒度权限检查：超级管理员可以修改任何文章，普通用户只能修改自己的
    if not current_user.is_superadmin and db_post.author_id != current_user.id:
        raise InsufficientPermissionsError("只能修改自己的文章")

    update_data = post_in.model_dump(exclude_unset=True)

    # 0. 在更新前保存当前版本作为快照
    await save_post_version(
        session, db_post, commit_message=update_data.get("commit_message")
    )

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

    # 2. 如果更新了内容，重新解析 MDX
    if "content_mdx" in update_data:
        processor = PostProcessor(update_data["content_mdx"]).process()
        db_post.content_mdx = processor.content_mdx
        db_post.content_html = processor.content_html
        db_post.toc = processor.toc
        db_post.reading_time = processor.reading_time
        # 即使 MDX 里没写摘要，如果正文变了且 db 里摘要是自动生成的，也重刷一下
        db_post.excerpt = processor.excerpt or processor.metadata.get(
            "excerpt", db_post.excerpt
        )

        # 同步标签
        if "tags" in processor.metadata:
            await sync_post_tags(session, db_post, processor.metadata["tags"])

    # 3. 处理发布时间
    if update_data.get("status") == PostStatus.PUBLISHED and not db_post.published_at:
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
    logger.info(f"文章更新成功: {db_post.title}")
    return db_post


# ========================================
# Category Service
# ========================================


async def create_category(
    session: AsyncSession, category_in: CategoryCreate, current_user: User
) -> Category:
    """创建分类（仅超级管理员）

    Args:
        session: 数据库会话
        category_in: 分类创建数据
        current_user: 当前用户

    Returns:
        创建的分类对象

    Raises:
        InsufficientPermissionsError: 非超级管理员
        SlugConflictError: Slug 已存在
    """
    # 权限检查：只有超级管理员可以创建分类
    if not current_user.is_superadmin:
        raise InsufficientPermissionsError("只有超级管理员可以创建分类")

    # 检查 slug 是否已存在（同一 post_type 下）
    existing = await crud.get_category_by_slug(
        session, category_in.slug, category_in.post_type
    )
    if existing:
        raise SlugConflictError(
            f"Slug '{category_in.slug}' 在 {category_in.post_type} 板块下已存在"
        )

    # 创建分类
    db_category = Category(**category_in.model_dump())
    db_category = await crud.create_category(session, db_category)
    await session.commit()
    await session.refresh(db_category)

    logger.info(
        f"分类创建成功: {db_category.name} (ID: {db_category.id}) by user {current_user.id}"
    )
    return db_category


async def update_category(
    session: AsyncSession,
    category_id: UUID,
    category_in: CategoryUpdate,
    current_user: User,
    post_type: Optional[PostType] = None,
) -> Category:
    """更新分类（仅超级管理员）

    Args:
        session: 数据库会话
        category_id: 分类ID
        category_in: 更新数据
        current_user: 当前用户
        post_type: 可选的板块类型验证

    Returns:
        更新后的分类对象

    Raises:
        InsufficientPermissionsError: 非超级管理员
        CategoryNotFoundError: 分类不存在
        SlugConflictError: Slug 冲突
    """
    # 权限检查：只有超级管理员可以更新分类
    if not current_user.is_superadmin:
        raise InsufficientPermissionsError("只有超级管理员可以更新分类")

    # 获取分类
    db_category = await crud.get_category_by_id(session, category_id, post_type)
    if not db_category:
        raise CategoryNotFoundError()

    update_data = category_in.model_dump(exclude_unset=True)

    # 如果要更新 slug，检查是否冲突
    if "slug" in update_data and update_data["slug"] != db_category.slug:
        check_post_type = update_data.get("post_type", db_category.post_type)
        existing = await crud.get_category_by_slug(
            session, update_data["slug"], check_post_type
        )
        if existing and existing.id != category_id:
            raise SlugConflictError(
                f"Slug '{update_data['slug']}' 在 {check_post_type} 板块下已存在"
            )

    # 更新分类
    db_category = await crud.update_category(session, db_category, update_data)
    await session.commit()
    await session.refresh(db_category)

    logger.info(f"分类更新成功: {db_category.name} by user {current_user.id}")
    return db_category


async def delete_category(
    session: AsyncSession,
    category_id: UUID,
    current_user: User,
    post_type: Optional[PostType] = None,
) -> None:
    """删除分类（仅超级管理员）

    Args:
        session: 数据库会话
        category_id: 分类ID
        current_user: 当前用户
        post_type: 可选的板块类型验证

    Raises:
        InsufficientPermissionsError: 非超级管理员
        CategoryNotFoundError: 分类不存在
    """
    # 权限检查：只有超级管理员可以删除分类
    if not current_user.is_superadmin:
        raise InsufficientPermissionsError("只有超级管理员可以删除分类")

    # 获取分类
    db_category = await crud.get_category_by_id(session, category_id, post_type)
    if not db_category:
        raise CategoryNotFoundError()

    # 删除分类
    await crud.delete_category(session, db_category)
    await session.commit()

    logger.info(
        f"分类已删除: {db_category.name} (ID: {category_id}) by user {current_user.id}"
    )


# ========================================
# Tag Service (辅助管理功能)
# ========================================


async def update_tag(
    session: AsyncSession, tag_id: UUID, tag_in: TagUpdate, current_user: User
) -> Tag:
    """更新标签（仅超级管理员）

    用于统一标签命名、更新颜色等

    Args:
        session: 数据库会话
        tag_id: 标签ID
        tag_in: 更新数据
        current_user: 当前用户

    Returns:
        更新后的标签对象

    Raises:
        InsufficientPermissionsError: 非超级管理员
        TagNotFoundError: 标签不存在
        SlugConflictError: Slug 冲突
    """
    # 权限检查：只有超级管理员可以更新标签
    if not current_user.is_superadmin:
        raise InsufficientPermissionsError("只有超级管理员可以更新标签")

    # 获取标签
    db_tag = await crud.get_tag_by_id(session, tag_id)
    if not db_tag:
        raise TagNotFoundError()

    update_data = tag_in.model_dump(exclude_unset=True)

    # 如果要更新 slug，检查是否冲突
    if "slug" in update_data and update_data["slug"] != db_tag.slug:
        existing = await crud.get_tag_by_slug(session, update_data["slug"])
        if existing and existing.id != tag_id:
            raise SlugConflictError(f"Slug '{update_data['slug']}' 已存在")

    # 更新标签
    db_tag = await crud.update_tag(session, db_tag, update_data)
    await session.commit()
    await session.refresh(db_tag)

    logger.info(f"标签更新成功: {db_tag.name} by user {current_user.id}")
    return db_tag


async def delete_orphaned_tags(
    session: AsyncSession, current_user: User
) -> tuple[int, list[str]]:
    """删除孤立标签（仅超级管理员）

    删除没有任何文章关联的标签

    Args:
        session: 数据库会话
        current_user: 当前用户

    Returns:
        (deleted_count, deleted_tag_names)

    Raises:
        InsufficientPermissionsError: 非超级管理员
    """
    # 权限检查：只有超级管理员可以删除标签
    if not current_user.is_superadmin:
        raise InsufficientPermissionsError("只有超级管理员可以删除标签")

    # 获取孤立标签
    orphaned_tags = await crud.get_orphaned_tags(session)

    if not orphaned_tags:
        return (0, [])

    # 删除所有孤立标签
    deleted_names = [tag.name for tag in orphaned_tags]
    for tag in orphaned_tags:
        await crud.delete_tag(session, tag)

    await session.commit()

    logger.info(
        f"删除 {len(orphaned_tags)} 个孤立标签: {', '.join(deleted_names)} by user {current_user.id}"
    )
    return (len(orphaned_tags), deleted_names)


async def merge_tags(
    session: AsyncSession,
    source_tag_id: UUID,
    target_tag_id: UUID,
    current_user: User,
) -> Tag:
    """合并标签（仅超级管理员）

    将 source_tag 的所有文章关联转移到 target_tag，然后删除 source_tag
    用于合并重复标签（如 "React.js" 和 "ReactJS"）

    Args:
        session: 数据库会话
        source_tag_id: 源标签ID（将被删除）
        target_tag_id: 目标标签ID（保留）
        current_user: 当前用户

    Returns:
        目标标签对象

    Raises:
        InsufficientPermissionsError: 非超级管理员
        TagNotFoundError: 标签不存在
    """
    # 权限检查：只有超级管理员可以合并标签
    if not current_user.is_superadmin:
        raise InsufficientPermissionsError("只有超级管理员可以合并标签")

    # 验证两个标签是否存在
    source_tag = await crud.get_tag_by_id(session, source_tag_id)
    target_tag = await crud.get_tag_by_id(session, target_tag_id)

    if not source_tag:
        raise TagNotFoundError(f"源标签不存在: {source_tag_id}")
    if not target_tag:
        raise TagNotFoundError(f"目标标签不存在: {target_tag_id}")

    if source_tag_id == target_tag_id:
        raise ValueError("源标签和目标标签不能相同")

    # 执行合并
    source_name = source_tag.name
    result_tag = await crud.merge_tags(session, source_tag_id, target_tag_id)
    await session.commit()
    await session.refresh(result_tag)

    logger.info(
        f"标签合并成功: '{source_name}' → '{result_tag.name}' by user {current_user.id}"
    )
    return result_tag
