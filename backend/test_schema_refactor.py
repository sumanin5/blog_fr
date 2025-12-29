"""
临时测试脚本：验证 Schema 重构后的 @computed_field 是否工作正常
运行方式: python test_schema_refactor.py
"""

import uuid
from datetime import datetime


# 模拟 MediaFile 模型
class MockMediaFile:
    def __init__(self):
        self.id = uuid.uuid4()
        self.original_filename = "test.jpg"
        self.file_path = "uploads/user123/test.jpg"
        self.file_size = 1024000
        self.mime_type = "image/jpeg"
        self.media_type = "image"
        self.usage = "general"
        self.description = "测试图片"
        self.alt_text = "测试"
        self.tags = ["test"]
        self.width = 1920
        self.height = 1080
        self.duration = None
        self.is_processing = False
        self.view_count = 0
        self.download_count = 0
        self.uploader_id = uuid.uuid4()
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.thumbnails = {
            "small": "uploads/user123/thumb_small_test.jpg",
            "medium": "uploads/user123/thumb_medium_test.jpg",
        }


def test_computed_fields():
    """测试计算字段是否正常工作"""
    print("🧪 测试开始：验证 @computed_field 重构...")

    # 导入 Schema
    from app.media.schema import MediaFileResponse

    # 创建模拟对象
    mock_file = MockMediaFile()

    # 使用 model_validate 转换
    print("\n📝 步骤 1：使用 model_validate 转换...")
    response = MediaFileResponse.model_validate(mock_file)

    # 验证计算字段
    print("\n✅ 步骤 2：验证计算字段...")

    # 检查 file_url
    assert hasattr(response, "file_url"), "❌ file_url 字段不存在！"
    assert response.file_url.startswith("http"), "❌ file_url 格式错误！"
    print(f"   ✓ file_url: {response.file_url}")

    # 检查 thumbnails
    assert hasattr(response, "thumbnails"), "❌ thumbnails 字段不存在！"
    assert response.thumbnails is not None, "❌ thumbnails 为空！"
    assert "small" in response.thumbnails, "❌ thumbnails 缺少 small 尺寸！"
    assert response.thumbnails["small"].startswith("http"), (
        "❌ thumbnails URL 格式错误！"
    )
    print(f"   ✓ thumbnails: {response.thumbnails}")

    # 验证 JSON 序列化
    print("\n✅ 步骤 3：验证 JSON 序列化...")
    json_data = response.model_dump()
    assert "file_url" in json_data, "❌ JSON 中缺少 file_url！"
    assert "thumbnails" in json_data, "❌ JSON 中缺少 thumbnails！"
    print("   ✓ JSON 序列化成功")

    print("\n🎉 所有测试通过！@computed_field 重构成功！\n")
    return True


if __name__ == "__main__":
    try:
        test_computed_fields()
    except Exception as e:
        print(f"\n❌ 测试失败: {e}\n")
        import traceback

        traceback.print_exc()
