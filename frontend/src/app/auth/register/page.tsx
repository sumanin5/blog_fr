import { checkAuthGate } from "@/app/auth/check-gate";
import { RegisterView } from "./view";

// 🔴 强制动态渲染
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  await checkAuthGate();

  return <RegisterView />;
}
