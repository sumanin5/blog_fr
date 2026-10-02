#!/usr/bin/env python3
"""
回填地理位置数据脚本

用途：为已有的 analytics_event 记录重新解析 IP 地址，填充 region 和 isp 字段
使用：python scripts/backfill_geo_data.py
"""

import asyncio
import os
import sys

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.analytics.model import AnalyticsEvent
from app.core.config import settings
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker


async def parse_ip(ip_addr: str) -> dict:
    """解析 IP 地址，返回地理位置信息"""
    country = "Unknown"
    city = "Unknown"
    province = "Unknown"
    isp = "Unknown"

    if not ip_addr or ip_addr == "Unknown":
        return {
            "country": country,
            "region": province,
            "city": city,
            "isp": isp,
        }

    try:
        import ip2region.searcher as xdb
        import ip2region.util as util

        db_path = "data/ip2region.xdb"
        version = util.IPv4

        if os.path.exists(db_path):
            v_index = util.load_vector_index_from_file(db_path)
            searcher = xdb.new_with_vector_index(version, db_path, v_index)

            result = searcher.search(ip_addr)
            searcher.close()

            if result:
                parts = result.split("|")
                # 实际返回格式: 国家|省份|城市|ISP|国家代码
                # 例如: 中国|浙江省|绍兴市|移动|CN
                if len(parts) >= 5:
                    country = parts[0] if parts[0] and parts[0] != "0" else "Unknown"
                    province = parts[1] if parts[1] and parts[1] != "0" else "Unknown"
                    city = parts[2] if parts[2] and parts[2] != "0" else "Unknown"
                    isp = parts[3] if parts[3] and parts[3] != "0" else "Unknown"
                elif len(parts) >= 4:
                    country = parts[0] if parts[0] and parts[0] != "0" else "Unknown"
                    province = parts[1] if parts[1] and parts[1] != "0" else "Unknown"
                    city = parts[2] if parts[2] and parts[2] != "0" else "Unknown"
                    isp = parts[3] if parts[3] and parts[3] != "0" else "Unknown"

    except Exception as e:
        print(f"⚠️  解析 IP {ip_addr} 失败: {e}")

    return {
        "country": country,
        "region": province,
        "city": city,
        "isp": isp,
    }


async def backfill_geo_data():
    """回填地理位置数据"""
    print("🚀 开始回填地理位置数据...")

    # 创建数据库连接
    engine = create_async_engine(settings.async_database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # 查询所有需要更新的记录（region 或 isp 为空的记录）
        stmt = select(AnalyticsEvent).where(
            AnalyticsEvent.region.is_(None) | AnalyticsEvent.isp.is_(None)
        )
        result = await session.execute(stmt)
        events = result.scalars().all()

        total = len(events)
        print(f"📊 找到 {total} 条需要更新的记录")

        if total == 0:
            print("✅ 所有记录都已包含地理位置信息")
            return

        updated = 0
        skipped = 0

        for i, event in enumerate(events, 1):
            if not event.ip_address or event.ip_address == "Unknown":
                skipped += 1
                continue

            # 解析 IP
            geo_data = await parse_ip(event.ip_address)

            # 更新记录
            event.country = geo_data["country"]
            event.region = geo_data["region"]
            event.city = geo_data["city"]
            event.isp = geo_data["isp"]

            updated += 1

            if i % 100 == 0:
                print(f"⏳ 进度: {i}/{total} ({i * 100 // total}%)")
                await session.commit()

        # 提交最后的更改
        await session.commit()

        print("\n✅ 回填完成！")
        print(f"   - 更新: {updated} 条")
        print(f"   - 跳过: {skipped} 条（无效 IP）")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(backfill_geo_data())
