"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const tools = [
  { name: "Claude Code", desc: "主力 Agent · 架构与重构", proficiency: 90 },
  { name: "Cursor", desc: "日常编码 · 上下文补全", proficiency: 85 },
  { name: "GitHub Copilot", desc: "轻量补全 · 快速实现", proficiency: 80 },
  { name: "Kiro", desc: "AI IDE · Agent 工作流", proficiency: 75 },
  { name: "NotebookLM", desc: "文献学习 · 效率倍增", proficiency: 85 },
];

const pitfalls = [
  {
    icon: "🏗️",
    title: "AI 不懂架构，你得懂",
    desc: "缺乏架构约束时，AI 极其容易写出面条代码。解决方案不是换更好的模型，而是你自己要有清晰的模块边界。",
  },
  {
    icon: "🌊",
    title: "上下文漂移",
    desc: "长对话后代码风格会悄悄漂移——命名规范变了，架构模式也变了。需要定期 review，发现漂移立刻纠正。",
  },
  {
    icon: "📅",
    title: "训练数据滞后",
    desc: "Tailwind CSS 4 是重灾区——AI 会自信地写 v3 语法。对于快速迭代的库，直接把官方文档喂给 AI。",
  },
  {
    icon: "🛡️",
    title: "测试是重构的勇气",
    desc: "AI 生成的代码需要重构，但没有测试你不敢动。先让 AI 写测试，再重构实现。",
  },
];

const frontierTech = ["MCP 协议", "Agent Skills", "AI Coding Agent", "Prompt Engineering"];

export function ResumeAI() {
  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">我与 AI 工具</h2>
        <p className="text-sm text-muted-foreground mt-1">
          几乎捣鼓过所有主流 AI 编程工具，也踩过足够多的坑，形成了自己的判断。
        </p>
      </div>

      {/* 工具箱 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">🧰 工具箱</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tools.map((t, i) => (
            <motion.div
              key={t.name}
              className="space-y-1.5"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t.name}</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {t.desc}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{t.proficiency}%</span>
              </div>
              <Progress value={t.proficiency} className="h-1.5" />
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* 前沿关注 */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground mr-1">持续关注：</span>
        {frontierTech.map((t) => (
          <span
            key={t}
            className="text-xs px-3 py-1 rounded-full border border-primary/20 text-primary/80 bg-primary/5"
          >
            {t}
          </span>
        ))}
      </div>

      {/* 局限性 */}
      <div className="space-y-4">
        <h3 className="text-base font-medium">AI 编程的真实局限</h3>
        <motion.div
          className="grid gap-3 sm:grid-cols-2"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
          {pitfalls.map((p) => (
            <motion.div
              key={p.title}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            >
              <Card className="group h-full py-4 transition-colors hover:border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="text-lg">{p.icon}</span>
                    {p.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">{p.desc}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* 核心观点 */}
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">💡 核心观点：</span>
            AI 极大地拓展了一个人能触达的技术边界，但它放大的是你已有的判断力，而不是替代它。
            对于热爱探索的人来说，现在是最好的时代——你可以用 AI 在短时间内真正学懂一个领域，
            而不只是复制粘贴代码。但前提是你得有足够的好奇心去追问「为什么」，
            而不是满足于「能跑就行」。
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
