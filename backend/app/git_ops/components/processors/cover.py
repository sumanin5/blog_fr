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
        if not result.get("cover_media_id"):
            cover_path = meta.get("cover") or meta.get("image")
            if cover_path:
                from app.core.config import settings

                result["cover_media_id"] = await self._resolve_cover_media_id(
                    session,
                    cover_path,
                    mdx_file_path=scanned.file_path,
                    content_dir=Path(settings.CONTENT_DIR),
                )

    async def _resolve_cover_media_id(
        self,
        session: AsyncSession,
        cover_value: str,
        mdx_file_path: str | None = None,
        content_dir: Path | None = None,
    ) -> Optional[UUID]:
        """根据文件路径、文件名或外部 URL 查询/注入媒体库 ID"""
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

        # 3. Local Auto-upload
        if mdx_file_path and content_dir:
            mdx_dir = (content_dir / mdx_file_path).parent
            img_abs_path = (mdx_dir / cover_value).resolve()

            if (
                img_abs_path.exists()
                and img_abs_path.is_file()
                and str(img_abs_path).startswith(str(content_dir))
            ):
                filename = img_abs_path.name
                media = await media_crud.get_media_file_by_path(session, filename)

                if not media:
                    try:
                        admin = await user_crud.get_superuser(session)
                        if not admin:
                            raise Exception("No superadmin found")

                        import asyncio

                        file_content = await asyncio.to_thread(img_abs_path.read_bytes)
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

        # 4. Path match
        media = await media_crud.get_media_file_by_path(session, cover_value)
        if media:
            return media.id

        # 5. Filename match
        filename = Path(cover_value).name
        results = await media_service.search_media_files(
            session, query=filename, limit=1
        )
        if results:
            return results[0].id

        return None
