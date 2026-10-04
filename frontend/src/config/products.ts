export interface ProductFeature {
  title: string;
  description: string;
  icon: string;
  badge?: string;
}

export interface ProductGuideStep {
  step: string;
  title: string;
  description: string;
  code?: string;
  tips?: string;
}

export interface ProductGuideSection {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  steps: ProductGuideStep[];
}

export interface ProductFAQ {
  question: string;
  answer: string;
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
  releasesUrl?: string;
  vscodeUrl?: string;
  status: "active" | "beta" | "planning";
  statusText: string;
  techStack: string[];
  features: ProductFeature[];
  metrics: { label: string; value: string }[];
  accentColor: string; // Tailwind color token or hex
  guides?: ProductGuideSection[];
  faqs?: ProductFAQ[];
}

export const PRODUCTS: Product[] = [
  {
    slug: "inkdown",
    name: "Inkdown",
    tagline: "本地优先的沉浸式阅读、写作与 AI 伴读桌面工作区",
    badge: "Open Source · Local-First Desktop",
    summary:
      "把每一页读成自己的知识：在本地工作区内完成 Markdown 写作、PDF/EPUB 精确批注与上下文感知 AI 伴读。",
    description:
      "Inkdown 是一款面向开发者与研究者的现代化跨平台桌面应用。颠覆传统撕裂的双栏排版，将来源文档、精确标注、知识沉淀与本地 Agent 思考打通为完整链路。数据 100% 留存在本地，原生支持跨平台（Windows / macOS / Linux），免除云端依赖与数据泄露隐患。",
    icon: "🖋️",
    githubUrl: "https://github.com/yitom486/inkdown",
    releasesUrl: "https://github.com/yitom486/inkdown/releases",
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
    guides: [
      {
        id: "quick-start",
        title: "快速开始与安装",
        tagline: "三步完成从下载到打开第一个知识工作区",
        icon: "Zap",
        steps: [
          {
            step: "01",
            title: "下载对应操作系统的桌面安装包",
            description:
              "访问官方 GitHub Releases 页面，根据您的系统下载对应的最新发行版：Windows (.exe)、macOS (.dmg 或 Universal)、Linux (.AppImage)。",
            tips: "推荐使用 Releases 中的稳定版 v0.4.0 以上版本以获得完整的多格式伴读与 OCR 特性。",
          },
          {
            step: "02",
            title: "选定您的本地知识库工作区根目录",
            description:
              "启动 Inkdown 后，直接选择您电脑磁盘中的任意本地文件夹作为工作区（例如已有的 Obsidian 知识库或论文归档目录）。Inkdown 严格遵循本地优先哲学，不会对您的既有文件进行任何私有格式篡改。",
          },
          {
            step: "03",
            title: "开启沉浸阅读与所见即所得写作",
            description:
              "将 PDF 电子书、EPUB 文件或 Markdown 文档拖入工作区，点击即可直接阅读，并支持双向联动的视口标注与高亮摘录。",
          },
        ],
      },
      {
        id: "ai-setup",
        title: "配置 AI 伴读助手 (可选)",
        tagline: "接入 DeepSeek / OpenAI 规范接口，赋能本地上下文深度伴读",
        icon: "Bot",
        steps: [
          {
            step: "01",
            title: "打开工作区设置中的「AI 模型与伴读」",
            description:
              "点击应用界面左下角的设置齿轮，切换到「AI 伴读」面板。Inkdown 的 AI 能力为完全自选的独立模块，不配置任何 Key 亦可全速离线使用。",
          },
          {
            step: "02",
            title: "填入自定义 API Key 与模型服务地址",
            description:
              "原生支持任何兼容 OpenAI 协议的推理接口。例如国内极高性价比、数学与逻辑推理极强的 DeepSeek：",
            code: `API Endpoint: https://api.deepseek.com
API Key: sk-xxxxxxxxxxxxxxxxxxxxxxxx
Model Name: deepseek-chat (或 deepseek-reasoner)`,
            tips: "秘钥与全部对话上下文仅保存在客户端本地内存与磁盘，绝无第三方服务器中间转储。",
          },
          {
            step: "03",
            title: "划选文本进行针对性深度提问与重点提炼",
            description:
              "在阅读长篇论文或技术专著时，选中任意重点段落即可唤起 AI 浮窗。伴读助手会自动感知当前视口、页码与章节树，在精准上下文内提供针对性解答。",
          },
        ],
      },
      {
        id: "reading-flow",
        title: "多格式阅读与知识沉淀",
        tagline: "让原文上下文与读书笔记永远保持双向互通",
        icon: "BookOpen",
        steps: [
          {
            step: "01",
            title: "精确高亮与双向上下文联动",
            description:
              "划选文字后点击高亮或添加评注。与普通复制粘贴不同，Inkdown 会在底层保留原始视口、页码与章节锚点，未来随时可在笔记中一键跳回原文所在位置。",
          },
          {
            step: "02",
            title: "扫描书本地 OCR 取证与全文索引",
            description:
              "面对扫描版 PDF 或影印古籍，开启本地 OCR 引擎即可自动提取文字流，建立全文可检索索引，让扫描文档也能像普通电子书一样全文搜索与划词。",
          },
          {
            step: "03",
            title: "一键沉淀并格式化为标准 Markdown",
            description:
              "所有标注、章节提炼与 AI 伴读讨论成果，均支持一键整理为格式规整的 Markdown 知识卡片，无缝接入您的个人长效知识体系。",
          },
        ],
      },
    ],
    faqs: [
      {
        question: "Inkdown 会把我的文档或笔记上传到云端吗？",
        answer:
          "绝对不会。Inkdown 坚持严格的 Local-First（本地优先）设计准则。所有的文档解析、阅读进度、高亮批注与 OCR 索引 100% 保存在您电脑的本地硬盘中，没有任何云端服务器回传风险。",
      },
      {
        question: "必须配置 AI 才能正常使用阅读器吗？",
        answer:
          "不需要。AI 伴读属于完全解耦的可选增强特性。即使不填入任何 API Key，Inkdown 本身也是一款功能强大、启动极快的多格式阅读器与 Markdown 所见即所得编辑器。",
      },
      {
        question: "是否兼容我现有的 Obsidian 或本地 Markdown 笔记库？",
        answer:
          "完美兼容。Inkdown 直接基于本地文件系统的纯文本运作，不采用任何私有加密数据库。您可以随时指定现有的笔记文件夹作为工作区并自由修改。",
      },
      {
        question: "如何为 Inkdown 提交 Bug 反馈或新功能建议？",
        answer:
          "项目代码在 GitHub 完全开源。您可以前往 GitHub 仓库提交 Issue，或提交 Pull Request 参与代码共建。",
      },
    ],
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}
