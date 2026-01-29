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

  // 1. [唯一任务] 检查门卫通行证 (Gate Check)
  const gateSecret = process.env.AUTH_GATE_SECRET;
  const hasGatePass = cookieStore.get("auth_gate_pass");

  console.log(
    "🔒 [AuthGate Check] Secret:",
    gateSecret ? "Set (Hidden)" : "NOT SET",
  );
  console.log("🔒 [AuthGate Check] User Pass:", hasGatePass ? "Valid" : "None");

  if (gateSecret && !hasGatePass) {
    redirect("/auth/gate");
  }

  // 移除自动跳转首页的逻辑，防止干扰测试
  // 用户是否已登录由页面组件或 Hook 自行判断，这里只负责挡住未授权的门卫访问
}
