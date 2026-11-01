"""
IP 地理位置解析（ip2region）

xdb 文件（约 10MB）在首次查询时整体载入内存并复用：内存模式的 Searcher 只读、
无文件句柄，可在请求间共享。此前每条埋点事件都重新从磁盘加载索引并打开文件。
"""

import logging
import threading
from typing import Optional

from app.core.ip2region_manager import get_ip2region_manager

logger = logging.getLogger(__name__)

UNKNOWN = "Unknown"

_searcher = None
_lock = threading.Lock()


def _get_searcher():
    """懒加载内存 Searcher；数据库文件尚不存在时返回 None 且不缓存，便于下载完成后生效"""
    global _searcher
    if _searcher is not None:
        return _searcher

    with _lock:
        if _searcher is not None:
            return _searcher

        db_path = get_ip2region_manager().db_path
        if not db_path.exists():
            return None

        import ip2region.searcher as xdb
        import ip2region.util as util

        buffer = util.load_content_from_file(str(db_path))
        _searcher = xdb.new_with_buffer(util.IPv4, buffer)
        logger.info(f"ip2region loaded into memory: {db_path}")
        return _searcher


def _clean(value: str) -> str:
    return value if value and value != "0" else UNKNOWN


def lookup_region(ip: Optional[str]) -> dict[str, str]:
    """
    解析 IP 所在地区。返回 country / province / city / isp，失败时均为 "Unknown"。

    xdb 返回格式：国家|省份|城市|ISP|国家代码，例如 中国|浙江省|绍兴市|移动|CN
    """
    region = {"country": UNKNOWN, "province": UNKNOWN, "city": UNKNOWN, "isp": UNKNOWN}
    if not ip:
        return region

    try:
        searcher = _get_searcher()
        result = searcher.search(ip) if searcher else None
    except Exception as e:
        # IPv6、非法 IP 等：记录日志但不影响主流程
        logger.warning(f"ip2region resolution failed for IP {ip}: {e}")
        return region

    parts = result.split("|") if result else []
    if len(parts) >= 4:
        region.update(
            country=_clean(parts[0]),
            province=_clean(parts[1]),
            city=_clean(parts[2]),
            isp=_clean(parts[3]),
        )
    return region
