import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

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
          return async () => { serverProcess.kill(); };
        }
      } catch {
        // Retry until the deadline; an HTTP error never counts as ready.
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error("Python test server did not become ready within 30 seconds");
  } catch (error) {
    serverProcess.kill();
    throw error;
  }
}
