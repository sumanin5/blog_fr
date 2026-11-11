"""旧版回写入口：单向同步模式下拒绝执行。"""

from app.git_ops.exceptions import GitOpsReadOnlyError
from .base import BaseGitOpsService


class ExportService(BaseGitOpsService):
    async def export_to_git(self, post_id=None, default_user=None, force_export=False):
        raise GitOpsReadOnlyError()
