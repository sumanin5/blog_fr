import pytest
from app.analytics import geo
from app.core.ip2region_manager import get_ip2region_manager

pytestmark = pytest.mark.skipif(
    not get_ip2region_manager().db_path.exists(),
    reason="ip2region.xdb 不存在（CI 未下载数据库时跳过）",
)


def test_lookup_known_ipv4():
    region = geo.lookup_region("114.114.114.114")
    assert region["country"] == "中国"
    assert set(region) == {"country", "province", "city", "isp"}


def test_lookup_handles_missing_and_ipv6():
    unknown = {
        "country": "Unknown",
        "province": "Unknown",
        "city": "Unknown",
        "isp": "Unknown",
    }
    assert geo.lookup_region(None) == unknown
    assert geo.lookup_region("") == unknown
    assert geo.lookup_region("2001:db8::1") == unknown


def test_searcher_is_loaded_once():
    geo.lookup_region("8.8.8.8")
    first = geo._get_searcher()
    geo.lookup_region("1.1.1.1")
    assert geo._get_searcher() is first
