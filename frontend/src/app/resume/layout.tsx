import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "田毅 · 简历",
  description: "田毅的在线简历 — Full-Stack Engineer",
};

export default function ResumeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
