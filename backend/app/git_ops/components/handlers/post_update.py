import logging
from pathlib import Path

from app.git_ops.components.writer.file_operator import write_post_ids_to_frontmatter

logger = logging.getLogger(__name__)


async def handle_post_update(
    session,
    matched_post,
    scanned,
    file_path: Path,
    is_move: bool,
    serializer,
    operating_user,
    content_dir,
    stats,
    processed_post_ids: set,
    force_write: bool = False,
):
    """处理文章更新或移动"""
    from app.posts import services as post_service
    from app.posts.schemas import PostUpdate

    update_dict = await serializer.from_frontmatter(scanned)
    update_dict.pop("slug", None)
    update_dict.pop("tag_ids", None)

    if is_move:
        update_dict["source_path"] = file_path

    post_in = PostUpdate(**update_dict)
    updated_post = await post_service.update_post(
        session,
        matched_post.id,
        post_in,
        current_user=operating_user,
        source_path=file_path.as_posix(),
    )
    # 预加载所有关系，避免在 write_post_ids_to_frontmatter 中懒加载
    await session.refresh(updated_post, ["tags", "category", "author", "cover_media"])

    old_post_arg = None if force_write else matched_post
    await write_post_ids_to_frontmatter(
        content_dir, file_path, updated_post, old_post_arg, stats
    )

    processed_post_ids.add(matched_post.id)
    stats.updated.append(file_path)

    return updated_post
