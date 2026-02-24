"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stacks = [
  { label: "后端", icon: "⚙️", items: ["FastAPI", "Django", "Python 3.13", "SQLModel", "SQLAlchemy", "Alembic"] },
  { label: "前端", icon: "🎨", items: ["Next.js 16", "React 19", "Vue", "TypeScript", "Tailwind CSS 4", "Astro"] },
  { label: "语言", icon: "💻", items: ["Python", "TypeScript", "C", "C++", "Java", "Rust", "Shell"] },
  { label: "范式", icon: "🧠", items: ["OOP · SOLID", "FP · Functor · Monad", "组合优于继承", "不可变数据"] },
  { label: "数据库", icon: "🗄️", items: ["PostgreSQL 17", "Redis", "MySQL", "asyncpg"] },
  { label: "测试", icon: "🧪", items: ["pytest", "Vitest", "单元测试", "集成测试", "覆盖率门控"] },
  { label: "DevOps", icon: "🚀", items: ["Docker 多阶段构建", "GitHub Actions", "Caddy", "阿里云 ECS/ACR"] },
  { label: "系统", icon: "🖥️", items: ["Linux", "Nginx", "CMake", "TCP 网络编程"] },
  { label: "AI 工具", icon: "🤖", items: ["Claude Code", "Cursor", "Copilot", "Kiro", "NotebookLM"] },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1 },
};

export function ResumeStack() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">技术栈</h2>
      <motion.div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      >
        {stacks.map((s) => (
          <motion.div key={s.label} variants={item}>
            <Card className="group py-4 transition-colors hover:border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span>{s.icon}</span>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                    {s.label}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {s.items.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs font-normal">
                      {t}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
