"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Mail, Lock, User, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validateRegister } from "@/lib/validations/auth";

interface RegisterState {
  success?: boolean;
  message?: string;
  errors?: {
    username?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
    general?: string[];
  } | null;
  redirectTo?: string;
}

interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { register } = useAuth();
  const router = useRouter();

  async function registerAction(
    _prevState: RegisterState | null,
    formData: FormData
  ): Promise<RegisterState> {
    const rawData = {
      username: (formData.get("username") as string) || "",
      email: (formData.get("email") as string) || "",
      password: (formData.get("password") as string) || "",
      confirmPassword: (formData.get("confirmPassword") as string) || "",
    };

    const validation = validateRegister(rawData);

    if (!validation.success) {
      const errors: { [key: string]: string[] } = {};
      validation.error.issues.forEach((err) => {
        const field = err.path[0] as string;
        if (!errors[field]) errors[field] = [];
        errors[field].push(err.message);
      });

      return {
        success: false,
        message: "请检查输入内容",
        errors,
      };
    }

    try {
      await register({
        username: validation.data.username,
        email: validation.data.email,
        password: validation.data.password,
      });

      return {
        success: true,
        message: "注册成功！正在跳转到登录页...",
        redirectTo: "/auth/login",
      };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "注册失败，请稍后重试";
      return {
        success: false,
        message: errorMessage,
        errors: {
          general: [errorMessage],
        },
      };
    }
  }

  const [state, action, isPending] = useActionState(registerAction, null);

  useEffect(() => {
    if (state?.success && state?.redirectTo) {
      if (onSuccess) {
        onSuccess();
      }
      const timer = setTimeout(() => {
        router.push(state.redirectTo!);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state?.success, state?.redirectTo, router, onSuccess]);

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">注册</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          创建新账号，开始你的旅程
        </p>
      </div>

      <form action={action} className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <div className="relative">
              <User className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="请输入用户名"
                disabled={isPending}
                className="pl-9"
                required
              />
            </div>
            {state?.errors?.username && (
              <p className="text-destructive text-xs">
                {state.errors.username[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <div className="relative">
              <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@mail.com"
                disabled={isPending}
                className="pl-9"
                required
              />
            </div>
            {state?.errors?.email && (
              <p className="text-destructive text-xs">
                {state.errors.email[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <div className="relative">
              <Lock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="请输入密码"
                disabled={isPending}
                className="pl-9"
                required
              />
            </div>
            {state?.errors?.password && (
              <p className="text-destructive text-xs">
                {state.errors.password[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认密码</Label>
            <div className="relative">
              <Lock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                disabled={isPending}
                className="pl-9"
                required
              />
            </div>
            {state?.errors?.confirmPassword && (
              <p className="text-destructive text-xs">
                {state.errors.confirmPassword[0]}
              </p>
            )}
          </div>
        </div>

        {state?.success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        {state?.errors?.general && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.errors.general[0]}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              创建中...
            </>
          ) : (
            "立即注册"
          )}
        </Button>
      </form>

      <div className="text-muted-foreground mt-6 text-center text-sm">
        已有账号?{" "}
        <Link
          href="/auth/login"
          className="text-primary hover:underline font-medium"
        >
          去登录
        </Link>
      </div>
    </div>
  );
}
