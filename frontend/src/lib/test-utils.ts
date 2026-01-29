export const TEST_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

/**
 * 重置后端测试数据库
 * 调用后端 /api/test/db/reset 接口，清空并重建表结构
 */
export async function resetDB() {
  try {
    const res = await fetch(`${TEST_API_URL}/api/test/db/reset`, {
      method: "POST",
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Reset DB failed: ${res.status} ${text}`);
    }
    // console.log("Database reset successfully.");
  } catch (error) {
    console.error(
      "Critical: Failed to connect to Test Server at " + TEST_API_URL,
    );
    console.error(
      "Make sure to run 'python backend/scripts/run_test_server.py' in a separate terminal.",
    );
    throw error;
  }
}

/**
 * 模拟管理员登录获取 Token
 * 注意：必须在 resetDB 之后调用
 */
export async function loginAdmin() {
  const formData = new URLSearchParams();
  formData.append("username", "admin@example.com");
  formData.append("password", "changethis");

  const res = await fetch(`${TEST_API_URL}/api/v1/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to login as admin: ${res.status} ${text}`);
  }

  const data = await res.json();
  const token = data.access_token;

  // 设置 Cookie，供 Client 拦截器读取
  if (typeof document !== "undefined") {
    document.cookie = `access_token=${token}; path=/`;
  }

  return token;
}

/**
 * 等待一定时间 (Helpers)
 */
export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
