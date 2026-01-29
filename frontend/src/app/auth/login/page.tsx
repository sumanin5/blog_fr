import { checkAuthGate } from "@/app/auth/check-gate";
import { LoginView } from "./view";

// 🔴 强制动态渲染：这一步至关重要！
// 它确保 checkAuthGate 在每次请求时都会真实执行，而不是直接返回构建时生成的静态 HTML。
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await checkAuthGate();

  return <LoginView />;
}
