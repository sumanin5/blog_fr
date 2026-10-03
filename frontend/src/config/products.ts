export interface ProductFeature {
  title: string;
  description: string;
  icon: string;
  badge?: string;
}

export interface Product {
  slug: string;
  name: string;
  tagline: string;
  badge: string;
  summary: string;
  description: string;
  icon: string;
  githubUrl: string;
  demoUrl?: string;
  vscodeUrl?: string;
  status: "active" | "beta" | "planning";
  statusText: string;
  techStack: string[];
  features: ProductFeature[];
  metrics: { label: string; value: string }[];
  accentColor: string; // Tailwind color token or hex
}

export const PRODUCTS: Product[] = [
  {
    slug: "inkdown",
    name: "Inkdown",
    tagline: "重塑纯粹的 Markdown 写作直觉",
    badge: "Open Source · WYSIWYG",
    summary:
      "现代、极简、所见即所得的 Markdown 沉浸式阅读与写作工具。消除语法符号噪音，还原内容本质表达。",
    description:
      "Inkdown 是一款面向开发者与创作者的现代 Web 与桌面 Markdown 工具。它颠覆了传统双栏分屏的撕裂体验，通过所见即所得交互在输入同时呈现优雅排版，原生支持 GitHub Flavored Markdown、KaTeX 数学公式与 Mermaid 拓扑图，同时具备本地优先存储与离线 PWA 支持。",
    icon: "🖋️",
    githubUrl: "https://github.com/yitom486/inkdown",
    demoUrl: "https://inkdown.me",
    vscodeUrl: "https://marketplace.visualstudio.com/items?itemName=yitom.inkdown",
    status: "active",
    statusText: "持续维护中",
    techStack: [
      "TypeScript",
      "React",
      "Tailwind CSS",
      "GFM",
      "KaTeX",
      "Mermaid",
      "PWA",
    ],
    accentColor: "emerald",
    metrics: [
      { label: "语法标准", value: "100% GFM" },
      { label: "冷启动耗时", value: "< 120ms" },
      { label: "数据所有权", value: "本地优先" },
      { label: "扩展生态", value: "Web / VS Code" },
    ],
    features: [
      {
        title: "所见即所得排版（WYSIWYG）",
        description:
          "彻底告别传统 Markdown 双栏分屏的视线撕裂。在输入时光标感知语法，即刻呈现精炼排版，自动隐藏繁杂的 # 与 * 符号干扰。",
        icon: "✍️",
        badge: "沉浸体验",
      },
      {
        title: "100% GFM 与严谨科学表达",
        description:
          "完整兼容 GitHub Flavored Markdown 规范，原生集成 KaTeX 复杂数学公式推导与 Mermaid 系统架构图渲染，满足严苛的技术与学术创作需求。",
        icon: "📐",
        badge: "标准兼容",
      },
      {
        title: "本地优先与离线 PWA",
        description:
          "基于浏览器原生文件系统与持久缓存打造，无需等待繁冗的网络握手。一键安装为轻量桌面/移动应用，即使离线断网亦可全速书写。",
        icon: "⚡",
        badge: "零延迟",
      },
      {
        title: "多端协同与 VS Code 扩展",
        description:
          "不仅拥有极致轻快的 Web 端，还提供官方 VS Code 深度扩展插件，让你无需切换开发环境即可直接在既有工程中享受统一的文档体验。",
        icon: "🔌",
        badge: "生态覆盖",
      },
    ],
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}
