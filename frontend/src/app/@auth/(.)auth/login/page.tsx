"use client";

import { LoginForm } from "@/components/auth/login-form";
import { RouteModal } from "@/components/ui/route-modal";

export default function LoginModalPage() {
  return (
    <RouteModal>
      <LoginForm onSuccess={() => {}} />
    </RouteModal>
  );
}
