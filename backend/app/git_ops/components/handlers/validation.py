from app.git_ops.exceptions import GitOpsSyncError


async def validate_post_for_resync(session, content_dir, post_id):
    """验证 Post 是否可以 resync"""
    from app.posts import crud as posts_crud

    post = await posts_crud.get_post_by_id(session, post_id)
    if not post:
        raise GitOpsSyncError(f"Post not found: {post_id}")

    if not post.source_path:
        raise GitOpsSyncError(f"Post {post_id} has no source_path")

    file_path = content_dir / post.source_path
    if not file_path.exists():
        raise GitOpsSyncError(f"Source file not found: {post.source_path}")

    return post
