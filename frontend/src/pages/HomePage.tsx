import { Button } from "@/shared/components/ui-extended";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Globe,
  Cpu,
  Code,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * 🏠 首页组件
 *
 * 设计特点：
 * 1. 科技感渐变背景
 * 2. 响应式布局
 * 3. 使用 shadcn/ui 组件
 * 4. 平滑的悬停动画
 */
export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      {/* ============================================
          Hero 区域 - 主视觉区
          ============================================ */}
      <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-48">
        {/* 主内容容器 */}
        <div className="container mx-auto flex max-w-5xl flex-col items-center space-y-8 px-4 text-center md:px-6">
          {/* 状态徽章 */}
          <div className="border-primary/20 bg-background/50 text-primary animate-in fade-in slide-in-from-top mb-4 inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium backdrop-blur duration-500">
            <span className="bg-primary mr-2 flex h-2 w-2 animate-pulse rounded-full" />
            系统状态：在线运行中
          </div>

          {/* 主标题 */}
          <h1 className="from-foreground to-foreground/60 animate-in fade-in slide-in-from-bottom-4 bg-linear-to-b bg-clip-text text-4xl leading-[1.1] font-bold tracking-tighter text-transparent duration-700 md:text-6xl lg:text-7xl">
            为下一代开发者
            <br className="hidden sm:inline" />
            <span className="text-primary">打造的知识平台</span>
          </h1>

          {/* 副标题 */}
          <p className="text-muted-foreground animate-in fade-in slide-in-from-bottom-6 mx-auto max-w-[700px] text-lg leading-relaxed delay-150 duration-700 md:text-xl">
            极简设计，强大功能。专为开发者、设计师和技术爱好者打造的现代化内容平台。
          </p>

          {/* CTA 按钮组 */}
          <div className="animate-in fade-in slide-in-from-bottom-8 flex w-full flex-col justify-center gap-4 pt-4 sm:flex-row">
            <Button
              size="lg"
              className="group h-12 px-8 text-base"
              onClick={() => navigate("/blog")}
            >
              开始阅读
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base"
              onClick={() => navigate("/register")}
            >
              加入社区
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================
          统计数据区域
          ============================================ */}
      <section className="border-border/40 bg-background/50 border-y backdrop-blur-sm">
        <div className="container mx-auto px-4 py-12 md:px-6">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            <StatCard number="10K+" label="开发者" />
            <StatCard number="500+" label="技术文章" />
            <StatCard number="99.9%" label="系统可用性" />
            <StatCard number="0.2s" label="响应延迟" />
          </div>
        </div>
      </section>

      {/* ============================================
          特性展示区域
          ============================================ */}
      <section className="container mx-auto px-4 py-24 md:px-6">
        {/* 区域标题 */}
        <div className="mb-16 flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter md:text-5xl">
            为性能而生
          </h2>
          <p className="text-muted-foreground max-w-[900px] text-lg">
            采用最新技术栈构建，确保流畅的阅读体验
          </p>
        </div>

        {/* 特性卡片网格 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Sparkles className="h-10 w-10" />}
            title="AI 智能摘要"
            description="集成 Google Gemini，一键生成技术文章的精准摘要，快速掌握核心内容。"
          />
          <FeatureCard
            icon={<Zap className="h-10 w-10" />}
            title="极速加载"
            description="基于 React + Vite 构建，实现近零延迟的内容加载和丝滑的页面切换。"
          />
          <FeatureCard
            icon={<Shield className="h-10 w-10" />}
            title="安全可靠"
            description="企业级安全标准，数据加密存储，安全的身份认证机制保护用户隐私。"
          />
          <FeatureCard
            icon={<Globe className="h-10 w-10" />}
            title="全球加速"
            description="通过边缘网络分发内容，确保全球任何地点都能获得低延迟访问体验。"
          />
          <FeatureCard
            icon={<Cpu className="h-10 w-10" />}
            title="现代技术栈"
            description="采用最新的 React 架构和 Tailwind CSS，代码简洁高效，易于维护。"
          />
          <FeatureCard
            icon={<Code className="h-10 w-10" />}
            title="开发者友好"
            description="语法高亮、代码片段、技术深度解析，专为工程师量身定制的阅读体验。"
          />
        </div>
      </section>

      {/* ============================================
          CTA 行动召唤区域
          ============================================ */}
      <section className="container mx-auto px-4 py-24 md:px-6">
        <div className="border-primary/20 bg-card/50 relative overflow-hidden rounded-3xl border px-6 py-16 text-center backdrop-blur-sm md:px-16 md:py-24">
          {/* CTA 内容 */}
          <div className="relative z-10 mx-auto max-w-3xl space-y-6">
            <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
              准备好升级你的知识库了吗？
            </h2>
            <p className="text-muted-foreground text-lg">
              加入数千名开发者，每天从这里获取最新的技术洞察和深度文章。
            </p>
            <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
              <Button
                size="lg"
                className="h-12 px-8"
                onClick={() => navigate("/register")}
              >
                创建账号
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8"
                onClick={() => navigate("/blog")}
              >
                浏览文章
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8"
                onClick={() => navigate("/mdx-showcase")}
              >
                MDX 展示
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * 📊 统计数据卡片组件
 */
function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="group cursor-default space-y-2">
      <h3 className="group-hover:text-primary font-mono text-3xl font-bold transition-colors">
        {number}
      </h3>
      <p className="text-muted-foreground text-sm tracking-widest uppercase">
        {label}
      </p>
    </div>
  );
}

/**
 * ✨ 特性卡片组件
 *
 * 使用 shadcn/ui 的 Card 组件
 * 添加了悬停动画和图标背景效果
 */
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="group border-border/50 bg-background/50 hover:bg-muted/50 hover:border-primary/50 relative overflow-hidden transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg">
      <CardContent className="p-8">
        {/* 图标容器 */}
        <div className="bg-primary/10 text-primary group-hover:bg-primary/20 mb-4 inline-flex items-center justify-center rounded-lg p-3 transition-colors">
          {icon}
        </div>

        {/* 标题 */}
        <h3 className="mb-2 text-xl font-bold">{title}</h3>

        {/* 描述 */}
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
