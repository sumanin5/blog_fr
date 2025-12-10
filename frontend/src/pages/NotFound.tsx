import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 🎨 404 Not Found 页面
 *
 * 设计特点：
 * - 酷炫的动画效果（浮动的 404 文字）
 * - 毛玻璃卡片设计
 * - 清晰的导航选项
 * - 响应式布局
 */
export default function NotFound() {
  const navigate = useNavigate();

  // 404 文字的容器动画
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  // 单个数字的动画
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10,
      },
    },
  };

  // 浮动动画
  const floatVariants = {
    float: {
      y: [0, -20, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4">
      {/* 背景装饰球 - 动画浮动 */}
      <motion.div
        variants={floatVariants}
        animate="float"
        className="bg-primary/20 absolute -top-40 -right-40 h-96 w-96 rounded-full blur-3xl"
      />
      <motion.div
        variants={floatVariants}
        animate="float"
        transition={{ delay: 1 }}
        className="bg-secondary/20 absolute -bottom-40 -left-40 h-96 w-96 rounded-full blur-3xl"
      />

      {/* 主容器 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-2xl"
      >
        {/* 404 大文字 - 分解动画 */}
        <div className="mb-8 text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-6 flex justify-center gap-2 text-9xl font-black md:gap-4"
          >
            {/* 第一个 4 */}
            <motion.span
              variants={itemVariants}
              className="from-primary to-primary/60 bg-linear-to-b bg-clip-text text-transparent"
            >
              4
            </motion.span>

            {/* 0 */}
            <motion.span
              variants={itemVariants}
              className="from-secondary to-secondary/60 bg-linear-to-b bg-clip-text text-transparent"
            >
              0
            </motion.span>

            {/* 第二个 4 */}
            <motion.span
              variants={itemVariants}
              className="from-primary to-primary/60 bg-linear-to-b bg-clip-text text-transparent"
            >
              4
            </motion.span>
          </motion.div>

          {/* 标题 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="space-y-2"
          >
            <h1 className="text-foreground text-3xl font-bold tracking-tight md:text-4xl">
              哎呀，页面未找到
            </h1>
            <p className="text-muted-foreground text-lg">
              你访问的页面似乎已经飞到太空去了 🚀
            </p>
          </motion.div>
        </div>

        {/* 卡片区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="border-border bg-card/50 rounded-2xl border p-8 shadow-xl backdrop-blur-md md:p-12"
        >
          {/* 可能的页面列表 */}
          <div className="mb-8">
            <h2 className="text-muted-foreground mb-4 text-sm font-semibold tracking-widest uppercase">
              🔥 热门页面
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {[
                { icon: "🏠", label: "首页", path: "/" },
                { icon: "📝", label: "博客", path: "/blog" },
                { icon: "👤", label: "关于", path: "/about" },
                { icon: "📊", label: "仪表盘", path: "/dashboard" },
                { icon: "✨", label: "MDX 展示", path: "/mdx-showcase" },
                { icon: "📚", label: "博客列表", path: "/blog" },
              ].map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="group border-border/50 bg-background/50 hover:border-primary/50 hover:bg-background/80 relative overflow-hidden rounded-lg border p-3 transition-all"
                >
                  <div className="from-primary/0 via-primary/10 to-primary/0 absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="relative text-center">
                    <div className="text-lg">{item.icon}</div>
                    <div className="text-foreground/80 text-xs font-medium">
                      {item.label}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 操作按钮组 */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex-1 gap-2"
              size="lg"
            >
              <ArrowLeft className="h-4 w-4" />
              返回上一页
            </Button>

            <Link to="/" className="flex-1">
              <Button className="w-full gap-2" size="lg">
                <Home className="h-4 w-4" />
                返回首页
              </Button>
            </Link>
          </div>

          {/* 搜索建议 */}
          <div className="border-border/50 mt-8 border-t pt-6">
            <p className="text-muted-foreground mb-4 text-sm">
              💡 或者你可以：
            </p>
            <Button
              variant="ghost"
              className="text-foreground/80 hover:text-foreground w-full justify-start gap-2"
            >
              <Search className="h-4 w-4" />
              使用搜索查找内容
            </Button>
          </div>
        </motion.div>

        {/* 底部彩蛋 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="text-muted-foreground mt-8 text-center text-xs"
        >
          <p>
            🎯 错误代码: 404 | 状态: 页面未找到 | 时间:{" "}
            {new Date().toLocaleTimeString()}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
