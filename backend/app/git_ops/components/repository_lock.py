"""Serialize imports across workers sharing a content checkout.

The kernel releases the lock when the file is closed or a worker exits. Never
unlink the lock file: another process may already be waiting on its inode.
"""

import asyncio
import errno
import os
from contextlib import asynccontextmanager
from pathlib import Path


@asynccontextmanager
async def lock_repository(path: Path):
    with path.open("a+b") as handle:
        if os.name == "nt":
            import msvcrt

            if path.stat().st_size == 0:
                handle.write(b"\0")
                handle.flush()

            def acquire():
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl

            def acquire():
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)

        while True:
            try:
                acquire()
                break
            except OSError as exc:
                if exc.errno not in (errno.EACCES, errno.EAGAIN):
                    raise
                await asyncio.sleep(0.1)
        yield  # The surrounding `with` closes/releases even on cancellation.
