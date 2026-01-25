"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";

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
  fields?: {
    username?: string;
  };
}

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const callbackUrl = searchParams.get("callbackUrl") || "/";

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
      const errors: Record<string, string[]> = {};
      validation.error.issues.forEach((err) => {
        const field = err.path[0] as string;
        if (!errors[field]) errors[field] = [];
        errors[field].push(err.message);
      });

      return {
        success: false,
        message: "请检查输入内容",
        errors,
        fields: { username: rawData.username },
      };
    }

    try {
      await login(validation.data);
      return {
        success: true,
        message: "登录成功！正在跳转...",
        redirectTo: callbackUrl,
      };
    } catch (err: any) {
      // 🚀 核心思想：优先相信后端翻译好的 message
      const fieldErrors: Record<string, string[]> = {};

      // 处理精细的表单验证错误（422）
      if (err.details?.validation_errors) {
        err.details.validation_errors.forEach(
          (e: { field: string; message: string }) => {
            fieldErrors[e.field] = [e.message];
          }
        );
      }

      // 如果有具体的 code，我们可以根据业务需要做本地覆盖，否则直接用后端的 message
      let finalMsg = err.message || "登录失败";

      if (err.code === "INVALID_CREDENTIALS") {
        finalMsg = "密码输入错误";
      } else if (err.code === "USER_NOT_FOUND") {
        finalMsg = "该账号尚未注册";
      } else if (err.code === "INACTIVE_USER") {
        finalMsg = "账号已被锁定，请联系管理员";
      }

      return {
        success: false,
        message: finalMsg,
        errors: {
          ...fieldErrors,
          general: [finalMsg],
        },
        fields: { username: rawData.username },
      };
    }
  }

  const [state, action, isPending] = useActionState(loginAction, null);

  useEffect(() => {
    if (state?.success && state?.redirectTo) {
      if (onSuccess) {
        onSuccess();
      }
      const timer = setTimeout(() => {
        router.push(state.redirectTo as any);
        router.refresh();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [state?.success, state?.redirectTo, router, onSuccess]);

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight italic uppercase">
          登录
        </h1>
        <p className="text-muted-foreground mt-2 text-sm italic">
          欢迎回来，请输入您的账号密码
        </p>
      </div>

      <form action={action} key={state?.message} className="space-y-6">
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
                defaultValue={state?.fields?.username}
                required
              />
            </div>
            {state?.errors?.username && (
              <p className="text-destructive text-xs italic">
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
                type={showPassword ? "text" : "password"}
                placeholder="请输入密码"
                disabled={isPending}
                className="px-9"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground absolute top-3 right-3 h-4 w-4 transition-colors focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {state?.errors?.password && (
              <p className="text-destructive text-xs italic">
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
          className="w-full font-bold tracking-widest transition-transform active:scale-95"
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
          className="text-primary hover:underline font-bold"
        >
          去注册
        </Link>
      </div>
    </div>
  );
}
