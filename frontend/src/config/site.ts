export const siteConfig = {
  name: "BLOG_FR",
  title: "代码之外，思考之中",
  description:
    "记录技术思考，构建更好的数字花园。这里有深度的技术探讨与深夜的灵感瞬间，关注 FastAPI、Next.js 与全栈工程实践。",
  // 规范站点地址：canonical、sitemap、RSS、OG 均以此为基准（www 会被 Caddy 301 到主域名）
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://ty1547.com").replace(/\/$/, ""),
  ogImage: "/images/garden-hero.jpg",
  links: {
    github: "https://github.com/sumanin5/blog_fr",
    twitter: "https://twitter.com/yourusername",
    email: `mailto:${
      process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@example.com"
    }`,
  },
  emails: [
    {
      label: "工作事务",
      address: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@example.com",
    },
    {
      label: "代码交流",
      address: process.env.NEXT_PUBLIC_GMAIL || "developer@gmail.com",
    },
  ],
  author: {
    name: "Tomy",
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@example.com",
  },
} as const;

export type SiteConfig = typeof siteConfig;
