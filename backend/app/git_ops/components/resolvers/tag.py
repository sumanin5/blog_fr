import logging
from typing import List
from uuid import UUID

logger = logging.getLogger(__name__)


async def resolve_tag_ids(
    session, tag_names: List[str], auto_create: bool = True
) -> List[UUID]:
    """根据标签名称查询或创建标签"""
    from app.posts import crud as posts_crud
    from slugify import slugify as python_slugify

    if not tag_names:
        return []

    tag_ids = []
    for tag_name in tag_names:
        tag_name = tag_name.strip()
        if not tag_name:
            continue

        tag_slug = python_slugify(tag_name)

        if auto_create:
            tag = await posts_crud.get_or_create_tag(session, tag_name, tag_slug)
            tag_ids.append(tag.id)
        else:
            # 只查询，不创建
            tag = await posts_crud.get_tag_by_slug(session, tag_slug)
            if tag:
                tag_ids.append(tag.id)
            else:
                # Dry run 且 tag 不存在，我们暂时忽略它或者返回 None (但返回值签名是 UUID)
                # 如果返回 None，这会中断。
                # 在 diff 场景下，如果我们想表示 "将要关联一个新 tag"，但我们在 dry run 无法拿到它的 ID。
                # 这确实是个问题。但在 GitOps 预览中，通常 tag 差异比较难精确展示 ID 变更。
                # 我们可能只需要展示 tag names 的差异。
                # 但 mapper 返回的是 dict，用于比较。
                pass

    return tag_ids
