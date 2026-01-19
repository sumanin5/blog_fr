import hashlib
from typing import Union


def calc_hash(content: Union[str, bytes]) -> str:
    """计算内容的 SHA256"""
    if isinstance(content, str):
        content = content.encode("utf-8")
    return hashlib.sha256(content).hexdigest()
