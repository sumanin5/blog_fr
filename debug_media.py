import asyncio
import os
import sys

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.core.db import async_session_maker
from app.media.model import MediaFile
from sqlmodel import select


async def main():
    async with async_session_maker() as session:
        stmt = select(MediaFile)
        result = await session.exec(stmt)
        files = result.all()

        print(f"Found {len(files)} media files:")
        for f in files:
            print(f"ID: {f.id}")
            print(f"  Path: {f.file_path}")
            print(f"  Orig: {f.original_filename}")
            print("-" * 20)


if __name__ == "__main__":
    import dotenv

    dotenv.load_dotenv(".env")
    asyncio.run(main())
