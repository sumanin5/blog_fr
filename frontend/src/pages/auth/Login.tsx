import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

// 1. 导入 Shadcn UI 组件
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// 表单错误类型
interface FormErrors {
  username?: string;
  password?: string;
  general?: string;
}

export default function Login() {
  // 2. 状态管理
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // 3. 表单验证逻辑
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // 验证用户名
    if (!username.trim()) {
      newErrors.username = "请输入账号";
    }

    // 验证密码
    if (!password) {
      newErrors.password = "请输入密码";
    } else if (password.length < 6) {
      newErrors.password = "密码至少6位";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 4. 提交处理
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // 首先验证表单
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await login({ username, password });
      navigate("/"); // 登录成功跳转首页
    } catch (err) {
      console.error("Login failed:", err);
      const message =
        err instanceof Error ? err.message : "登录失败，请检查用户名或密码";
      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            {/* 通用错误提示 */}
            {errors.general && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.general}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 用户名输入 */}
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className={errors.username ? "text-destructive" : ""}
                >
                  用户名
                </Label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="请输入账号"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      // 清空该字段的错误
                      if (errors.username) {
                        setErrors({ ...errors, username: undefined });
                      }
                    }}
                    disabled={isSubmitting}
                    className={`pl-9 ${errors.username ? "border-destructive" : ""}`}
                    aria-invalid={!!errors.username}
                  />
                </div>
                {errors.username && (
                  <p className="text-destructive flex items-center gap-1 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    {errors.username}
                  </p>
                )}
              </div>

              {/* 密码输入 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className={errors.password ? "text-destructive" : ""}
                  >
                    密码
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-primary hover:text-primary/80 text-xs transition-colors"
                  >
                    忘记密码?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      // 清空该字段的错误
                      if (errors.password) {
                        setErrors({ ...errors, password: undefined });
                      }
                    }}
                    disabled={isSubmitting}
                    className={`pl-9 ${errors.password ? "border-destructive" : ""}`}
                    aria-invalid={!!errors.password}
                  />
                </div>
                {errors.password && (
                  <p className="text-destructive flex items-center gap-1 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* 提交按钮 */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
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
          <div className="text-muted-foreground mt-6 text-center text-sm">
            还没有账号?{" "}
            <Link
              to="/auth/register"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              去注册
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
