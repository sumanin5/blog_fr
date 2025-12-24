#!/usr/bin/env python3
"""
测试缩略图命名是否正确
"""

from pathlib import Path
from uuid import uuid4

from backend.app.media.utils import generate_thumbnail_path


def test_thumbnail_naming():
    """测试缩略图命名逻辑"""

    # 模拟原始文件路径
    original_path = "uploads/2025/12/24_121337_1c16cdf6500844a.png"
    user_id = uuid4()

    # 生成各种尺寸的缩略图路径
    sizes = ["small", "medium", "large", "xlarge"]

    print("原始文件路径:", original_path)
    print("原始文件名（不含扩展名）:", Path(original_path).stem)
    print()

    for size in sizes:
        thumbnail_path = generate_thumbnail_path(user_id, size, original_path)
        print(f"{size} 缩略图路径: {thumbnail_path}")

        # 验证缩略图文件名
        thumbnail_filename = Path(thumbnail_path).name
        expected_filename = f"{size}_{Path(original_path).stem}.webp"

        print(f"  实际文件名: {thumbnail_filename}")
        print(f"  期望文件名: {expected_filename}")
        print(f"  匹配: {'✓' if thumbnail_filename == expected_filename else '✗'}")
        print()


if __name__ == "__main__":
    test_thumbnail_naming()
