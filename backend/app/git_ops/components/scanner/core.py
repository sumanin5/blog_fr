import asyncio
import logging
from pathlib import Path
from typing import List, Optional

import frontmatter
import orjson
from app.git_ops.exceptions import GitOpsConfigurationError, ScanError
from app.git_ops.content_contract import MANIFEST, SLUG, metadata

from .models import ScannedPost
from .path_parser import PathParser
from .policy import is_content_path
from .utils import calc_hash

logger = logging.getLogger(__name__)


class MDXScanner:
    def __init__(self, content_root: Path, path_parser: Optional[PathParser] = None):
        self.content_root = Path(content_root)
        self.path_parser = path_parser or PathParser()
        # 记录 scan_all 中解析失败的文件，供全量同步决定是否允许删除孤儿记录。
        self.last_scan_errors: dict[str, str] = {}
        # 工作区扫描结果是否不完整（例如与 Git 跟踪文件数量不一致）。
        self.last_scan_incomplete: bool = False

        if not self.content_root.exists():
            raise GitOpsConfigurationError(
                f"Content root does not exist: {content_root}"
            )

    async def scan_file(self, rel_path: str) -> Optional[ScannedPost]:
        """解析单个文件。异常将被统一包装为 ScanError 以便全局处理。"""

        # source_path 在数据库和 Git diff 中统一使用 POSIX 分隔符，避免 Windows
        # 全量扫描（反斜杠）与 Git 输出（正斜杠）无法匹配。
        rel_path = Path(rel_path).as_posix()
        root = self.content_root.resolve()
        full_path = (self.content_root / rel_path).resolve()
        if not full_path.is_relative_to(root):
            raise ScanError(rel_path, "Path escapes content repository")
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
            explicit_category = False
            if len(Path(rel_path).parts) == 3 and path_info.get("post_type"):
                index_path = full_path.parent / "index.md"
                if not index_path.resolve().is_relative_to(root):
                    raise ValueError("Category index escapes content repository")
                if full_path.name == "index.md":
                    index_meta = post.metadata
                elif index_path.is_file():
                    index_meta = metadata(await asyncio.to_thread(index_path.read_text, encoding="utf-8"))
                else:
                    index_meta = {}
                declared_slug = index_meta.get("slug")
                if declared_slug is not None:
                    if not isinstance(declared_slug, str) or not SLUG.fullmatch(declared_slug) or len(declared_slug) > 100:
                        raise ValueError("Category index contains an invalid explicit slug")
                    path_info["category_slug"] = declared_slug
                    explicit_category = True
                elif (self.content_root / MANIFEST).exists():
                    raise ValueError("Category index.md must declare slug")

            # 检测是否为分类元数据文件
            is_index = Path(rel_path).name.lower() == "index.md"
            is_category_index = is_index and bool(path_info.get("category_slug"))

            return ScannedPost(
                file_path=rel_path,
                content_hash=calc_hash(raw_content),
                meta_hash=calc_hash(meta_bytes),
                frontmatter=post.metadata,
                content=post.content,
                updated_at=full_path.stat().st_mtime,
                derived_post_type=path_info.get("post_type"),
                derived_category_slug=path_info.get("category_slug"),
                category_slug_explicit=explicit_category,
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
        self.last_scan_errors = {}
        self.last_scan_incomplete = False
        target_path_set = set()
        # 内容仓库约定：说明类文档不是文章，不参与导入。


        # 仅执行一次 rglob，在循环内进行后缀匹配
        for path in self.content_root.rglob("*"):
            # 获取相对于根目录的内容，检查每一级是否包含隐藏目录/文件
            rel_path_obj = path.relative_to(self.content_root)

            if (
                # 四重过滤条件：文件、后缀、名称、非隐藏路径
                path.is_file()
                and path.suffix.lower() in target_extensions
                and is_content_path(rel_path_obj)
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
                return await self.scan_file(rel_p.as_posix())

        tasks = [throttled_scan(p) for p in rel_paths]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 3. 筛选并汇总结果
        scanned_posts = []
        for i, res in enumerate(results):
            if isinstance(res, Exception):
                failed_path = rel_paths[i].as_posix()
                self.last_scan_errors[failed_path] = str(res)
                logger.error(f"Failed to scan file {failed_path}: {res}")
            elif res:
                scanned_posts.append(res)

        return scanned_posts
