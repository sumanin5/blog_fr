import { spawn, spawnSync, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

function stopServer(serverProcess: ChildProcess) {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  if (process.platform === "win32") {
    // uv 是父进程，真正的 Python 服务是子进程；需要结束整棵进程树。
    spawnSync("taskkill", ["/pid", String(serverProcess.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    serverProcess.kill();
  }
}

export default async function setup() {
  const backendDir = path.resolve(__dirname, "../../../backend");
  const backendScript = path.join(backendDir, "scripts/run_test_server.py");
  if (!fs.existsSync(backendScript)) {
    throw new Error(`Test server script missing: ${backendScript}`);
  }

  // Vitest owns the server lifecycle; CI must not start a second copy.
  const databaseDir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-fr-test-"));
  const serverProcess = spawn("uv", ["run", "--frozen", "python", backendScript], {
    cwd: backendDir,
    stdio: "inherit",
    env: {
      ...process.env,
      // Windows 控制台默认 GBK，脚本里的 emoji 会触发 UnicodeEncodeError。
      PYTHONIOENCODING: "utf-8",
      PYTHONUTF8: "1",
      FIRST_SUPERUSER: process.env.FIRST_SUPERUSER || "admin@example.com",
      FIRST_SUPERUSER_EMAIL:
        process.env.FIRST_SUPERUSER_EMAIL || "admin@example.com",
      FIRST_SUPERUSER_PASSWORD:
        process.env.FIRST_SUPERUSER_PASSWORD || "changethis",
      TEST_DATABASE_URL: `sqlite+aiosqlite:///${path.join(databaseDir, "test.db")}`,
    },
  });
  let startupError: Error | undefined;
  const removeDatabase = () => fs.rmSync(databaseDir, { recursive: true, force: true });
  serverProcess.once("exit", removeDatabase);
  serverProcess.on("error", (error) => {
    startupError = error;
    removeDatabase();
  });
  const deadline = Date.now() + 30_000;

  try {
    while (Date.now() < deadline) {
      if (startupError) throw startupError;
      if (serverProcess.exitCode !== null || serverProcess.signalCode !== null) {
        throw new Error("Python test server exited before becoming ready");
      }
      try {
        const response = await fetch("http://127.0.0.1:8001/health/ready", {
          signal: AbortSignal.timeout(1000),
        });
        if (response.ok) {
          return async () => {
            console.log("\n🛑 Stopping Python Test Server...");
            stopServer(serverProcess);
          };
        }
      } catch {
        // Retry until the deadline; an HTTP error never counts as ready.
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("Python test server did not become ready within 30 seconds");
  } catch (error) {
    stopServer(serverProcess);
    throw error;
  }
}
