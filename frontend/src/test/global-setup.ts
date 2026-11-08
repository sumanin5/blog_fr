import { spawn, spawnSync, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

let serverProcess: ChildProcess | null = null;

function stopServer() {
  if (!serverProcess) return;
  if (process.platform === "win32") {
    // uv 是父进程，真正的 Python 服务是子进程；需要结束整棵进程树。
    spawnSync("taskkill", ["/pid", String(serverProcess.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    serverProcess.kill();
  }
  serverProcess = null;
}

export default async function setup() {
  console.log(
    "\n🚀 Starting Python Test Server (backend/scripts/run_test_server.py)...",
  );

  // Adjust path relative to frontend directory
  // frontend/src/test/global-setup.ts -> ../../../backend/scripts/run_test_server.py
  // Assuming CWD when running vitest is 'frontend' root.
  const backendScript = path.resolve(
    __dirname,
    "../../../backend/scripts/run_test_server.py",
  );

  if (!fs.existsSync(backendScript)) {
    console.error(`❌ Backend script not found at: ${backendScript}`);
    // Fallback or error, but let's try to find it from project root if CWD is wrong
    throw new Error(`Test server script missing: ${backendScript}`);
  }

  // Spawn the python process
  // Ensure 'python' is in your PATH and corresponds to the correct venv
  // If you are using uv/pory/virtualenv, you might need 'python3' or absolute path.
  // We assume 'python' works as it did in the CLI.
  // Spawn the python process using 'uv' to ensure dependencies are loaded
  // and to avoid 'python not found' errors on systems where only python3 exists.
  // IMPORTANT: CWD must be 'backend' so uv finds pyproject.toml
  serverProcess = spawn("uv", ["run", "python", backendScript], {
    cwd: path.resolve(__dirname, "../../../backend"),
    stdio: "inherit",
    env: {
      ...process.env,
      // Windows 控制台默认 GBK，脚本里的 emoji 会触发 UnicodeEncodeError。
      PYTHONIOENCODING: "utf-8",
      PYTHONUTF8: "1",
    },
  });

  // Wait for the server to be ready
  // A simple way is to retry fetching the health/root endpoint until it works or times out.
  const TEST_SERVER_URL = "http://localhost:8001";
  let retries = 30; // 30 * 500ms = 15 seconds max wait
  let connected = false;

  while (retries > 0) {
    try {
      // Trying to connect to the test server root or health check
      // Assuming GET / gives 200 or 404 but connection is accepted
      const res = await fetch(`${TEST_SERVER_URL}/docs`);
      if (res.ok || res.status < 500) {
        connected = true;
        console.log("✅ Python Test Server is ready!");
        break;
      }
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 500));
    retries--;
  }

  if (!connected) {
    stopServer();
    throw new Error(
      "❌ Failed to connect to Python Test Server after 15 seconds.",
    );
  }

  // Return teardown function
  return async () => {
    console.log("\n🛑 Stopping Python Test Server...");
    stopServer();
  };
}
