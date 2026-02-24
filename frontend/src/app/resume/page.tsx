"use client";

import { motion } from "framer-motion";
import { ResumeHero } from "./components/ResumeHero";
import { ResumeStack } from "./components/ResumeStack";
import { ResumeProjects } from "./components/ResumeProjects";
import { ResumeWork } from "@/app/resume/components/ResumeWork";
import { ResumeEducation } from "@/app/resume/components/ResumeEducation";
import { ResumePhilosophy } from "@/app/resume/components/ResumePhilosophy";
import { ResumeAI } from "@/app/resume/components/ResumeAI";
import { Separator } from "@/components/ui/separator";

const sections = [
  { id: "hero", Component: ResumeHero },
  { id: "stack", Component: ResumeStack },
  { id: "projects", Component: ResumeProjects },
  { id: "work", Component: ResumeWork },
  { id: "education", Component: ResumeEducation },
  { id: "philosophy", Component: ResumePhilosophy },
  { id: "ai", Component: ResumeAI },
];

export default function ResumePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* 背景网格 */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* 渐变光晕 */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/3 blur-[100px]" />

      <div className="relative mx-auto max-w-4xl px-6 py-20">
        {sections.map(({ id, Component }, i) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: i === 0 ? 0 : 0.1 }}
          >
            {i > 0 && <Separator className="my-16" />}
            <Component />
          </motion.div>
        ))}

        <Separator className="my-16" />
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-muted-foreground py-4"
        >
          本页面由 Next.js 16 + React 19 + Tailwind CSS 4 构建 ·{" "}
          <a
            href="https://github.com/sumanin5/blog_fr"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground transition-colors"
          >
            查看源码 ↗
          </a>
        </motion.footer>
      </div>
    </main>
  );
}
