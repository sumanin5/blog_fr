"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const jobs = [
  {
    title: "期货研究员 & 数据分析师",
    company: "华南物资集团有限公司",
    period: "2023.6 — 2024.5",
    items: [
      "运用数理统计方法建立市场预测模型",
      "设计开发数据处理平台，实现自动化清洗、分析与可视化",
      "通过数学建模优化交易策略",
    ],
  },
  {
    title: "量化研究实习生",
    company: "恒泰证券有限公司",
    period: "2022.5 — 2022.8",
    items: [
      "构建商品期货量化交易模型",
      "设计智能交易信号系统",
    ],
  },
  {
    title: "期权产品研究实习生",
    company: "南华期货有限公司",
    period: "2022.10 — 2022.12",
    items: [
      "开发期权定价系统，实现精确风险评估",
      "设计期权组合策略，优化投资组合收益",
    ],
  },
];

export function ResumeWork() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">工作经历</h2>
      <div className="relative space-y-0">
        {/* 时间线竖线 */}
        <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />

        {jobs.map((j, i) => (
          <motion.div
            key={j.company}
            className="relative pl-8 pb-8 last:pb-0"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            {/* 时间线圆点 */}
            <div className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 border-primary/40 bg-background" />

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-medium">{j.title}</p>
                  <p className="text-sm text-muted-foreground">{j.company}</p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs shrink-0">
                  {j.period}
                </Badge>
              </div>
              <ul className="space-y-1">
                {j.items.map((item) => (
                  <li key={item} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-primary/40 shrink-0">›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
