"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const principles = [
  {
    icon: "🎯",
    title: "高内聚低耦合是第一原则",
    desc: "我不背设计模式的名字，但我深刻理解它们背后的共同目标——让每个模块只做一件事，让模块之间的依赖尽可能少且显式。",
  },
  {
    icon: "👁️",
    title: "显式优于隐式",
    desc: "魔法代码很爽，但维护起来是灾难。这也是我从零实现 DI 容器的原因——理解它，才能驾驭它。",
  },
  {
    icon: "🧩",
    title: "组合优于继承",
    desc: "继承是一种强耦合。组合让你精确地选择需要的行为，这在 FP 和 OOP 里都是同一个道理。",
  },
  {
    icon: "🔒",
    title: "不可变优于可变状态",
    desc: "全局与跨组件状态集中管理，局部状态尽量不可变，副作用显式隔离。",
  },
  {
    icon: "🪞",
    title: "可测试性是设计质量的镜子",
    desc: "如果一段代码很难写单元测试，通常意味着它的设计有问题。可测试性不是测试框架的问题，是架构问题。",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

export function ResumePhilosophy() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">工程价值观</h2>
        <p className="text-sm text-muted-foreground mt-1">这些不是口号，是踩过坑之后形成的判断。</p>
      </div>
      <motion.div
        className="grid gap-4 sm:grid-cols-2"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      >
        {principles.map((p) => (
          <motion.div key={p.title} variants={item}>
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
    </section>
  );
}
