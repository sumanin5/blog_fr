"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const edu = [
  {
    degree: "硕士",
    school: "浙江工商大学",
    major: "金融学",
    period: "2020.9 — 2023.6",
    note: "核心期刊《系统工程理论与实践》发表论文一篇",
  },
  {
    degree: "本科",
    school: "武汉理工大学",
    major: "化学工程与工艺",
    period: "2015.9 — 2019.6",
    note: null,
  },
];

const bookCategories = [
  {
    id: "systems",
    label: "系统 & 语言",
    books: [
      { name: "CSAPP", full: "深入理解计算机系统" },
      { name: "操作系统导论", full: "Operating Systems: Three Easy Pieces" },
      { name: "C++ Primer", full: "C++ Primer 第5版" },
      { name: "Vue.js 设计与实现", full: "霍春阳" },
    ],
  },
  {
    id: "distributed",
    label: "分布式 & 架构",
    books: [
      { name: "DDIA", full: "数据密集型应用系统设计" },
    ],
  },
  {
    id: "ml",
    label: "机器学习 & 深度学习",
    books: [
      { name: "统计学习方法", full: "李航" },
      { name: "动手学深度学习", full: "李沐 · PyTorch 版" },
      { name: "Python 深度学习", full: "Keras & TensorFlow" },
    ],
  },
  {
    id: "rl",
    label: "强化学习",
    books: [
      { name: "强化学习的数学原理", full: "赵世钰" },
      { name: "深度强化学习", full: "王树森" },
    ],
  },
];

export function ResumeEducation() {
  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-semibold tracking-tight">教育背景</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {edu.map((e, i) => (
          <motion.div
            key={e.school}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="group py-4 transition-colors hover:border-primary/30">
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{e.school}</p>
                    <p className="text-sm text-muted-foreground">{e.major} · {e.degree}</p>
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs shrink-0">
                    {e.period}
                  </Badge>
                </div>
                {e.note && (
                  <Badge variant="outline" className="text-xs font-normal">
                    📄 {e.note}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 技术书籍 - Tabs 分类 */}
      <div className="space-y-3">
        <h3 className="text-base font-medium">技术阅读</h3>
        <Tabs defaultValue="systems">
          <TabsList>
            {bookCategories.map((c) => (
              <TabsTrigger key={c.id} value={c.id} className="text-xs">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {bookCategories.map((c) => (
            <TabsContent key={c.id} value={c.id}>
              <div className="flex flex-wrap gap-2 pt-2">
                {c.books.map((b) => (
                  <div
                    key={b.name}
                    className="group relative rounded-lg border px-3 py-2 transition-colors hover:border-primary/30 hover:bg-muted/50"
                  >
                    <p className="text-sm font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.full}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
