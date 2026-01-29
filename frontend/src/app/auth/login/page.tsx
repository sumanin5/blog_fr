import { checkAuthGate } from "@/app/auth/check-gate";
import { LoginView } from "./view";

export default async function LoginPage() {
  await checkAuthGate();

  return <LoginView />;
}
