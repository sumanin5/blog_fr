"""
标签管理接口测试

测试内容：
- 标签的查询
- 标签的辅助管理（更新、清理、合并）
- 权限控制（只有超级管理员可以管理标签）
"""

import pytest
from app.posts.model import Post
from fastapi import status
from httpx import AsyncClient
from tests.api.conftest import APIConfig
from tests.api.posts.conftest import assert_tag_response

# ============================================================
# 标签列表查询测试（公开接口）
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_get_tags_list(
    async_client: AsyncClient,
    multiple_tags: list,
    post_with_tags: Post,  # 确保标签关联到文章，否则查不出来
    api_urls: APIConfig,
):
    """测试获取标签列表（公开接口，无需登录）"""
    response = await async_client.get(f"{api_urls.API_PREFIX}/posts/article/tags")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    items = data["items"]
    assert isinstance(items, list)
    assert len(items) >= 3

    # 验证每个标签的格式
    for tag in items:
        assert_tag_response(tag)


# ============================================================
# 标签更新测试（需要超级管理员权限）
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_update_tag_success(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    test_tag,
    api_urls: APIConfig,
):
    """测试超级管理员更新标签"""
    update_data = {
        "name": "Python3",
        "color": "#FF0000",
        "description": "Python 编程语言",
    }

    response = await async_client.patch(
        f"{api_urls.API_PREFIX}/posts/admin/tags/{test_tag.id}",
        json=update_data,
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == "Python3"
    assert data["color"] == "#FF0000"
    assert data["description"] == "Python 编程语言"


@pytest.mark.asyncio
@pytest.mark.posts
async def test_update_tag_as_normal_user(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    test_tag,
    api_urls: APIConfig,
):
    """测试普通用户更新标签（应该失败）"""
    update_data = {"name": "尝试更新"}

    response = await async_client.patch(
        f"{api_urls.API_PREFIX}/posts/admin/tags/{test_tag.id}",
        json=update_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
@pytest.mark.posts
async def test_update_tag_as_admin(
    async_client: AsyncClient,
    admin_user_token_headers: dict,
    test_tag,
    api_urls: APIConfig,
):
    """测试普通管理员更新标签（应该失败）"""
    update_data = {"name": "尝试更新"}

    response = await async_client.patch(
        f"{api_urls.API_PREFIX}/posts/admin/tags/{test_tag.id}",
        json=update_data,
        headers=admin_user_token_headers,
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
@pytest.mark.posts
async def test_update_nonexistent_tag(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试更新不存在的标签"""
    from uuid import uuid4

    update_data = {"name": "更新"}

    response = await async_client.patch(
        f"{api_urls.API_PREFIX}/posts/admin/tags/{uuid4()}",
        json=update_data,
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


# ============================================================
# 清理孤立标签测试（需要超级管理员权限）
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_delete_orphaned_tags_success(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    api_urls: APIConfig,
    session,
):
    """测试超级管理员删除孤立标签"""
    # 创建几个孤立标签（没有关联任何文章）
    from app.posts.model import Tag

    orphaned_tags = []
    for i in range(3):
        tag = Tag(name=f"孤立标签{i}", slug=f"orphan-{i}")
        session.add(tag)
        orphaned_tags.append(tag)

    await session.commit()

    response = await async_client.delete(
        f"{api_urls.API_PREFIX}/posts/admin/tags/orphaned",
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["deleted_count"] >= 3
    assert "deleted_tags" in data
    assert len(data["deleted_tags"]) >= 3


@pytest.mark.asyncio
@pytest.mark.posts
async def test_delete_orphaned_tags_as_normal_user(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试普通用户删除孤立标签（应该失败）"""
    response = await async_client.delete(
        f"{api_urls.API_PREFIX}/posts/admin/tags/orphaned",
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


# ============================================================
# 合并标签测试（需要超级管理员权限）
# ============================================================


@pytest.mark.asyncio
@pytest.mark.posts
async def test_merge_tags_success(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    api_urls: APIConfig,
    session,
    post_with_tags,
):
    """测试超级管理员合并标签"""
    from app.posts.model import Tag

    # 创建一个新标签作为源标签
    source_tag = Tag(name="React.js", slug="reactjs")
    session.add(source_tag)
    await session.commit()
    await session.refresh(source_tag)

    # 关联到文章
    post_with_tags.tags.append(source_tag)
    await session.commit()

    # 找到目标标签（React）
    target_tag = next(t for t in post_with_tags.tags if t.name == "React")

    # 合并标签
    merge_data = {
        "source_tag_id": str(source_tag.id),
        "target_tag_id": str(target_tag.id),
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/admin/tags/merge",
        json=merge_data,
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert_tag_response(data)
    assert data["id"] == str(target_tag.id)


@pytest.mark.asyncio
@pytest.mark.posts
async def test_merge_tags_as_normal_user(
    async_client: AsyncClient,
    normal_user_token_headers: dict,
    multiple_tags: list,
    api_urls: APIConfig,
):
    """测试普通用户合并标签（应该失败）"""
    merge_data = {
        "source_tag_id": str(multiple_tags[0].id),
        "target_tag_id": str(multiple_tags[1].id),
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/admin/tags/merge",
        json=merge_data,
        headers=normal_user_token_headers,
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
@pytest.mark.posts
async def test_merge_nonexistent_tags(
    async_client: AsyncClient,
    superadmin_user_token_headers: dict,
    api_urls: APIConfig,
):
    """测试合并不存在的标签"""
    from uuid import uuid4

    merge_data = {
        "source_tag_id": str(uuid4()),
        "target_tag_id": str(uuid4()),
    }

    response = await async_client.post(
        f"{api_urls.API_PREFIX}/posts/admin/tags/merge",
        json=merge_data,
        headers=superadmin_user_token_headers,
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND
