import logging
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import UUID

from app.git_ops.components.scanner import ScannedPost
from sqlmodel.ext.asyncio.session import AsyncSession

from .base import FieldProcessor

logger = logging.getLogger(__name__)


class CoverProcessor(FieldProcessor):
    """处理 cover_media_id 字段"""

    async def process(
        self,
        result: Dict[str, Any],
        meta: Dict[str, Any],
        scanned: ScannedPost,
        session: AsyncSession,
        dry_run: bool = False,
    ) -> None:
        from app.core.config import settings
        from app.media import crud as media_crud

        # 如果 Frontmatter 里有 cover_media_id，先验证它是否有效
        if result.get("cover_media_id"):
            existing_media = await media_crud.get_media_file(
                session, result["cover_media_id"]
            )
            if existing_media:
                logger.info(
                    f"✅ Using existing cover_media_id from frontmatter: {result['cover_media_id']}"
                )
                return  # ID 有效，直接使用
            else:
                logger.warning(
                    f"⚠️ cover_media_id {result['cover_media_id']} from frontmatter not found in DB, will auto-resolve"
                )
                result["cover_media_id"] = None  # 清空无效的 ID

        cover_path = meta.get("cover") or meta.get("image")
        if cover_path:
            result["cover_media_id"] = await self._resolve_cover_media_id(
                session,
                cover_path,
                mdx_file_path=scanned.file_path,
                content_dir=Path(settings.CONTENT_DIR),
                dry_run=dry_run,
            )
        elif not cover_path and not meta.get("cover_media_id"):
            # Git 中没有封面时，清空旧封面，保持源文件为唯一来源。
            result["cover_media_id"] = None

    async def _resolve_cover_media_id(
        self,
        session: AsyncSession,
        cover_value: str,
        mdx_file_path: str | None = None,
        content_dir: Path | None = None,
        dry_run: bool = False,
    ) -> Optional[UUID]:
        """按明确 ID、源文件内容哈希或精确存储路径解析；不模糊匹配。"""
        from app.media import crud as media_crud
        from app.media import service as media_service
        from app.users import crud as user_crud

        if not cover_value:
            return None

        # 1. UUID
        try:
            media_id = UUID(cover_value)
            media = await media_crud.get_media_file(session, media_id)
            if media:
                return media.id
        except ValueError:
            pass

        # 2. HTTP
        if cover_value.startswith(("http://", "https://")):
            return None

        # 3. Local source: identical bytes share media, equal names do not.
        if mdx_file_path and content_dir:
            mdx_dir = (content_dir / mdx_file_path).parent
            img_abs_path = (mdx_dir / cover_value).resolve()

            if not img_abs_path.is_relative_to(content_dir.resolve()):
                return None
            if img_abs_path.is_file():
                import asyncio
                import hashlib

                filename = img_abs_path.name
                file_content = await asyncio.to_thread(img_abs_path.read_bytes)
                media = await media_crud.get_media_file_by_hash(
                    session, hashlib.sha256(file_content).hexdigest()
                )

                if not media and not dry_run:
                    try:
                        admin = await user_crud.get_superuser(session)
                        if not admin:
                            raise Exception("No superadmin found")

                        from app.media.model import FileUsage

                        media = await media_service.create_media_file(
                            file_content=file_content,
                            filename=filename,
                            uploader_id=admin.id,
                            session=session,
                            usage=FileUsage.COVER,
                            is_public=True,
                            description=f"Auto-uploaded from git: {mdx_file_path}",
                        )
                        logger.info(f"✅ Auto-uploaded cover: {filename} -> {media.id}")
                    except Exception as e:
                        logger.error(f"❌ Failed to auto-upload cover: {e}")

                if media:
                    return media.id
                return None

        # 4. Path match
        # Only an explicit storage path may refer to an existing media record.
        # A missing local basename must never pick an unrelated image.
        path = Path(cover_value.replace("\\", "/"))
        if not path.is_absolute() and ".." not in path.parts and len(path.parts) > 1:
            media = await media_crud.get_media_file_by_path(session, path.as_posix())
            if media:
                return media.id

        return None
