"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validateLogin } from "@/lib/validations/auth";

interface LoginState {
  success?: boolean;
  message?: string;
  errors?: {
    username?: string[];
    password?: string[];
    general?: string[];
  } | null;
  redirectTo?: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  async function loginAction(
    _prevState: LoginState | null,
    formData: FormData
  ): Promise<LoginState> {
    const rawData = {
      username: (formData.get("username") as string) || "",
      password: (formData.get("password") as string) || "",
    };

    const validation = validateLogin(rawData);

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
      await login(validation.data);
      return {
        success: true,
        message: "登录成功！正在跳转...",
        redirectTo: "/",
      };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "登录失败，请检查用户名或密码";
      return {
        success: false,
        message: errorMessage,
        errors: {
          general: [errorMessage],
        },
      };
    }
  }

  const [state, action, isPending] = useActionState(loginAction, null);

  useEffect(() => {
    if (state?.success && state?.redirectTo) {
      const timer = setTimeout(() => {
        router.push(state.redirectTo!);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state?.success, state?.redirectTo, router]);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="border-border bg-card/50 rounded-2xl border p-8 shadow-xl backdrop-blur-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">登录</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              欢迎回来，请输入您的账号密码
            </p>
          </div>

          <form action={action} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="请输入账号"
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

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                "立即登录"
              )}
            </Button>
          </form>

          <div className="text-muted-foreground mt-6 text-center text-sm">
            还没有账号?{" "}
            <Link
              href="/auth/register"
              className="text-primary hover:underline font-medium"
            >
              去注册
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
