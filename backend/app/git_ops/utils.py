import logging
from pathlib import Path
from typing import Optional
from uuid import UUID

import httpx
from app.git_ops.exceptions import GitOpsSyncError, WebhookSignatureError

logger = logging.getLogger(__name__)


def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    验证 GitHub Webhook 签名。

    Args:
        payload: 请求体（原始字节）
        signature: GitHub 发来的签名（格式：sha256=xxx）
        secret: Webhook secret（从环境变量读取）

    Returns:
        True 如果签名有效

    Raises:
        WebhookSignatureError: 如果签名无效或缺失
    """
    import hashlib
    import hmac

    if not secret:
        logger.warning(
            "⚠️ WEBHOOK_SECRET not configured. "
            "All webhook requests will be rejected for security."
        )
        raise WebhookSignatureError("Webhook secret not configured")

    if not signature:
        logger.warning("Missing X-Hub-Signature-256 header")
        raise WebhookSignatureError("Missing X-Hub-Signature-256 header")

    # 用 secret 和 payload 生成预期的签名
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    expected_signature = f"sha256={expected}"

    # 使用 compare_digest 防止时序攻击
    is_valid = hmac.compare_digest(expected_signature, signature)

    if not is_valid:
        logger.warning(
            f"Invalid webhook signature. Expected: {expected_signature[:20]}..., Got: {signature[:20]}..."
        )
        raise WebhookSignatureError("Invalid webhook signature")

    return True


async def update_frontmatter_metadata(
    content_dir, file_path: str, metadata: dict, stats
):
    """将元数据写回到 MDX 文件的 frontmatter

    支持更新多个字段：slug、author_id、cover_media_id、category_id 等

    Args:
        content_dir: 内容目录路径
        file_path: 相对于 content_dir 的文件路径
        metadata: 要更新的元数据字典 {key: value, ...}
        stats: 同步统计对象（用于记录错误）

    Returns:
        True 如果成功，False 如果失败
    """

    import frontmatter
    from app.git_ops.error_handler import handle_sync_error

    full_path = content_dir / file_path

    try:
        # 读取文件
        with open(full_path, "r", encoding="utf-8") as f:
            post = frontmatter.load(f)

        # 更新所有元数据
        for key, value in metadata.items():
            if value is not None:
                post.metadata[key] = str(value)
            else:
                # 如果值为 None，删除该字段
                post.metadata.pop(key, None)

        # 写回文件
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(frontmatter.dumps(post))

        logger.info(f"Updated frontmatter metadata: {file_path} -> {metadata}")
        return True
    except Exception as e:
        # 写回失败不应该中断同步流程，只记录警告
        handle_sync_error(
            stats,
            file_path=file_path,
            error_msg=f"Failed to update frontmatter: {str(e)}",
            is_critical=False,
        )
        return False


async def revalidate_nextjs_cache(frontend_url: str, revalidate_secret: str):
    """失效 Next.js 缓存

    在 Git 同步完成后调用，通知 Next.js 失效缓存，
    确保用户立即看到最新的文章内容。

    Args:
        frontend_url: Next.js 前端 URL
        revalidate_secret: 缓存失效密钥

    Returns:
        True 如果成功，False 如果失败

    Raises:
        无异常，失败时只记录警告
    """
    if not frontend_url or not revalidate_secret:
        logger.warning(
            "⚠️ FRONTEND_URL or REVALIDATE_SECRET not configured, "
            "skipping Next.js cache revalidation"
        )
        return False

    try:
        # 调用 Next.js API 失效缓存
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
                data = response.json()
                logger.info(f"✅ Next.js cache revalidated successfully: {data}")
                return True
            else:
                logger.warning(
                    f"❌ Failed to revalidate Next.js cache: "
                    f"{response.status_code} {response.text}"
                )
                return False
    except Exception as e:
        logger.warning(f"❌ Error revalidating Next.js cache: {e}")
        return False


async def write_post_ids_to_frontmatter(
    content_dir, file_path: str, post, old_post, stats
):
    """将文章的 ID 写回到 frontmatter

    用于"回签计划"：在创建或更新文章后，将生成的 ID 写回到 MDX 文件，
    这样下次同步时可以直接用 ID 查询，无需复杂的名字/路径匹配。

    Args:
        content_dir: 内容目录路径
        file_path: 相对于 content_dir 的文件路径
        post: 新创建或更新后的 Post 对象
        old_post: 旧的 Post 对象（如果是更新），用于检测变化；如果是创建则为 None
        stats: 同步统计对象（用于记录错误）

    Returns:
        True 如果成功，False 如果失败
    """
    # 确定需要更新的字段
    metadata_to_update = {
        "slug": post.slug,
        "author_id": str(post.author_id),
        "cover_media_id": str(post.cover_media_id) if post.cover_media_id else None,
        "category_id": str(post.category_id) if post.category_id else None,
    }

    # 如果是更新操作，只更新有变化的字段
    if old_post:
        metadata_to_update = {
            k: v
            for k, v in metadata_to_update.items()
            if (
                k == "slug"
                and v != old_post.slug
                or k == "author_id"
                and v != str(old_post.author_id)
                or k == "cover_media_id"
                and v
                != (str(old_post.cover_media_id) if old_post.cover_media_id else None)
                or k == "category_id"
                and v != (str(old_post.category_id) if old_post.category_id else None)
            )
        }

        # 如果没有变化，直接返回
        if not metadata_to_update:
            return True

    # 写回到文件
    return await update_frontmatter_metadata(
        content_dir, file_path, metadata_to_update, stats
    )


async def resolve_author_id(session, author_value: str) -> UUID:
    """根据用户名查询作者 ID

    Args:
        session: 数据库会话
        author_value: 用户名或 UUID

    Returns:
        用户 ID

    Raises:
        GitOpsSyncError: 如果作者不存在
    """
    from app.users import crud as user_crud

    if not author_value:
        raise GitOpsSyncError(
            "Author value is empty", detail="Author field cannot be empty"
        )

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
        logger.info(f"通过用户名匹配到作者: {author_value} -> {user.id}")
        return user.id

    # 未找到用户
    raise GitOpsSyncError(
        f"Author not found: {author_value}",
        detail=f"User '{author_value}' does not exist in database",
    )


async def resolve_cover_media_id(session, cover_value: str) -> Optional[UUID]:
    """根据文件路径或文件名查询媒体库 ID

    Args:
        session: 数据库会话
        cover_value: 文件路径或文件名

    Returns:
        媒体文件 ID 或 None
    """
    from app.media import crud as media_crud
    from app.media import service as media_service

    if not cover_value:
        return None

    # 1. 尝试精确路径匹配
    media = await media_crud.get_media_file_by_path(session, cover_value)
    if media:
        logger.info(f"通过路径匹配到封面: {cover_value}")
        return media.id

    # 2. 尝试文件名模糊搜索
    filename = Path(cover_value).name
    results = await media_service.search_media_files(session, query=filename, limit=10)

    if results:
        # 优先返回精确文件名匹配的
        for media in results:
            if media.original_filename == filename:
                logger.info(f"通过文件名匹配到封面: {filename} -> {media.file_path}")
                return media.id

        # 如果没有精确匹配，返回第一个搜索结果
        logger.warning(
            f"文件名 '{filename}' 有多个匹配，使用第一个: {results[0].file_path}"
        )
        return results[0].id

    logger.warning(f"未找到封面图: {cover_value}")
    return None


async def resolve_category_id(
    session,
    category_value: Optional[str],
    post_type: str,
    auto_create: bool = True,
    default_slug: str = "uncategorized",
) -> Optional[UUID]:
    """根据 slug 查询或创建分类

    Args:
        session: 数据库会话
        category_value: 分类 Slug
        post_type: 文章类型
        auto_create: 是否自动创建
        default_slug: 默认分类 Slug

    Returns:
        分类 ID 或 None
    """
    from app.posts import crud as posts_crud
    from app.posts.model import Category

    if not category_value:
        category_value = default_slug

    if hasattr(post_type, "value"):
        post_type = post_type.value

    # 1. 尝试查询现有分类
    category = await posts_crud.get_category_by_slug_and_type(
        session, category_value, post_type
    )

    if category:
        logger.info(f"通过 slug 匹配到分类: {category_value}")
        return category.id

    # 2. 如果不存在且允许自动创建
    if auto_create and category_value != default_slug:
        logger.info(f"Creating new category: {category_value} (type={post_type})")
        name = category_value.replace("-", " ").title()
        new_category = Category(
            name=name,
            slug=category_value,
            post_type=post_type,
            description=f"Auto generated from folder {category_value}",
        )
        session.add(new_category)
        await session.commit()
        await session.refresh(new_category)
        return new_category.id

    # 3. 尝试默认分类
    if category_value != default_slug:
        return await resolve_category_id(
            session, default_slug, post_type, auto_create, default_slug
        )

    # 4. 默认分类也不存在，尝试创建
    logger.warning(
        f"Default category '{default_slug}' not found for type '{post_type}'. Creating it."
    )
    default_cat = Category(
        name=default_slug.title(),
        slug=default_slug,
        post_type=post_type,
        description="Default Category",
    )
    session.add(default_cat)
    await session.commit()
    await session.refresh(default_cat)
    return default_cat.id
