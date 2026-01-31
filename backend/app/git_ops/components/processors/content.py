import re
from pathlib import Path
from typing import Any, Dict

from app.git_ops.components.scanner import ScannedPost
from sqlmodel.ext.asyncio.session import AsyncSession

from .base import FieldProcessor


class ContentProcessor(FieldProcessor):
    """处理 content_mdx 和 title fallback，并转换图片路径"""

    async def process(
        self,
        result: Dict[str, Any],
        meta: Dict[str, Any],
        scanned: ScannedPost,
        session: AsyncSession,
        dry_run: bool = False,
    ) -> None:
        # 设置内容
        content = scanned.content

        # 转换图片路径（只在非 dry_run 模式下）
        if not dry_run:
            # 🆕 先检测是否有需要转换的图片
            has_relative_images = self._has_relative_images(content)

            if has_relative_images:
                # 转换图片路径
                transformed_content = await self._transform_image_paths(
                    content, scanned.file_path, session
                )

                # 🆕 如果内容发生了变化，立即写回源文件
                if transformed_content != content:
                    await self._write_transformed_content(
                        scanned.file_path, transformed_content
                    )
                    content = transformed_content
                    import logging

                    logger = logging.getLogger(__name__)
                    logger.info(
                        f"✓ Transformed and wrote back image paths: {scanned.file_path}"
                    )

        result["content_mdx"] = content

        # Title fallback：如果没有 title，使用文件名
        if not result.get("title"):
            result["title"] = Path(scanned.file_path).stem

    async def _transform_image_paths(
        self, content: str, mdx_file_path: str, session: AsyncSession
    ) -> str:
        """转换 Markdown 图片路径为媒体库 URL"""
        from app.core.config import settings

        # 匹配 Markdown 图片语法：![alt](path)
        pattern = r"!\[([^\]]*)\]\(([^)]+)\)"

        async def replace_image(match):
            alt_text = match.group(1)
            image_path = match.group(2)

            # 判断是否需要处理
            if not self._should_process_image(image_path):
                return match.group(0)  # 保持原样

            # 上传图片并获取 media_id
            media_id = await self._upload_and_get_media_id(
                image_path, mdx_file_path, session
            )

            if not media_id:
                return match.group(0)  # 上传失败，保持原样

            # 生成新 URL（默认使用 large 尺寸）
            new_url = f"{settings.BASE_URL}{settings.API_PREFIX}/media/{media_id}/thumbnail/large"

            return f"![{alt_text}]({new_url})"

        # 使用异步替换
        import asyncio

        matches = list(re.finditer(pattern, content))
        replacements = await asyncio.gather(
            *[replace_image(match) for match in matches]
        )

        # 从后往前替换，避免索引错乱
        for match, replacement in zip(reversed(matches), reversed(replacements)):
            content = content[: match.start()] + replacement + content[match.end() :]

        return content

    def _has_relative_images(self, content: str) -> bool:
        """🆕 快速检测内容中是否有相对路径图片（避免不必要的处理）"""
        import re

        # 匹配 Markdown 图片语法：![alt](path)
        pattern = r"!\[([^\]]*)\]\(([^)]+)\)"
        matches = re.findall(pattern, content)

        for _, image_path in matches:
            if self._should_process_image(image_path):
                return True

        return False

    def _should_process_image(self, image_path: str) -> bool:
        """判断是否需要处理图片"""
        # 外部链接，保持原样
        if image_path.startswith(("http://", "https://")):
            return False

        # 已经是媒体库链接，保持原样
        if "/api/v1/media/" in image_path or "/media/" in image_path:
            return False

        # 相对路径，需要处理
        if image_path.startswith(("./", "../")) or (
            not image_path.startswith("/") and "://" not in image_path
        ):
            return True

        return False

    async def _write_transformed_content(self, file_path: str, content: str):
        """🆕 将转换后的内容写回源文件（只更新正文，保留 frontmatter）"""
        import asyncio
        from pathlib import Path

        import frontmatter
        from app.core.config import settings

        full_path = Path(settings.CONTENT_DIR) / file_path

        try:
            # 读取原文件（保留 frontmatter）
            def _read():
                with open(full_path, "r", encoding="utf-8") as f:
                    return frontmatter.load(f)

            post = await asyncio.to_thread(_read)

            # 只更新正文
            post.content = content

            # 写回文件
            def _write():
                with open(full_path, "w", encoding="utf-8") as f:
                    f.write(frontmatter.dumps(post))

            await asyncio.to_thread(_write)

        except Exception as e:
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Failed to write transformed content to {file_path}: {e}")
            # 不抛出异常，继续使用转换后的内容（即使写回失败）

    async def _upload_and_get_media_id(
        self, relative_path: str, mdx_file_path: str, session: AsyncSession
    ):
        """上传图片到媒体库并返回 media_id"""
        from pathlib import Path

        from app.core.config import settings
        from app.media import crud as media_crud
        from app.media import service as media_service
        from app.media.model import FileUsage
        from app.users import crud as user_crud

        try:
            # 计算图片的绝对路径
            content_dir = Path(settings.CONTENT_DIR)
            mdx_dir = (content_dir / mdx_file_path).parent
            img_abs_path = (mdx_dir / relative_path).resolve()

            # 验证文件存在且在 content_dir 内
            if not img_abs_path.exists() or not str(img_abs_path).startswith(
                str(content_dir)
            ):
                return None

            filename = img_abs_path.name

            # 检查是否已经上传过
            existing_media = await media_crud.get_media_file_by_path(session, filename)
            if existing_media:
                return existing_media.id

            # 上传新图片
            admin = await user_crud.get_superuser(session)
            if not admin:
                return None

            import asyncio

            file_content = await asyncio.to_thread(img_abs_path.read_bytes)

            media = await media_service.create_media_file(
                file_content=file_content,
                filename=filename,
                uploader_id=admin.id,
                session=session,
                usage=FileUsage.GENERAL,  # 使用 GENERAL 而不是 CONTENT
                is_public=True,
                description=f"Auto-uploaded from: {mdx_file_path}",
            )

            return media.id

        except Exception as e:
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Failed to upload image {relative_path}: {e}")
            return None
