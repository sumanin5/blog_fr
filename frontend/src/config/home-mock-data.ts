import type { Category } from "@/shared/api/types";
import type { PostShortResponse } from "@/shared/api/generated/types.gen";
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

export const MOCK_THOUGHTS: ApiData<PostShortResponse>[] = [
  {
    id: "thought-1",
    title: "好的抽象让复杂度消失在边界之后",
    slug: "good-abstraction-hides-complexity",
    excerpt: "在工程中，清晰的边界比完美的实现更重要。很多时候过早优化反而加重了认知负担。",
    readingTime: 2,
    viewCount: 420,
    likeCount: 36,
    createdAt: "2026-09-26T21:10:00Z",
    publishedAt: "2026-09-26T21:10:00Z",
    updatedAt: "2026-09-26T21:10:00Z",
    authorId: "user-admin",
    tags: [{ id: "tg1", name: "架构思考", slug: "architecture" }],
  },
  {
    id: "thought-2",
    title: "AI 是放大器，不是替代者",
    slug: "ai-is-an-amplifier-not-replacement",
    excerpt: "它放大了各个个体的创造力与执行力，但也让我们比以往任何时候都更需要独立思考与辨别能力。",
    readingTime: 3,
    viewCount: 610,
    likeCount: 52,
    createdAt: "2026-09-18T18:40:00Z",
    publishedAt: "2026-09-18T18:40:00Z",
    updatedAt: "2026-09-18T18:40:00Z",
    authorId: "user-admin",
    tags: [{ id: "tg2", name: "认知随笔", slug: "insights" }],
  },
  {
    id: "thought-3",
    title: "持续记录，才能看见自己的成长",
    slug: "keep-recording-to-see-growth",
    excerpt: "技术框架终究会迭代更新，但思考的轨迹与解决问题的元能力始终有历久弥新的价值。",
    readingTime: 2,
    viewCount: 390,
    likeCount: 41,
    createdAt: "2026-09-12T11:20:00Z",
    publishedAt: "2026-09-12T11:20:00Z",
    updatedAt: "2026-09-12T11:20:00Z",
    authorId: "user-admin",
    tags: [{ id: "tg3", name: "心流笔记", slug: "notes" }],
  },
];
