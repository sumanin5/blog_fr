"""旧版回写入口：单向同步模式下拒绝执行。"""

from app.git_ops.exceptions import GitOpsReadOnlyError
from .base import BaseGitOpsService


class CommitService(BaseGitOpsService):
    async def auto_commit(self, message: str):
        raise GitOpsReadOnlyError()
