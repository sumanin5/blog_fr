import logging
from uuid import UUID

from app.git_ops.exceptions import GitOpsSyncError

logger = logging.getLogger(__name__)


async def resolve_author_id(session, author_value: str) -> UUID:
    """根据用户名或 UUID 查询作者 ID"""
    from app.users import crud as user_crud

    if not author_value:
        raise GitOpsSyncError("Author value is empty")

    try:
        user_id = UUID(author_value)
        user = await user_crud.get_user_by_id(session, user_id)
        if user:
            return user.id
    except ValueError:
        pass

    user = await user_crud.get_user_by_username(session, author_value)
    if user:
        return user.id

    raise GitOpsSyncError(f"Author not found: {author_value}")
