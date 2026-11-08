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

        # 转换内部文章链接 (e.g., [text](./other.md) -> [text](/posts/slug))
        transformed_content = await self._transform_internal_links(
            content, scanned.file_path, session, dry_run=dry_run
        )

        # 网站链接和媒体 URL 只存入数据库，Git 中保留原始相对链接。
        result["content_mdx"] = transformed_content

        # Title fallback：如果没有 title，使用文件名
        if not result.get("title"):
            result["title"] = Path(scanned.file_path).stem

    async def _transform_image_paths(
        self,
        content: str,
        mdx_file_path: str,
        session: AsyncSession,
        dry_run: bool = False,
    ) -> str:
        """转换 Markdown 图片路径为媒体库 URL；dry_run 时不写媒体库。"""
        from app.core.config import settings

        # 匹配 Markdown 图片语法：![alt](path)
        pattern = r"!\[([^\]]*)\]\(([^)]+)\)"

        async def replace_image(match):
            alt_text = match.group(1)
            image_path = match.group(2)

            # 判断是否需要处理
            if not self._should_process_image(image_path):
                return match.group(0)  # 保持原样

            # 预览模式只读，不上传图片
            if dry_run:
                return match.group(0)

            # 上传图片并获取 media_id
            media_id = await self._upload_and_get_media_id(
                image_path, mdx_file_path, session
            )

            if not media_id:
                return match.group(0)  # 上传失败，保持原样

            # 生成新 URL
            if image_path.lower().endswith((".svg", ".gif")):
                # SVG 和 GIF 使用原图（view 接口），避免转换带来的画质损失或动画丢失
                new_url = (
                    f"{settings.BASE_URL}{settings.API_PREFIX}/media/{media_id}/view"
                )
            else:
                # 其他图片使用 large 缩略图
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

    async def _transform_internal_links(
        self,
        content: str,
        mdx_file_path: str,
        session: AsyncSession,
        dry_run: bool = False,
    ) -> str:
        """
        批量转换 Markdown 内部链接
        例如: [另篇文章](./security/firewall.md) -> [另篇文章](/posts/firewall-slug-xyz)
        dry_run 时只做只读解析，不写媒体库。
        """
        import logging
        from pathlib import Path

        from app.core.config import settings
        from app.posts.cruds.post import get_slug_map_by_source_paths

        logger = logging.getLogger(__name__)

        # 1. 先处理图片路径转换（保持原有逻辑独立性）
        content = await self._transform_image_paths(
            content, mdx_file_path, session, dry_run=dry_run
        )

        # 2. 匹配 Markdown 链接语法：[text](path.md)
        # 排除图片链接 (![), 排除网页链接 (http), 必须以 .md 或 .mdx 结尾
        link_pattern = r"(?<!\!)\[([^\]]+)\]\(([^)]+\.mdx?)\)"
        matches = list(re.finditer(link_pattern, content))
        if not matches:
            return content

        content_dir = Path(settings.CONTENT_DIR)
        current_mdx_path = Path(mdx_file_path)
        # mdx_dir 是该文件所在的物理目录（相对于 content_dir 的绝对路径）
        mdx_dir = (content_dir / current_mdx_path).parent

        # 3. 第一轮遍历：解析所有物理路径
        path_map = {}  # {raw_path: target_rel_path_in_db}
        for match in matches:
            raw_path = match.group(2)

            # 排除外部链接
            if raw_path.startswith(("http://", "https://", "mailto:", "/")):
                continue

            try:
                # 解析目标文件的绝对路径
                target_abs_path = (mdx_dir / raw_path).resolve()
                # 转换为相对于 content_dir 的路径，用于查询数据库
                target_rel_path = target_abs_path.relative_to(
                    content_dir.resolve()
                ).as_posix()
                path_map[raw_path] = target_rel_path
            except Exception as e:
                logger.warning(
                    f"⚠️ Failed to resolve internal link '{raw_path}' in {mdx_file_path}: {e}"
                )
                continue

        if not path_map:
            return content

        # 4. 批量查询：一次性拿到所有 slug
        slug_map = await get_slug_map_by_source_paths(session, list(path_map.values()))

        # 5. 第二轮遍历：执行替换
        # 从后往前替换，避免偏移失效
        for match in reversed(matches):
            text = match.group(1)
            raw_path = match.group(2)

            target_rel_path = path_map.get(raw_path)
            if not target_rel_path:
                continue

            target_info = slug_map.get(target_rel_path)
            if target_info:
                slug, post_type = target_info
                # 数据库查询通常返回字符串，测试或 ORM 对象可能返回枚举。
                post_type_value = getattr(post_type, "value", post_type)
                # 必须包含 post_type 路径段，以匹配详情页路由 /posts/[postType]/[slug]
                new_url = f"/posts/{post_type_value}/{slug}"
                replacement = f"[{text}]({new_url})"
                content = (
                    content[: match.start()] + replacement + content[match.end() :]
                )
            else:
                logger.debug(
                    f"ℹ️ Link target not found in DB: {target_rel_path} (from {mdx_file_path})"
                )

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
