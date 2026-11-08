import logging
from pathlib import Path


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
    # 源文件不能决定数据库身份字段；这些字段只允许同步器维护。
    update_dict.pop("slug", None)
    update_dict.pop("tag_ids", None)
    update_dict.pop("source_path", None)
    update_dict.pop("git_hash", None)
    # 每次都写回规范化后的源路径，顺带修复历史 Windows 反斜杠数据。
    update_dict["source_path"] = file_path.as_posix()

    post_in = PostUpdate(**update_dict)
    updated_post = await post_service.update_post(
        session,
        matched_post.id,
        post_in,
        current_user=operating_user,
        source_path=file_path.as_posix(),
    )

    processed_post_ids.add(matched_post.id)
    stats.updated.append(file_path.as_posix())

    return updated_post
