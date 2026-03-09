import React, { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface ResumeSectionProps {
  id: string;
  title: string;
  children: ReactNode;
  icon?: ReactNode;
}

export function ResumeSection({
  id,
  title,
  children,
  icon,
}: ResumeSectionProps) {
  return (
    <details
      id={id}
      className="group overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm mb-6 print:border-none print:shadow-none print:block print:break-inside-avoid"
      open
    >
      <summary className="flex cursor-pointer items-center justify-between p-6 print:p-0 print:cursor-auto marker:hidden [&::-webkit-details-marker]:hidden bg-muted/30 hover:bg-muted/50 transition-colors print:bg-transparent">
        <div className="flex items-center gap-3">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:-rotate-180 print:hidden" />
      </summary>

      <div className="p-6 pt-2 print:p-0 print:pt-4">{children}</div>
    </details>
  );
}
