import type { Category } from "@/shared/api/types";
import type {
  PostShortResponse,
  PostDetailResponse,
} from "@/shared/api/generated/types.gen";
import type { ApiData } from "@/shared/api/transformers";

/**
 * 👑 高保真数字花园首页展示案例数据 (Showcase Fallback Data)
 *
 * 作用：
 * 1. 本地未启动后端或后端为空时，完整渲染设计图中的高质感页面效果；
 * 2. 字段类型与 FastAPI 后端 100% 对齐，后端随时写入数据即可无缝平滑替换！
 */

export const MOCK_FEATURED_COLLECTIONS: Category[] = [
  {
    id: "col-system-design",
    name: "系统设计",
    slug: "system-design",
    description: "从架构边界、数据流转到部署实践，分享在全栈项目中如何让前后端各司其职、协同工作。",
    excerpt: "从架构边界、数据流转到部署实践，分享在全栈项目中如何让 FastAPI 与 Next.js 各司其职、协同工作。",
    postCount: 12,
    iconPreset: "📐",
    isFeatured: true,
    coverImage: null,
  },
  {
    id: "col-frontend-eng",
    name: "前端工程",
    slug: "frontend-engineering",
    description: "基于 OpenAPI 生成类型安全的前端 SDK，提升开发体验与协作效率。",
    excerpt: "基于 OpenAPI 生成类型安全的前端 SDK，提升开发体验与团队协作效率，消除手写契约维护成本。",
    postCount: 8,
    iconPreset: "💻",
    isFeatured: true,
    coverImage: null,
  },
  {
    id: "col-engineering-practice",
    name: "工程实践",
    slug: "devops-practice",
    description: "使用 GitOps 管理博客内容，从本地创作到自动化部署的完整实践。",
    excerpt: "使用 GitOps 管理博客内容，从本地创作到自动化部署的完整实践，保持可重现与可追溯。",
    postCount: 15,
    iconPreset: "⚙️",
    isFeatured: true,
    coverImage: null,
  },
];

