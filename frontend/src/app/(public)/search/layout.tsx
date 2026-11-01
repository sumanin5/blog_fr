import type { Metadata } from "next";

// 站内搜索结果页是纯客户端渲染且参数无限，不进入索引，避免产生大量低质量重复页
export const metadata: Metadata = {
  title: "搜索",
  robots: { index: false, follow: true },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
