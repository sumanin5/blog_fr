import { useActionState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/features/auth";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

// 导入 Shadcn UI 组件
import { Button } from "@/shared/components/ui-extended";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

// 导入 Zod 验证
import { validateLogin } from "@/shared/lib/validations/auth";

// 在组件内部定义接口类型
interface LoginState {
  success?: boolean;
  message?: string;
  errors?: {
    username?: string[];
    password?: string[];
    general?: string[];
  } | null;
  redirectTo?: string;  // 登录成功后的跳转
}

// 采用 React 19 的新写法
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // React 19 登录处理函数
  async function loginAction(
    _prevState: LoginState | null,
    formData: FormData
  ): Promise<LoginState> {
    // 从 FormData 中提取数据
    const rawData = {
      username: (formData.get('username') as string) || '',
      password: (formData.get('password') as string) || ''
    };
    console.log('🔐 开始登录流程:', { username: rawData.username });

    // 🔍 使用 Zod 进行客户端验证
    const validation = validateLogin(rawData);

    if (!validation.success) {
      // 转换 Zod 错误格式为组件期望的格式
      const errors: { [key: string]: string[] } = {};
      validation.error.issues.forEach((err) => {
        const field = err.path[0] as string;
        if (!errors[field]) {
          errors[field] = [];
        }
        errors[field].push(err.message);
      });

      return {
        success: false,
        message: '请检查输入内容',
        errors
      };
    }

    // 验证通过，获取类型安全的数据
    const loginData = validation.data;

    try {
      // 🌐 调用登录 API
      console.log('🚀 调用登录接口...');
      await login(loginData);

      console.log('✅ 登录成功!');

      // 🎉 登录成功 - 在这里处理跳转
      return {
        success: true,
        message: '登录成功！正在跳转...',
        redirectTo: '/' // 标记需要跳转
      };

    } catch (err) {
      console.error('❌ 登录失败:', err);

      const errorMessage = err instanceof Error
        ? err.message
        : '登录失败，请检查用户名或密码';

      return {
        success: false,
        message: errorMessage,
        errors: {
          general: [errorMessage]
        }
      };
    }
  }

  const [state, action, isPending] = useActionState(loginAction, null);

  // 🔄 监听登录成功状态，处理跳转
  useEffect(() => {
    if (state?.success && state?.redirectTo) {
      // 延迟跳转，让用户看到成功消息
      const timer = setTimeout(() => {
        navigate(state.redirectTo!);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [state?.success, state?.redirectTo, navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="border-border bg-card/50 rounded-2xl border p-8 shadow-xl backdrop-blur-md">
          {/* 标题区域 */}
          <div className="mb-8 text-center">
            <h1 className="text-foreground text-3xl font-bold tracking-tight">
              登录
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              欢迎回来，请输入您的账号密码
            </p>
          </div>

          {/* 表单区域 */}
          <div className="space-y-6">
            {/* 使用原生 HTML form 配合 React 19 的 action */}
            <form action={action} className="space-y-4">
              {/* 用户名输入 */}
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className={state?.errors?.username ? "text-destructive" : ""}
                >
                  用户名
                </Label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="请输入账号"
                    disabled={isPending}
                    className={`pl-9 ${state?.errors?.username ? "border-destructive" : ""}`}
                    aria-invalid={!!state?.errors?.username}
                    required
                  />
                </div>
                {state?.errors?.username && (
                  <p className="text-destructive flex items-center gap-1 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    {state.errors.username[0]}
                  </p>
                )}
              </div>

              {/* 密码输入 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className={state?.errors?.password ? "text-destructive" : ""}
                  >
                    密码
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="请输入密码"
                    disabled={isPending}
                    className={`pl-9 ${state?.errors?.password ? "border-destructive" : ""}`}
                    aria-invalid={!!state?.errors?.password}
                    required
                    minLength={6}
                  />
                </div>
                {state?.errors?.password && (
                  <p className="text-destructive flex items-center gap-1 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    {state.errors.password[0]}
                  </p>
                )}
              </div>

              {/* 成功消息提示 - 放在提交按钮上方 */}
              {state?.success && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              )}

              {/* 通用错误提示 - 放在提交按钮上方 */}
              {state?.errors?.general && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{state.errors.general[0]}</AlertDescription>
                </Alert>
              )}

              {/* 提交按钮 */}
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
          </div>

          {/* 底部链接 */}
          <div className="center text-muted-foreground mt-6 text-center text-sm">
            还没有账号?{" "}
            <Link
              to="/auth/register"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              去注册
            </Link>
            <span className="mx-3"> | </span>
            <Link
              to="/forgot-password"
              className="text-primary hover:text-primary/80 text-sm transition-colors"
            >
              忘记密码?
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
