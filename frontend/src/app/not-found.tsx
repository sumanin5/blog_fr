"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { ArrowLeft, Home, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string>("");

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

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4">
      <motion.div
        variants={floatVariants}
        animate="float"
        className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
      />
      <motion.div
        variants={floatVariants}
        animate="float"
        transition={{ delay: 1 }}
        className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-secondary/20 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="mb-8 text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-6 flex justify-center gap-2 text-9xl font-black md:gap-4"
          >
            <motion.span
              variants={itemVariants}
              className="bg-gradient-to-b from-primary to-primary/60 bg-clip-text text-transparent"
            >
              4
            </motion.span>
            <motion.span
              variants={itemVariants}
              className="bg-gradient-to-b from-secondary to-secondary/60 bg-clip-text text-transparent"
            >
              0
            </motion.span>
            <motion.span
              variants={itemVariants}
              className="bg-gradient-to-b from-primary to-primary/60 bg-clip-text text-transparent"
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
              哎呀，页面未找到
            </h1>
            <p className="text-lg text-muted-foreground">
              你访问的页面似乎已经飞到太空去了 🚀
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <Card className="backdrop-blur-md bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                🔥 热门页面
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {[
                  { icon: "🏠", label: "首页", path: "/" },
                  { icon: "📝", label: "博客", path: "/posts" },
                  { icon: "👤", label: "关于", path: "/about" },
                  { icon: "📊", label: "仪表盘", path: "/admin/dashboard" },
                  { icon: "✨", label: "收藏集", path: "/collections" },
                  { icon: "📚", label: "归档", path: "/archives" },
                ].map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className="group relative overflow-hidden rounded-lg border border-border/50 bg-background/50 p-3 transition-all hover:border-primary/50 hover:bg-background/80"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />
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
                <Button
                  onClick={() => router.back()}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回上一页
                </Button>
                <Button asChild className="flex-1" size="lg">
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    返回首页
                  </Link>
                </Button>
              </div>

              <div className="border-t pt-4">
                <p className="mb-3 text-sm text-muted-foreground">
                  💡 或者你可以：
                </p>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/posts">
                    <FileText className="mr-2 h-4 w-4" />
                    浏览所有文章
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
            🎯 错误代码: 404 | 状态: 页面未找到
            {currentTime && ` | 时间: ${currentTime}`}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
