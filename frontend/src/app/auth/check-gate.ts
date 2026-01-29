import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * 门卫检查函数
 * 用于在页面加载前检查用户权限：
 * 1. 是否已登录（已登录 -> 首页）
 * 2. 是否通过门卫（未通过 -> 门卫页）
 */
export async function checkAuthGate() {
  const cookieStore = await cookies();

  // 1. 检查是否已登录 (存在 access_token)
  // 如果已登录，不需要再访问登录/注册页，直接回首页
  const accessToken = cookieStore.get("access_token");
  if (accessToken) {
    redirect("/");
  }

  // 2. 检查门卫通行证
  const gateSecret = process.env.AUTH_GATE_SECRET;
  const hasGatePass = cookieStore.get("auth_gate_pass");

  // 如果配置了门卫密码，且用户没有通行证，则拦截
  if (gateSecret && !hasGatePass) {
    redirect("/auth/gate");
  }
}
