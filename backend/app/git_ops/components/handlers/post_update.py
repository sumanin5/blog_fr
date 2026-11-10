import logging
from pathlib import Path


logger = logging.getLogger(__name__)


async def _persisted_state(session, post_id) -> dict:
    """文章在数据库中的实际状态（不含 updated_at），用于判断一次更新是否真的改变了数据

    直接查询表而不读取 ORM 属性：避免过期对象触发异步懒加载。
    """
    from app.posts.model import Post, PostTagLink
    from sqlalchemy import select

    post_table = Post.__table__
    link_table = PostTagLink.__table__
    row = (
        (await session.execute(select(post_table).where(post_table.c.id == post_id)))
        .mappings()
        .one()
    )
    state = {key: value for key, value in row.items() if key != "updated_at"}
    tag_ids = (
        await session.execute(
            select(link_table.c.tag_id).where(link_table.c.post_id == post_id)
        )
    ).scalars()
    state["tag_ids"] = sorted(str(tag_id) for tag_id in tag_ids)
    return state


def _read_bytes(path: Path) -> bytes | None:
    return path.read_bytes() if path.exists() else None


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

    full_path = file_path if file_path.is_absolute() else content_dir / file_path
    state_before = await _persisted_state(session, matched_post.id)
    file_before = _read_bytes(full_path)

    post_in = PostUpdate(**update_dict)
    updated_post = await post_service.update_post(
        session,
        matched_post.id,
        post_in,
        current_user=operating_user,
        source_path=file_path.as_posix(),
    )

    processed_post_ids.add(matched_post.id)
    # 失败重试会重放已成功的文件：只有数据库或磁盘确实变化才计入 updated，
    # 否则每次同步都会触发无意义的缓存刷新。
    changed = (
        await _persisted_state(session, matched_post.id) != state_before
        or _read_bytes(full_path) != file_before
    )
    if changed:
        stats.updated.append(file_path.as_posix())
    else:
        logger.debug(f"No effective change for {file_path}, not counted as updated")

    return updated_post
