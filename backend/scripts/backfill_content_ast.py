#!/usr/bin/env python3
"""
回填 content_ast 字段

用途：为现有文章生成 content_ast 字段
使用：python scripts/backfill_content_ast.py
"""

import asyncio
import logging
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.db import get_session

# 先导入所有模型以确保关系正确初始化
from app.media.model import MediaFile  # noqa: F401
from app.posts.model import Category, Post, Tag  # noqa: F401
from app.posts.utils.processor import PostProcessor
from app.users.model import User  # noqa: F401
from sqlmodel import select

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def backfill_content_ast():
    """回填所有文章的 content_ast 字段"""
    async for session in get_session():
        try:
            # 查询所有文章
            stmt = select(Post)
            result = await session.exec(stmt)
            posts = result.all()

            logger.info(f"找到 {len(posts)} 篇文章需要处理")

            updated_count = 0
            skipped_count = 0

            for post in posts:
                # 如果已经有 content_ast，跳过
                if post.content_ast:
                    logger.debug(f"跳过文章 {post.id} ({post.title})：已有 content_ast")
                    skipped_count += 1
                    continue

                # 如果没有 content_mdx，跳过
                if not post.content_mdx:
                    logger.warning(
                        f"跳过文章 {post.id} ({post.title})：没有 content_mdx"
                    )
                    skipped_count += 1
                    continue

                try:
                    # 处理内容生成 AST
                    processor = PostProcessor(post.content_mdx).process()
                    post.content_ast = processor.content_ast

                    # 同时更新 TOC 和阅读时间（如果需要）
                    if not post.toc:
                        post.toc = processor.toc
                    if not post.reading_time:
                        post.reading_time = processor.reading_time

                    session.add(post)
                    updated_count += 1

                    logger.info(
                        f"✅ 更新文章 {post.id} ({post.title}): AST 节点数 = {len(processor.content_ast.get('children', []))}"
                    )

                except Exception as e:
                    logger.error(f"❌ 处理文章 {post.id} ({post.title}) 失败: {e}")
                    continue

            # 提交所有更改
            await session.commit()

            logger.info("=" * 60)
            logger.info("✅ 回填完成！")
            logger.info(f"   - 更新: {updated_count} 篇")
            logger.info(f"   - 跳过: {skipped_count} 篇")
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"回填失败: {e}")
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(backfill_content_ast())
