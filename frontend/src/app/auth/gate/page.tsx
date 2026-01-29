"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { Home, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { verifyGatePassword } from "./actions";

export default function AuthGate() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isInputVisible, setIsInputVisible] = useState(false);

  useEffect(() => {
    // 使用 setTimeout 避免同步 setState 警告
    const timer = setTimeout(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 10 },
    },
  };

  const floatVariants: Variants = {
    float: {
      y: [0, -20, 0],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
    },
  };

  async function handleGateSubmit(formData: FormData) {
    const res = await verifyGatePassword(formData);
    if (res.success) {
      router.push("/auth/login");
      router.refresh();
    } else {
      // Small shake or error?
      console.error("Access Denied");
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 bg-background">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-size-[50px_50px]" />
      <motion.div
        variants={floatVariants}
        animate="float"
        className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl opacity-50"
      />
      <motion.div
        variants={floatVariants}
        animate="float"
        transition={{ delay: 1 }}
        className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-secondary/20 blur-3xl opacity-50"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div
          className="mb-8 text-center cursor-default"
          onDoubleClick={() => setIsInputVisible((prev) => !prev)}
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-6 flex justify-center gap-2 text-9xl font-black md:gap-4 select-none"
          >
            <motion.span
              variants={itemVariants}
              className="bg-linear-to-b from-primary to-primary/60 bg-clip-text text-transparent"
            >
              4
            </motion.span>
            <motion.span
              variants={itemVariants}
              className="bg-linear-to-b from-secondary to-secondary/60 bg-clip-text text-transparent"
            >
              0
            </motion.span>
            <motion.span
              variants={itemVariants}
              className="bg-linear-to-b from-primary to-primary/60 bg-clip-text text-transparent"
            >
              4
            </motion.span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="space-y-2"
          >
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              系统维护中
            </h1>
            <p className="text-lg text-muted-foreground">
              暂时无法访问该区域，请稍后再试 🚧
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <Card className="backdrop-blur-md bg-card/50 border-muted">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                <span>🔥 热门页面</span>
                {/* 隐蔽的触发点，或者直接放一个看起来像装饰的图标 */}
                <KeyRound
                  className="w-4 h-4 opacity-10 hover:opacity-100 cursor-pointer transition-opacity"
                  onClick={() => setIsInputVisible(!isInputVisible)}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 如果触发了开关，显示输入框 */}
              {isInputVisible && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-4"
                >
                  <form action={handleGateSubmit} className="flex gap-2">
                    <Input
                      name="password"
                      type="password"
                      placeholder="Terminal Access Code..."
                      className="bg-background/50 font-mono text-sm"
                      autoFocus
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      Verify
                    </Button>
                  </form>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {[
                  { icon: "🏠", label: "首页", path: "/" },
                  { icon: "📝", label: "文章", path: "/posts/articles" },
                  { icon: "👤", label: "关于", path: "/about" },
                ].map((item) => (
                  <Link
                    key={item.path}
                    href={item.path as any}
                    className="group relative overflow-hidden rounded-lg border border-border/50 bg-background/50 p-3 transition-all hover:border-primary/50 hover:bg-background/80"
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="relative text-center">
                      <div className="text-lg">{item.icon}</div>
                      <div className="text-xs font-medium text-foreground/80">
                        {item.label}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="flex-1" size="lg">
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    返回首页
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mt-8 text-center text-xs text-muted-foreground"
        >
          <p>
            🎯 系统状态: 正常 | 节点: CN-HK-01
            {currentTime && ` | 时间: ${currentTime}`}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