export const MOCK_LATEST_ARTICLES: ApiData<PostShortResponse>[] = [
  {
    id: "post-fastapi-nextjs-boundary",
    title: "FastAPI 与 Next.js 的边界设计",
    slug: "fastapi-nextjs-boundary-design",
    excerpt: "从架构边界、数据流转到部署实践，分享在全栈项目中如何让 FastAPI 与 Next.js 各司其职、协同工作，构建清晰、可维护的系统。",
    readingTime: 12,
    viewCount: 1420,
    likeCount: 88,
    createdAt: "2026-09-28T09:00:00Z",
    publishedAt: "2026-09-28T09:00:00Z",
    updatedAt: "2026-09-28T09:00:00Z",
    authorId: "user-admin",
    author: {
      id: "user-admin",
      username: "tomy",
      fullName: "Tomy",
      role: "admin",
      isActive: true,
      email: "admin@example.com",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    tags: [
      { id: "t1", name: "系统设计", slug: "system-design" },
      { id: "t2", name: "后端", slug: "backend" },
    ],
  },
  {
    id: "post-openapi-typed-sdk",
    title: "从 OpenAPI 到类型安全 SDK",
    slug: "openapi-to-typesafe-sdk",
    excerpt: "基于 OpenAPI 生成类型安全的前端 SDK，提升开发体验与团队协作效率，减少前后端联调成本与手写模型差错。",
    readingTime: 10,
    viewCount: 980,
    likeCount: 65,
    createdAt: "2026-09-21T14:30:00Z",
    publishedAt: "2026-09-21T14:30:00Z",
    updatedAt: "2026-09-21T14:30:00Z",
    authorId: "user-admin",
    author: {
      id: "user-admin",
      username: "tomy",
      fullName: "Tomy",
      role: "admin",
      isActive: true,
      email: "admin@example.com",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    tags: [
      { id: "t3", name: "前端工程", slug: "frontend-engineering" },
      { id: "t4", name: "工具链", slug: "toolchain" },
    ],
  },
];

export interface IdeaDomain {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  count: number;
}

export const MOCK_IDEA_DOMAINS: IdeaDomain[] = [
  {
    id: "all",
    name: "全部领域",
    slug: "all",
    description: "汇聚所有维度的思维碎片",
    icon: "✨",
    count: 6,
  },
  {
    id: "dom-arch",
    name: "架构思考",
    slug: "architecture",
    description: "系统边界、微服务与高内聚设计",
    icon: "📐",
    count: 2,
  },
  {
    id: "dom-frontend",
    name: "技术折腾",
    slug: "tech-craft",
    description: "现代 Web、Rust 与工程细节实践",
    icon: "⚡",
    count: 2,
  },
  {
    id: "dom-tools",
    name: "工具效率",
    slug: "tooling",
    description: "开发工作流、CLI 与自动化利器",
    icon: "🛠️",
    count: 1,
  },
  {
    id: "dom-insights",
    name: "认知随想",
    slug: "insights",
    description: "成长心智、设计美学与日常杂谈",
    icon: "💡",
    count: 1,
  },
];

export const MOCK_THOUGHTS: ApiData<PostShortResponse>[] = [
  {
    id: "thought-1",
    title: "好的抽象让复杂度消失在边界之后",
    slug: "good-abstraction-hides-complexity",
    excerpt:
      "在工程实践中，清晰的边界划分往往比追求局部的完美实现更关键。很多时候过早优化反而加重了团队的认知负担。把不确定性封装在模块内部，对外暴露最小认知表面积，是保持系统长期演进生命力的唯一法则。",
    readingTime: 2,
    viewCount: 420,
    likeCount: 36,
    createdAt: "2026-09-28T09:15:00Z",
    publishedAt: "2026-09-28T09:15:00Z",
    updatedAt: "2026-09-28T09:15:00Z",
    authorId: "user-admin",
    category: {
      id: "dom-arch",
      name: "架构思考",
      slug: "architecture",
      postType: "ideas",
      isActive: true,
      sortOrder: 1,
    },
    tags: [{ id: "tg1", name: "模块设计", slug: "module-design" }],
  },
  {
    id: "thought-2",
    title: "React 19 与原生 Web 渲染的优雅平衡",
    slug: "react-19-native-rendering",
    excerpt:
      "重构数字花园 3D 展台时，深切体会到过度依赖重型封装层（如 R3F 在 React 19 协调器下的包袱）不如直接用原生 Three.js 挂载 Canvas。轻量低面数模型、Canvas 离屏贴图加上 IntersectionObserver，既能保持丝滑的 60fps 流动，又能在低端核显上零开销静默。",
    readingTime: 3,
    viewCount: 680,
    likeCount: 54,
    createdAt: "2026-09-27T16:40:00Z",
    publishedAt: "2026-09-27T16:40:00Z",
    updatedAt: "2026-09-27T16:40:00Z",
    authorId: "user-admin",
    category: {
      id: "dom-frontend",
      name: "技术折腾",
      slug: "tech-craft",
      postType: "ideas",
      isActive: true,
      sortOrder: 2,
    },
    tags: [{ id: "tg2", name: "Three.js", slug: "threejs" }],
  },
  {
    id: "thought-3",
    title: "AI 是放大器，不是创造力的替代者",
    slug: "ai-is-an-amplifier-not-replacement",
    excerpt:
      "AI 极大地放大了每一个独立开发者的构想落地速度，把原本需要多部门协作的架构与原型压缩到以分钟计。但也正因如此，提出好问题、具备系统级审美品味以及洞察用户真实隐性痛点的能力，比以往任何时候都更加稀缺。",
    readingTime: 2,
    viewCount: 610,
    likeCount: 52,
    createdAt: "2026-09-25T20:20:00Z",
    publishedAt: "2026-09-25T20:20:00Z",
    updatedAt: "2026-09-25T20:20:00Z",
    authorId: "user-admin",
    category: {
      id: "dom-insights",
      name: "认知随想",
      slug: "insights",
      postType: "ideas",
      isActive: true,
      sortOrder: 3,
    },
    tags: [{ id: "tg3", name: "AI时代", slug: "ai-era" }],
  },
  {
    id: "thought-4",
    title: "终端现代工具链的幸福感：从 uv 到 pnpm",
    slug: "terminal-modern-tools",
    excerpt:
      "当把 Python 依赖管理全面切换到 Rust 编写的 uv，Node 生态依赖由 pnpm 精准收拢时，那几毫秒内的瞬时解析让人真切感受到工具链现代化的力量。工具的极致响应速度会直接正反馈给心流状态。",
    readingTime: 2,
    viewCount: 390,
    likeCount: 29,
    createdAt: "2026-09-23T11:05:00Z",
    publishedAt: "2026-09-23T11:05:00Z",
    updatedAt: "2026-09-23T11:05:00Z",
    authorId: "user-admin",
    category: {
      id: "dom-tools",
      name: "工具效率",
      slug: "tooling",
      postType: "ideas",
      isActive: true,
      sortOrder: 4,
    },
    tags: [{ id: "tg4", name: "开发效率", slug: "productivity" }],
  },
  {
    id: "thought-5",
    title: "持续记录，才能看见心智模型的蜕变",
    slug: "keep-recording-to-see-growth",
    excerpt:
      "技术库和框架日新月异，半年一小换，三年大重写。但你在踩坑时记录下的解题直觉、设计权衡、乃至当时的犹疑与顿悟，会随着时间沉淀为属于你的独家心智资产。这正是搭建数字花园的初心。",
    readingTime: 2,
    viewCount: 520,
    likeCount: 47,
    createdAt: "2026-09-20T14:15:00Z",
    publishedAt: "2026-09-20T14:15:00Z",
    updatedAt: "2026-09-20T14:15:00Z",
    authorId: "user-admin",
    category: {
      id: "dom-insights",
      name: "认知随想",
      slug: "insights",
      postType: "ideas",
      isActive: true,
      sortOrder: 5,
    },
    tags: [{ id: "tg5", name: "数字花园", slug: "digital-garden" }],
  },
  {
    id: "thought-6",
    title: "单向数据流与类型契约的自愈力",
    slug: "unidirectional-data-flow-resilience",
    excerpt:
      "在前后端分工中，以 FastAPI OpenAPI 导出的 JSON Schema 为唯一真相源，自动化生成前端 TypeScript SDK，彻底斩断了手写 API 请求和手动类型推导的断层。任何后端的破坏性变更都会在前端编译期当场报警，真正的类型自愈。",
    readingTime: 3,
    viewCount: 710,
    likeCount: 63,
    createdAt: "2026-09-15T18:00:00Z",
    publishedAt: "2026-09-15T18:00:00Z",
    updatedAt: "2026-09-15T18:00:00Z",
    authorId: "user-admin",
    category: {
      id: "dom-arch",
      name: "架构思考",
      slug: "architecture",
      postType: "ideas",
      isActive: true,
      sortOrder: 6,
    },
    tags: [{ id: "tg6", name: "类型安全", slug: "typesafe" }],
  },
];

export function findMockPostDetail(slug: string): ApiData<PostDetailResponse> | null {
  // 1. 精确匹配 slug 或 id
  let article = MOCK_LATEST_ARTICLES.find(
    (a) => a.slug === slug || a.id === slug,
  );

  // 2. 友好容错：如果用户访问的是纯数字 (如 "1" 或 "2")，按索引自动映射
  if (!article) {
    const num = parseInt(slug, 10);
    if (!isNaN(num) && num > 0 && num <= MOCK_LATEST_ARTICLES.length) {
      article = MOCK_LATEST_ARTICLES[num - 1];
    }
  }

  // 3. 兜底回退：如果依然未找到，默认呈现第 1 篇高质量长文
  if (!article && MOCK_LATEST_ARTICLES.length > 0) {
    article = MOCK_LATEST_ARTICLES[0];
  }

  if (article) {
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      postType: "articles",
      status: "published",
      excerpt: article.excerpt,
      contentMdx: `# ${article.title}

> 架构的核心在于边界的划分与责任的收拢。本文探讨在现代全栈工程中如何让 FastAPI 与 Next.js 清晰协同。

## 1. 架构背景与痛点

在传统的全栈 Web 应用开发中，前后端往往面临接口契约不一致、手写模型差错以及重复状态管理的困境。通过明确的边界隔离与类型契约自动化，能够显著降低维护成本。

\`\`\`typescript
// 类型契约自动生成的 SDK 示例
export async function fetchPostDetail(slug: string) {
  const response = await client.get(\`/api/v1/posts/\${slug}\`);
  return response.data;
}
\`\`\`

## 2. 单向数据流与类型自愈

以 OpenAPI Specification (OAS) 为唯一真理来源，自动化生成前端 TypeScript SDK：
- **编译时类型守卫**：破坏性变更在构建期当场报警；
- **零手写网络契约**：彻底消灭联调沟通偏差；
- **分层隔离**：服务逻辑与展示组件完全解耦。

## 3. 总结与演进

架构从来不是一成不变的，保持微小步长的重构与持续自动化测试，是系统长期演进的底气。
`,
      readingTime: article.readingTime,
      viewCount: article.viewCount,
      likeCount: article.likeCount,
      createdAt: article.createdAt,
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
      author: article.author,
      tags: article.tags,
      category: article.category,
      isFeatured: article.isFeatured,
      allowComment: true,
      pinStatus: 0,
      commentCount: 8,
    } as unknown as ApiData<PostDetailResponse>;
  }

  const thought = MOCK_THOUGHTS.find((t) => t.slug === slug || t.id === slug);
  if (thought) {
    return {
      id: thought.id,
      title: thought.title,
      slug: thought.slug,
      postType: "ideas",
      status: "published",
      excerpt: thought.excerpt,
      contentMdx: `# ${thought.title}

${thought.excerpt}
`,
      readingTime: thought.readingTime,
      viewCount: thought.viewCount,
      likeCount: thought.likeCount,
      createdAt: thought.createdAt,
      publishedAt: thought.publishedAt,
      updatedAt: thought.updatedAt,
      author: thought.author,
      tags: thought.tags,
      category: thought.category,
      isFeatured: false,
      allowComment: true,
      pinStatus: 0,
      commentCount: 3,
    } as unknown as ApiData<PostDetailResponse>;
  }

  return null;
}
