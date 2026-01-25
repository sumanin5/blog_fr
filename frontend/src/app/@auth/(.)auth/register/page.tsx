"use client";

import { RegisterForm } from "@/components/auth/register-form";
import { RouteModal } from "@/components/ui/route-modal";

export default function RegisterModalPage() {
  return (
    <RouteModal title="注册新账号">
      <RegisterForm onSuccess={() => {}} />
    </RouteModal>
  );
}
