import { Cpu, Layers, Globe, Zap, ShieldCheck, Database } from "lucide-react";

export const TECH_STACK = [
  {
    category: "Frontend Architecture",
    icon: Globe,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    items: [
      "Next.js 16 (App Router)",
      "React 19",
      "Tailwind CSS v4",
      "Framer Motion",
      "TanStack Query",
    ],
  },
  {
    category: "Backend Engine",
    icon: Cpu,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    items: [
      "FastAPI (Python 3.13)",
      "SQLModel",
      "PostgreSQL 17",
      "Scalar API Docs",
    ],
  },
  {
    category: "DevOps & Cloud",
    icon: Database,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    items: [
      "Docker & Compose",
      "GitOps Workflow",
      "Sentry",
      "UV Package Manager",
    ],
  },
];

export const FEATURES = [
  {
    title: "MDX 驱动的创作",
    description: "支持数学公式、Mermaid 图表与交互式 React 组件。",
    icon: Zap,
  },
  {
    title: "安全第一",
    description: "JWT 认证、基于角色的权限控制与严苛的 API 校验。",
    icon: ShieldCheck,
  },
  {
    title: "高度自动化",
    description: "Git 仓库双向同步，文章即代码，发布即提交。",
    icon: Layers,
  },
];
