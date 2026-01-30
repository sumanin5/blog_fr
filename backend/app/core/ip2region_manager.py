"""
ip2region 数据库管理器

负责：
1. 启动时检查数据库文件
2. 自动下载缺失的数据库
3. 定期检查更新（可选）
"""

import logging
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)


class IP2RegionManager:
    """ip2region 数据库管理器"""

    def __init__(self):
        self.backend_dir = Path(__file__).parent.parent.parent
        self.db_path = self.backend_dir / "data" / "ip2region.xdb"
        self.download_script = self.backend_dir / "scripts" / "download_ip2region.py"

    def ensure_database_exists(self) -> bool:
        """
        确保数据库文件存在，如果不存在则自动下载

        Returns:
            bool: 数据库是否可用
        """
        if self.db_path.exists():
            file_size = self.db_path.stat().st_size / (1024 * 1024)
            logger.info(
                f"✓ ip2region 数据库已存在: {self.db_path} ({file_size:.2f} MB)"
            )
            return True

        logger.warning("⚠ ip2region 数据库不存在，尝试自动下载...")
        return self._download_database()

    def check_and_update(self) -> bool:
        """
        检查并更新数据库（如果需要）

        Returns:
            bool: 是否成功
        """
        try:
            # 检查是否需要更新
            result = subprocess.run(
                ["python", str(self.download_script), "--check-only"],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode == 0:
                logger.info("✓ ip2region 数据库无需更新")
                return True
            else:
                logger.info("ℹ ip2region 数据库需要更新，开始下载...")
                return self._download_database()

        except Exception as e:
            logger.error(f"检查更新失败: {e}")
            return False

    def _download_database(self) -> bool:
        """
        下载数据库文件

        Returns:
            bool: 是否下载成功
        """
        try:
            logger.info("正在下载 ip2region 数据库...")

            result = subprocess.run(
                ["python", str(self.download_script), "--auto"],
                capture_output=True,
                text=True,
                timeout=300,  # 5分钟超时
            )

            if result.returncode == 0:
                logger.info("✓ ip2region 数据库下载成功")
                logger.info(result.stdout)
                return True
            else:
                logger.error("✗ ip2region 数据库下载失败")
                logger.error(result.stderr)
                return False

        except subprocess.TimeoutExpired:
            logger.error("下载超时（5分钟）")
            return False
        except Exception as e:
            logger.error(f"下载失败: {e}")
            return False


# 全局单例
_manager = None


def get_ip2region_manager() -> IP2RegionManager:
    """获取 ip2region 管理器单例"""
    global _manager
    if _manager is None:
        _manager = IP2RegionManager()
    return _manager


def init_ip2region_database():
    """
    初始化 ip2region 数据库
    在应用启动时调用
    """
    manager = get_ip2region_manager()
    success = manager.ensure_database_exists()

    if not success:
        logger.warning("⚠ ip2region 数据库初始化失败，IP 地理位置解析功能将不可用")
        logger.warning("  可以手动下载: python scripts/download_ip2region.py")
    else:
        logger.info("✓ ip2region 数据库初始化完成")
