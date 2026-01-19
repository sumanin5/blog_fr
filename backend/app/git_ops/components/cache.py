import logging

import httpx

logger = logging.getLogger(__name__)


async def revalidate_nextjs_cache(frontend_url: str, revalidate_secret: str) -> bool:
    """失效 Next.js 缓存"""
    if not frontend_url or not revalidate_secret:
        logger.warning(
            "⚠️ FRONTEND_URL or REVALIDATE_SECRET not configured, skip revalidation"
        )
        return False

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{frontend_url}/api/revalidate",
                headers={
                    "Authorization": f"Bearer {revalidate_secret}",
                    "Content-Type": "application/json",
                },
                json={
                    "tags": ["posts", "posts-list", "categories"],
                    "paths": ["/posts"],
                },
                timeout=10.0,
            )

            if response.status_code == 200:
                logger.info("✅ Next.js cache revalidated successfully")
                return True
            else:
                logger.warning(f"❌ Failed to revalidate cache: {response.status_code}")
                return False
    except Exception as e:
        logger.warning(f"❌ Error revalidating cache: {e}")
        return False
