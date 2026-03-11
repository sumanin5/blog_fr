export const siteConfig = {
  name: "BLOG_FR",
  description: "A modern full-stack blog built with Next.js and FastAPI.",
  url: "https://example.com",
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
