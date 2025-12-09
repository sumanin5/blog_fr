import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

// 1. 导入 Shadcn UI 组件
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Login() {
  // 2. 状态管理
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // 3. 提交处理
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(""); // 每次提交前清空旧错误

    try {
      if (!username || !password) {
        throw new Error("请输入用户名和密码");
      }

      await login({ username, password });
      navigate("/"); // 登录成功跳转首页
    } catch (err: any) {
      console.error("Login failed:", err);
      // 处理错误信息（这里简单处理，实际可以根据 err.response 解析具体原因）
      setError(err.message || "登录失败，请检查用户名或密码");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // 4. 外层容器：全屏 + Flex 居中
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      {/* 5. 卡片组件：宽度固定为 350px (在移动端 w-full) */}
      <Card className="w-full max-w-[350px] shadow-lg">
        {/* 卡片头部：标题和副标题 */}
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">登录</CardTitle>
          <CardDescription className="text-center">
            欢迎回来，请输入您的账号密码
          </CardDescription>
        </CardHeader>

        {/* 卡片内容：表单 */}
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 错误提示区域 */}
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 用户名输入组 */}
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="例如：tomy"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting} // 提交时禁用
              />
            </div>

            {/* 密码输入组 */}
            <div className="space-y-2">
              {/* Flex 布局让 Label 和 '忘记密码' 左右分布 */}
              <div className="flex items-center justify-between">
                <Label htmlFor="password">密码</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-600 hover:underline"
                >
                  忘记密码?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* 提交按钮：宽度 100% */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
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
        </CardContent>

        {/* 卡片底部：注册链接 */}
        <CardFooter className="mt-2 justify-center border-t p-4">
          <div className="text-sm text-gray-500">
            还没有账号?{" "}
            <Link
              to="/register"
              className="font-semibold text-blue-600 hover:underline"
            >
              去注册
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
