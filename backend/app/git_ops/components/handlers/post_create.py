import logging
from pathlib import Path

from app.git_ops.components.writer.file_operator import write_post_ids_to_frontmatter

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
    from app.posts import service as post_service
    from app.posts.schema import PostCreate
    from app.posts.utils import generate_slug_with_random_suffix

    create_dict = await serializer.from_frontmatter(scanned)
    create_dict["source_path"] = file_path

    if not create_dict.get("slug"):
        create_dict["slug"] = generate_slug_with_random_suffix(Path(file_path).stem)

    create_dict.pop("tag_ids", None)

    post_in = PostCreate(**create_dict)
    created_post = await post_service.create_post(
        session,
        post_in,
        author_id=create_dict["author_id"],
        source_path=file_path,
    )

    await write_post_ids_to_frontmatter(
        content_dir, file_path, created_post, None, stats
    )

    processed_post_ids.add(created_post.id)
    stats.added.append(file_path)

    return created_post
