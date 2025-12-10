import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts";
import { Loader2, Mail, Lock, User, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// 表单错误类型
interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // 表单验证逻辑
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // 验证用户名
    if (!username.trim()) {
      newErrors.username = "请输入用户名";
    }

    // 验证邮箱
    if (!email.trim()) {
      newErrors.email = "请输入邮箱";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "邮箱格式不正确";
    }

    // 验证密码
    if (!password) {
      newErrors.password = "请输入密码";
    } else if (password.length < 6) {
      newErrors.password = "密码至少6位";
    }

    // 验证确认密码
    if (!confirmPassword) {
      newErrors.confirmPassword = "请确认密码";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "两次密码输入不一致";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // 首先验证表单
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await register({ username, email, password });
      navigate("/auth/login"); // 注册成功跳转登录页
    } catch (err) {
      console.error("Register failed:", err);
      const message =
        err instanceof Error ? err.message : "注册失败，请稍后重试";
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
              注册
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              创建新账号，开始你的旅程
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
                  <User className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
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

              {/* 邮箱输入 */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className={errors.email ? "text-destructive" : ""}
                >
                  邮箱
                </Label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@mail.com"
                    value={email}
                    onChange={(e) => {
                      const newEmail = e.target.value;
                      setEmail(newEmail);
                      // 只有当用户修正了错误时才清除
                      if (
                        errors.email &&
                        newEmail.trim() &&
                        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)
                      ) {
                        setErrors({ ...errors, email: undefined });
                      }
                    }}
                    disabled={isSubmitting}
                    className={`pl-9 ${errors.email ? "border-destructive" : ""}`}
                    aria-invalid={!!errors.email}
                  />
                </div>
                {errors.email && (
                  <p className="text-destructive flex items-center gap-1 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* 密码输入 */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className={errors.password ? "text-destructive" : ""}
                >
                  密码
                </Label>
                <div className="relative">
                  <Lock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
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

              {/* 确认密码输入 */}
              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className={errors.confirmPassword ? "text-destructive" : ""}
                >
                  确认密码
                </Label>
                <div className="relative">
                  <Lock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="请再次输入密码"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) {
                        setErrors({ ...errors, confirmPassword: undefined });
                      }
                    }}
                    disabled={isSubmitting}
                    className={`pl-9 ${errors.confirmPassword ? "border-destructive" : ""}`}
                    aria-invalid={!!errors.confirmPassword}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-destructive flex items-center gap-1 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    {errors.confirmPassword}
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
                    创建中...
                  </>
                ) : (
                  "立即注册"
                )}
              </Button>
            </form>
          </div>

          {/* 底部链接 */}
          <div className="text-muted-foreground mt-6 text-center text-sm">
            已有账号?{" "}
            <Link
              to="/auth/login"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              去登录
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
