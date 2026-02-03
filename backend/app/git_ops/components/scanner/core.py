import asyncio
import logging
from pathlib import Path
from typing import List, Optional

import frontmatter
import orjson
from app.git_ops.exceptions import GitOpsConfigurationError, ScanError

from .models import ScannedPost
from .path_parser import PathParser
from .utils import calc_hash

logger = logging.getLogger(__name__)


class MDXScanner:
    def __init__(self, content_root: Path, path_parser: Optional[PathParser] = None):
        self.content_root = Path(content_root)
        self.path_parser = path_parser or PathParser()

        if not self.content_root.exists():
            raise GitOpsConfigurationError(
                f"Content root does not exist: {content_root}"
            )

    async def scan_file(self, rel_path: str) -> Optional[ScannedPost]:
        """解析单个文件。异常将被统一包装为 ScanError 以便全局处理。"""

        full_path = self.content_root / rel_path
        if not full_path.is_file():
            return None

        try:
            # 1. 异步读取与解析
            raw_content = await asyncio.to_thread(full_path.read_text, encoding="utf-8")
            post = frontmatter.loads(raw_content)  # 主要的性能瓶颈

            # 2. 计算 Hash 与路径解析
            # 使用 orjson 进行更快的、确定性的序列化 (自动处理日期等)
            meta_bytes = orjson.dumps(post.metadata, option=orjson.OPT_SORT_KEYS)
            path_info = self.path_parser.parse(rel_path)

            # 检测是否为分类元数据文件
            is_index = Path(rel_path).name.lower() == "index.md"
            is_category_index = is_index and bool(path_info.get("category_slug"))

            return ScannedPost(
                file_path=str(rel_path),
                content_hash=calc_hash(raw_content),
                meta_hash=calc_hash(meta_bytes),
                frontmatter=post.metadata,
                content=post.content,
                updated_at=full_path.stat().st_mtime,
                derived_post_type=path_info.get("post_type"),
                derived_category_slug=path_info.get("category_slug"),
                is_category_index=is_category_index,
            )
        except Exception as e:
            # 附带文件路径上下文，符合全局错误处理规范
            raise ScanError(rel_path, str(e)) from e

    async def scan_all(
        self, glob_patterns: Optional[List[str]] = None
    ) -> List[ScannedPost]:
        """
        扫描所有匹配的文件 (并发模式，带限流保护)。

        优化点：
        1. 路径去重：使用 set 避免多个 pattern 重复匹配同一文件。
        2. 并发限流：使用 Semaphore 防止瞬间打开过多文件句柄。
        3. 容错增强：保持 gather 的 return_exceptions=True，确保个别文件损坏不影响全局。
        """
        if glob_patterns is None:
            target_extensions = {".md", ".mdx"}
        else:
            # 从 pattern 中提取后缀名进行优化过滤，可以自定义
            target_extensions = {
                f".{p.split('.')[-1].lower()}" for p in glob_patterns if "." in p
            }

        # 1. 发现并收集路径 (单次递归遍历物理磁盘，效率更高)
        target_path_set = set()
        ignore_names = {"README.MD", "README.MDX", "LICENSE.MD", ".GITIGNORE"}

        # 仅执行一次 rglob，在循环内进行后缀匹配
        for path in self.content_root.rglob("*"):
            # 获取相对于根目录的内容，检查每一级是否包含隐藏目录/文件
            rel_path_obj = path.relative_to(self.content_root)

            if (
                # 四重过滤条件：文件、后缀、名称、非隐藏路径
                path.is_file()
                and path.suffix.lower() in target_extensions
                and path.name.upper() not in ignore_names
                and not any(part.startswith(".") for part in rel_path_obj.parts)
            ):
                target_path_set.add(path)

        if not target_path_set:
            return []

        # 转换为相对路径
        rel_paths = [p.relative_to(self.content_root) for p in target_path_set]
        logger.info(f"🔍 [Scanner] Found {len(rel_paths)} target files to scan.")

        # 2. 并发扫描 (引入信号量限流，默认并发数为 20)
        # 这能保证即便文件极多，也不会因瞬间内存峰值或文件句柄耗尽而崩溃
        sem = asyncio.Semaphore(20)

        async def throttled_scan(rel_p: Path):
            async with sem:
                return await self.scan_file(str(rel_p))

        tasks = [throttled_scan(p) for p in rel_paths]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 3. 筛选并汇总结果
        scanned_posts = []
        for i, res in enumerate(results):
            if isinstance(res, Exception):
                logger.error(f"Failed to scan file {rel_paths[i]}: {res}")
            elif res:
                scanned_posts.append(res)

        return scanned_posts
