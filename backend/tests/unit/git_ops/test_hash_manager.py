"""
单元测试：HashManager
"""

import pytest
from app.git_ops.components.hash_manager import LAST_SYNC_FILE, HashManager


@pytest.mark.unit
def test_hash_manager_get_last_hash(mock_git_client, tmp_path):
    """测试读取上次同步的 hash"""
    hash_val = "abc123456"
    (tmp_path / LAST_SYNC_FILE).write_text(hash_val)

    manager = HashManager(tmp_path, mock_git_client)
    assert manager.get_last_hash() == hash_val


@pytest.mark.unit
def test_hash_manager_get_last_hash_none(mock_git_client, tmp_path):
    """测试读取不存在的 hash"""
    manager = HashManager(tmp_path, mock_git_client)
    assert manager.get_last_hash() is None


@pytest.mark.unit
@pytest.mark.asyncio
async def test_hash_manager_save_current_hash(mock_git_client, tmp_path):
    """测试保存当前 hash"""
    current_hash = "new_hash_999"
    mock_git_client.get_current_hash.return_value = current_hash

    manager = HashManager(tmp_path, mock_git_client)
    saved_hash = await manager.save_current_hash()

    assert saved_hash == current_hash
    assert (tmp_path / LAST_SYNC_FILE).read_text().strip() == current_hash


@pytest.mark.unit
@pytest.mark.asyncio
async def test_hash_manager_has_new_commits(mock_git_client, tmp_path):
    """测试检查新 commit"""
    # 场景 1：无记录
    manager = HashManager(tmp_path, mock_git_client)
    assert await manager.has_new_commits() is True

    # 场景 2：有记录但相同
    hash_val = "same_hash"
    (tmp_path / LAST_SYNC_FILE).write_text(hash_val)
    mock_git_client.get_current_hash.return_value = hash_val
    assert await manager.has_new_commits() is False

    # 场景 3：有记录且不同
    mock_git_client.get_current_hash.return_value = "different_hash"
    assert await manager.has_new_commits() is True


@pytest.mark.unit
@pytest.mark.asyncio
async def test_hash_manager_get_changed_files(mock_git_client, tmp_path):
    """测试获取变更文件列表"""
    hash_val = "base_hash"
    (tmp_path / LAST_SYNC_FILE).write_text(hash_val)
    mock_git_client.get_changed_files_with_status.return_value = [("M", "file.md")]

    manager = HashManager(tmp_path, mock_git_client)
    changed = await manager.get_changed_files_since_last_sync()

    assert changed == [("M", "file.md")]
    mock_git_client.get_changed_files_with_status.assert_called_with(hash_val)
