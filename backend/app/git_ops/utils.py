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


async def resolve_cover_media_id(
    session, cover_value: str, mdx_file_path: str = None, content_dir: Path = None
) -> Optional[UUID]:
    """根据文件路径、文件名或外部 URL 查询/注入媒体库 ID

    逻辑：
    1. 如果是 UUID 格式，直接尝试查询
    2. 如果是 http(s):// 开头，说明是外部 URL（暂不支持自动下载，仅记录）
    3. 如果是本地相对路径 (如 ./img.png)，尝试自动上传到媒体库
    4. 兜底：尝试在媒体库中搜索同名文件

    Args:
        session: 数据库会话
        cover_value: 封面路径值 (Frontmatter 中的内容)
        mdx_file_path: 当前 MDX 文件的相对路径 (用于解析本地相对路径)
        content_dir: Git 内容根目录

    Returns:
        媒体文件 ID 或 None
    """
    from app.media import crud as media_crud
    from app.media import service as media_service
    from app.users import crud as user_crud

    if not cover_value:
        return None

    # 1. 尝试作为 UUID 解析
    try:
        media_id = UUID(cover_value)
        media = await media_crud.get_media_file(session, media_id)
        if media:
            return media.id
    except ValueError:
        pass

    # 2. 检查是否是外部 URL (TODO: 增强 Media 模型以支持外部链接)
    if cover_value.startswith(("http://", "https://")):
        logger.warning(
            f"Detected external cover URL: {cover_value}. External URLs are not fully supported as Media entities yet."
        )
        # 目前 Media 表主要存储文件，暂不处理引用，返回 None 以保持安全
        return None

    # 3. 尝试本地文件自动上传 (核心 Git-First 逻辑)
    # 如果是以 ./ 开头，或者 mdx_file_path 存在且它不包含 http，我们尝试定位物理文件
    if mdx_file_path and content_dir:
        # 计算图片的绝对路径
        mdx_dir = (content_dir / mdx_file_path).parent
        img_abs_path = (mdx_dir / cover_value).resolve()

        # 确保图片在 content_dir 范围内 (防止路径穿越)
        if (
            img_abs_path.exists()
            and img_abs_path.is_file()
            and str(img_abs_path).startswith(str(content_dir))
        ):
            # 检查数据库里是否已经“上传”过这个原始路径
            # 我们用原始文件名做一次简单匹配，或者未来可以增加一个字段存储 git_source_path
            filename = img_abs_path.name
            media = await media_crud.get_media_file_by_path(
                session, filename
            )  # 简单策略：按文件名

            if not media:
                logger.info(
                    f"🚀 Found local cover image: {cover_value}, attempting auto-upload..."
                )
                try:
                    # 获取一个超级管理员作为上传者
                    admin = await user_crud.get_superuser(session)
                    if not admin:
                        raise Exception("No superadmin found for auto-ingestion")

                    # 读取并上传
                    import asyncio

                    file_content = await asyncio.to_thread(img_abs_path.read_bytes)
                    media = await media_service.create_media_file(
                        file_content=file_content,
                        filename=filename,
                        uploader_id=admin.id,
                        session=session,
                        usage="post_cover",
                        is_public=True,
                        description=f"Auto-uploaded from git: {mdx_file_path}",
                    )
                    logger.info(f"✅ Auto-uploaded cover: {filename} -> {media.id}")
                except Exception as e:
                    logger.error(f"❌ Failed to auto-upload cover {cover_value}: {e}")
                    # 失败了不中断流程

            if media:
                return media.id

    # 4. 兜底策略：尝试精确路径匹配 (针对已存在的 Media 记录)
    media = await media_crud.get_media_file_by_path(session, cover_value)
    if media:
        logger.info(f"通过路径匹配到封面: {cover_value}")
        return media.id

    # 5. 尝试文件名模糊搜索缓存
    filename = Path(cover_value).name
    results = await media_service.search_media_files(session, query=filename, limit=1)

    if results:
        logger.info(f"通过文件名模糊匹配到封面: {filename} -> {results[0].file_path}")
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


async def resolve_tag_ids(session, tag_names: list) -> list[UUID]:
    """根据标签名称查询或创建标签，返回标签 ID 列表

    Args:
        session: 数据库会话
        tag_names: 标签名称列表

    Returns:
        标签 ID 列表
    """
    from app.posts import crud as posts_crud
    from slugify import slugify as python_slugify

    if not tag_names:
        return []

    tag_ids = []

    for tag_name in tag_names:
        tag_name = tag_name.strip()
        if not tag_name:
            continue

        # 使用 get_or_create_tag 获取或创建标签
        tag_slug = python_slugify(tag_name)
        tag = await posts_crud.get_or_create_tag(session, tag_name, tag_slug)
        logger.info(f"标签已处理: {tag_name} -> {tag.id}")
        tag_ids.append(tag.id)

    return tag_ids


async def handle_post_update(
    session,
    matched_post,
    scanned,
    file_path: str,
    is_move: bool,
    mapper,
    operating_user,
    content_dir,
    stats,
    processed_post_ids: set,
    force_write: bool = False,
):
    """处理文章更新或移动"""
    from app.posts import service as post_service
    from app.posts.schema import PostUpdate

    update_dict = await mapper.map_to_post(scanned)
    update_dict.pop("slug", None)
    update_dict.pop("tag_ids", None)

    if is_move:
        update_dict["source_path"] = file_path

    post_in = PostUpdate(**update_dict)
    updated_post = await post_service.update_post(
        session, matched_post.id, post_in, current_user=operating_user
    )
    await session.refresh(updated_post)

    # 如果 force_write 为 True，则传入 old_post=None，强制写入所有字段
    old_post_arg = None if force_write else matched_post
    await write_post_ids_to_frontmatter(
        content_dir, file_path, updated_post, old_post_arg, stats
    )

    processed_post_ids.add(matched_post.id)
    stats.updated.append(file_path)

    return updated_post


async def handle_post_create(
    session,
    scanned,
    file_path: str,
    mapper,
    operating_user,
    content_dir,
    stats,
    processed_post_ids: set,
):
    """处理文章创建"""
    from app.posts import service as post_service
    from app.posts.schema import PostCreate
    from app.posts.utils import generate_slug_with_random_suffix

    create_dict = await mapper.map_to_post(scanned)
    create_dict["source_path"] = file_path

    if not create_dict.get("slug"):
        create_dict["slug"] = generate_slug_with_random_suffix(Path(file_path).stem)

    create_dict.pop("tag_ids", None)

    post_in = PostCreate(**create_dict)
    created_post = await post_service.create_post(
        session, post_in, author_id=create_dict["author_id"]
    )

    await write_post_ids_to_frontmatter(
        content_dir, file_path, created_post, None, stats
    )

    processed_post_ids.add(created_post.id)
    stats.added.append(file_path)

    return created_post


async def validate_post_for_resync(session, content_dir, post_id):
    """验证 Post 是否可以 resync

    Args:
        session: 数据库会话
        content_dir: 内容目录
        post_id: 文章 ID

    Returns:
        Post 对象

    Raises:
        GitOpsSyncError: 如果验证失败
    """
    from app.posts import crud as posts_crud

    post = await posts_crud.get_post_by_id(session, post_id)
    if not post:
        raise GitOpsSyncError(
            f"Post not found: {post_id}",
            detail="Cannot resync metadata for non-existent post",
        )

    if not post.source_path:
        raise GitOpsSyncError(
            f"Post {post_id} has no source_path",
            detail="Only posts synced from Git can resync metadata",
        )

    file_path = content_dir / post.source_path
    if not file_path.exists():
        raise GitOpsSyncError(
            f"Source file not found: {post.source_path}",
            detail="The MDX file may have been deleted or moved",
        )

    return post
