import { checkAuthGate } from "@/app/auth/check-gate";
import { RegisterView } from "./view";

export default async function RegisterPage() {
  await checkAuthGate();

  return <RegisterView />;
}
