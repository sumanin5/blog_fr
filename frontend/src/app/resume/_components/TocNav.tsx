import React from "react";
import Link from "next/link";

interface TocItem {
  id: string;
  label: string;
}

const tocItems: TocItem[] = [
  { id: "resume-header", label: "基本信息" },
  { id: "core-competence", label: "核心竞争力" },
  { id: "tech-stack", label: "技术栈" },
  { id: "project-experience", label: "项目经历" },
  { id: "work-experience", label: "工作经历" },
  { id: "education", label: "教育背景" },
];

export function TocNav() {
  return (
    <nav className="sticky top-24 hidden lg:block w-48 shrink-0 print:hidden">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">
          导航目录
        </h4>
        <ul className="space-y-2 text-sm">
          {tocItems.map((item) => (
            <li key={item.id}>
              <Link
                href={`#${item.id}`}
                className="text-muted-foreground hover:text-foreground transition-colors block py-1"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
