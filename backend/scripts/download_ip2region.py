#!/usr/bin/env python3
"""
下载和更新 ip2region 数据库文件

该脚本会自动从 GitHub 下载最新的 ip2region.xdb 数据库文件到 data 目录。
支持：
1. 首次下载
2. 检查更新（基于文件修改时间）
3. 强制更新
"""

import hashlib
import sys
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen, urlretrieve


def get_remote_file_info(url: str) -> dict:
    """获取远程文件信息（大小、最后修改时间）"""
    try:
        req = Request(url, method="HEAD")
        with urlopen(req, timeout=10) as response:
            headers = response.headers
            return {
                "size": int(headers.get("Content-Length", 0)),
                "last_modified": headers.get("Last-Modified", ""),
            }
    except Exception as e:
        print(f"⚠ 无法获取远程文件信息: {e}")
        return {}


def calculate_file_hash(file_path: Path) -> str:
    """计算文件的 MD5 哈希值"""
    md5_hash = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            md5_hash.update(chunk)
    return md5_hash.hexdigest()


def should_update(
    db_path: Path, force: bool = False, check_interval_days: int = 7
) -> bool:
    """判断是否需要更新数据库"""
    if force:
        return True

    if not db_path.exists():
        return True

    # 检查文件修改时间
    file_mtime = datetime.fromtimestamp(db_path.stat().st_mtime)
    days_old = (datetime.now() - file_mtime).days

    if days_old >= check_interval_days:
        print(f"ℹ 数据库文件已有 {days_old} 天未更新，建议更新")
        return True

    print(f"✓ 数据库文件较新（{days_old} 天前更新），无需更新")
    return False


def download_ip2region_db(force: bool = False, auto_mode: bool = False):
    """
    下载 ip2region 数据库文件

    Args:
        force: 是否强制下载
        auto_mode: 自动模式（不询问用户）
    """
    # 数据库文件 URL（支持 IPv4 和 IPv6）
    # IPv4 数据库
    db_url_v4 = (
        "https://github.com/lionsoul2014/ip2region/raw/master/data/ip2region_v4.xdb"
    )
    # IPv6 数据库（可选）
    # db_url_v6 = "https://github.com/lionsoul2014/ip2region/raw/master/data/ip2region_v6.xdb"

    # 默认使用 IPv4
    db_url = db_url_v4
    db_filename = "ip2region.xdb"

    # 目标路径
    script_dir = Path(__file__).parent
    backend_dir = script_dir.parent
    data_dir = backend_dir / "data"
    db_path = data_dir / db_filename

    # 确保 data 目录存在
    data_dir.mkdir(exist_ok=True)

    # 检查是否需要更新
    if not should_update(db_path, force=force, check_interval_days=7):
        if not auto_mode:
            response = input("是否强制更新？(y/N): ").strip().lower()
            if response != "y":
                print("跳过更新")
                return True
        else:
            return True

    # 检查文件是否已存在
    if db_path.exists() and not force:
        file_size = db_path.stat().st_size / (1024 * 1024)  # MB
        file_mtime = datetime.fromtimestamp(db_path.stat().st_mtime)
        print("ℹ 当前数据库文件:")
        print(f"  路径: {db_path}")
        print(f"  大小: {file_size:.2f} MB")
        print(f"  更新时间: {file_mtime.strftime('%Y-%m-%d %H:%M:%S')}")

        if not auto_mode:
            response = input("是否重新下载？(y/N): ").strip().lower()
            if response != "y":
                print("跳过下载")
                return True

    print("\n正在下载 ip2region 数据库...")
    print(f"URL: {db_url}")
    print(f"目标: {db_path}")

    # 获取远程文件信息
    remote_info = get_remote_file_info(db_url)
    if remote_info:
        remote_size = remote_info["size"] / (1024 * 1024)
        print(f"远程文件大小: {remote_size:.2f} MB")

    try:
        # 下载文件
        def show_progress(block_num, block_size, total_size):
            downloaded = block_num * block_size
            if total_size > 0:
                percent = min(downloaded * 100 / total_size, 100)
                mb_downloaded = downloaded / (1024 * 1024)
                mb_total = total_size / (1024 * 1024)
                print(
                    f"\r下载进度: {percent:.1f}% ({mb_downloaded:.2f}/{mb_total:.2f} MB)",
                    end="",
                )

        # 下载到临时文件
        temp_path = db_path.with_suffix(".xdb.tmp")
        urlretrieve(db_url, temp_path, reporthook=show_progress)
        print()  # 换行

        # 验证文件
        if temp_path.exists() and temp_path.stat().st_size > 0:
            # 替换旧文件
            if db_path.exists():
                db_path.unlink()
            temp_path.rename(db_path)

            file_size = db_path.stat().st_size / (1024 * 1024)  # MB
            file_hash = calculate_file_hash(db_path)

            print("✓ 下载成功！")
            print(f"  文件路径: {db_path}")
            print(f"  文件大小: {file_size:.2f} MB")
            print(f"  文件哈希: {file_hash}")
            print(f"  更新时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            return True
        else:
            print("✗ 下载失败：文件不存在或为空")
            if temp_path.exists():
                temp_path.unlink()
            return False

    except Exception as e:
        print(f"\n✗ 下载失败: {e}")
        print("\n备用方案：")
        print(
            "1. 手动下载: https://github.com/lionsoul2014/ip2region/raw/master/data/ip2region_v4.xdb"
        )
        print(f"2. 保存到: {db_path}")
        print("\n或者使用国内镜像：")
        print(
            "wget https://ghproxy.com/https://github.com/lionsoul2014/ip2region/raw/master/data/ip2region_v4.xdb"
        )
        return False


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="下载和更新 ip2region 数据库")
    parser.add_argument("--force", action="store_true", help="强制下载，忽略现有文件")
    parser.add_argument("--auto", action="store_true", help="自动模式，不询问用户")
    parser.add_argument("--check-only", action="store_true", help="仅检查是否需要更新")

    args = parser.parse_args()

    if args.check_only:
        script_dir = Path(__file__).parent
        backend_dir = script_dir.parent
        db_path = backend_dir / "data" / "ip2region.xdb"

        if not db_path.exists():
            print("✗ 数据库文件不存在，需要下载")
            sys.exit(1)

        needs_update = should_update(db_path, force=False, check_interval_days=7)
        sys.exit(0 if not needs_update else 1)

    success = download_ip2region_db(force=args.force, auto_mode=args.auto)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
