import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts";
import { Loader2, Mail, Lock, User } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (!username || !email || !password || !confirmPassword) {
        throw new Error("请填写所有字段");
      }

      if (password !== confirmPassword) {
        throw new Error("两次输入的密码不一致");
      }

      if (password.length < 6) {
        throw new Error("密码长度至少为 6 位");
      }

      await register({ username, email, password });
      navigate("/"); // 注册成功跳转首页
    } catch (err) {
      console.error("Register failed:", err);
      const message =
        err instanceof Error ? err.message : "注册失败，请稍后重试";
      setError(message);
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
            {/* 错误提示 */}
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 用户名输入 */}
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <div className="relative">
                  <User className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="选择用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isSubmitting}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* 邮箱输入 */}
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <div className="relative">
                  <Mail className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* 密码输入 */}
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Lock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* 确认密码输入 */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <div className="relative">
                  <Lock className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    className="pl-9"
                  />
                </div>
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
