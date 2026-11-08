"""The app can pull, but cannot stage, commit or push."""
import pytest
from app.git_ops.exceptions import GitOpsReadOnlyError
from app.git_ops.git_client import GitClient

@pytest.mark.parametrize("method,args", [("add", (["."],)), ("commit", ("save",)), ("push", ())])
async def test_outbound_commands_are_rejected(method, args, tmp_path, mocker):
    client = GitClient(tmp_path)
    run = mocker.patch.object(client, "run", new_callable=mocker.AsyncMock)
    with pytest.raises(GitOpsReadOnlyError) as exc:
        await getattr(client, method)(*args)
    assert exc.value.status_code == 409
    run.assert_not_called()

async def test_pull_only_fast_forwards(tmp_path, mocker):
    client = GitClient(tmp_path)
    run = mocker.patch.object(client, "run", new_callable=mocker.AsyncMock, return_value=(0, "ok", ""))
    await client.pull(branch="content")
    run.assert_awaited_once_with("pull", "--ff-only", "origin", "content")


@pytest.mark.parametrize("command", ["push", "commit", "add", "config"])
async def test_run_rejects_non_read_only_commands(command, tmp_path):
    client = GitClient(tmp_path)
    with pytest.raises(GitOpsReadOnlyError):
        await client.run(command)


async def test_pull_has_no_fallback_push(tmp_path, mocker):
    client = GitClient(tmp_path)
    run = mocker.patch.object(
        client, "run", new_callable=mocker.AsyncMock, return_value=(1, "", "error")
    )
    with pytest.raises(Exception):
        await client.pull()
    assert run.call_count == 1
