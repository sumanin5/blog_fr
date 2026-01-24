#!/usr/bin/env python3
"""
MDX 测试脚本

通过 API 创建测试文章，验证完整的 MDX 处理流程
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

# 确保所有模型都被导入（解决 SQLAlchemy 关系引用问题）
from app.core.db import AsyncSessionLocal
from app.media.model import MediaFile  # noqa: F401
from app.posts.model import Category, Post, PostStatus, PostType, Tag  # noqa: F401
from app.posts.schemas import PostCreate
from app.posts.services import create_post
from app.users.crud import get_user_by_username
from app.users.model import User  # noqa: F401


async def create_test_post():
    """创建测试文章"""

    # 读取 MDX 文件
    mdx_file = Path(__file__).parent.parent / "demo" / "test-post.mdx"
    if not mdx_file.exists():
        print(f"❌ MDX 文件不存在: {mdx_file}")
        return

    mdx_content = mdx_file.read_text(encoding="utf-8")
    print(f"✅ 读取 MDX 文件: {mdx_file}")
    print(f"📄 内容长度: {len(mdx_content)} 字符\n")

    async with AsyncSessionLocal() as session:
        # 获取管理员用户
        admin = await get_user_by_username(session, "admin")
        if not admin:
            print("❌ 管理员用户不存在，请先运行初始化脚本")
            return

        print(f"✅ 找到管理员用户: {admin.username} (ID: {admin.id})\n")

        # 创建文章
        post_data = PostCreate(
            title="MDX 功能完整测试",  # 会被 Frontmatter 覆盖
            content_mdx=mdx_content,
            post_type=PostType.ARTICLE,
            status=PostStatus.PUBLISHED,
        )

        print("🔄 开始处理 MDX...")
        post = await create_post(session, post_data, admin.id)

        print("\n" + "=" * 60)
        print("✅ 文章创建成功！")
        print("=" * 60)
        print(f"📝 标题: {post.title}")
        print(f"🔗 Slug: {post.slug}")
        print(f"📊 状态: {post.status}")
        print(f"⏱️  阅读时间: {post.reading_time} 分钟")
        print(f"📄 摘要: {post.excerpt[:100]}...")
        print(f"🏷️  标签: {', '.join([tag.name for tag in post.tags])}")
        print(f"📑 目录项数: {len(post.toc)}")
        print(f"📏 MDX 长度: {len(post.content_mdx)} 字符")
        if post.content_ast:
            print(f"📏 AST 节点数: {len(post.content_ast.get('children', []))} 个")
        print("\n📑 目录结构:")
        for item in post.toc[:5]:  # 只显示前5个
            indent = "  " * (item["level"] - 1)
            print(f"{indent}- {item['title']} (#{item['id']})")
        if len(post.toc) > 5:
            print(f"  ... 还有 {len(post.toc) - 5} 个标题")

        print("\n🔗 访问链接:")
        print(f"   前端: http://localhost:3000/posts/{post.slug}")
        print(f"   API:  http://localhost:8000/api/v1/posts/article/{post.id}")
        print("\n" + "=" * 60)


if __name__ == "__main__":
    print("🚀 MDX 测试脚本")
    print("=" * 60 + "\n")
    asyncio.run(create_test_post())
