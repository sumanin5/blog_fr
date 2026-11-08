import logging
from hashlib import sha256
from pathlib import Path

from slugify import slugify

logger = logging.getLogger(__name__)


async def handle_post_create(
    session,
    scanned,
    file_path: str,
    serializer,
    operating_user,
    content_dir,
    stats,
    processed_post_ids: set,
):
    """处理文章创建"""
    from app.posts import services as post_service
    from app.posts.schemas import PostCreate

    create_dict = await serializer.from_frontmatter(scanned)
    file_path = Path(file_path).as_posix()
    create_dict["source_path"] = file_path

    if not create_dict.get("slug"):
        # 不再回写随机 slug；同一源文件在重建数据库时仍得到相同的地址。
        source_path = Path(file_path).as_posix()
        suffix = sha256(source_path.encode("utf-8")).hexdigest()[:8]
        create_dict["slug"] = f"{slugify(Path(file_path).stem) or 'post'}-{suffix}"

    create_dict.pop("tag_ids", None)
    create_dict.pop("git_hash", None)
    create_dict.pop("commit_message", None)

    post_in = PostCreate(**create_dict)
    created_post = await post_service.create_post(
        session,
        post_in,
        author_id=create_dict["author_id"],
        preserve_slug=True,
        source_path=file_path,
    )

    processed_post_ids.add(created_post.id)
    stats.added.append(file_path)

    return created_post
