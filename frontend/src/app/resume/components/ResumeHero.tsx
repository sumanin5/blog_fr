"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const contacts = [
  { label: "📧 ty1547@outlook.com", href: "mailto:ty1547@outlook.com" },
  { label: "🌐 ty1547.com", href: "https://ty1547.com" },
  { label: "🐙 github.com/sumanin5", href: "https://github.com/sumanin5" },
];

const keywords = [
  "Clean Architecture",
  "AI-Driven Dev",
  "Full-Stack",
  "高内聚低耦合",
  "显式优于隐式",
];

export function ResumeHero() {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <motion.h1
          className="text-5xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          田毅
        </motion.h1>
        <motion.p
          className="text-xl text-muted-foreground font-light tracking-widest uppercase"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Full-Stack Engineer
        </motion.p>
      </div>

      <motion.div
        className="flex flex-wrap gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {contacts.map((c) => (
          <Badge key={c.label} variant="outline" className="text-sm py-1 px-3" asChild>
            <a href={c.href} target="_blank" rel="noopener noreferrer">
              {c.label}
            </a>
          </Badge>
        ))}
      </motion.div>

      <motion.p
        className="text-muted-foreground leading-7 max-w-2xl text-base"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        跨学科背景（金融硕士 + 化工本科），从量化研究员转型全栈工程师。
        推崇高内聚低耦合、显式优于隐式、可维护性优于快速实现。
        在 AI 工具爆发的当下，以扎实的架构理念作为 AI 生成代码的质量护栏。
      </motion.p>

      <motion.div
        className="flex flex-wrap gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {keywords.map((k) => (
          <span
            key={k}
            className="text-xs px-3 py-1 rounded-full border border-primary/20 text-primary/80 bg-primary/5"
          >
            {k}
          </span>
        ))}
      </motion.div>
    </section>
  );
}
