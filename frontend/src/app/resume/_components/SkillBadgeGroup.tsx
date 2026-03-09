import React from "react";
import { Badge } from "@/components/ui/badge";

interface SkillGroup {
  category: string;
  skills: {
    name: string;
    level?: "master" | "expert" | "proficient" | "familiar";
  }[];
  description?: string;
}

interface SkillBadgeGroupProps {
  groups: SkillGroup[];
}

export function SkillBadgeGroup({ groups }: SkillBadgeGroupProps) {
  return (
    <div className="space-y-6">
      {groups.map((group, index) => (
        <div key={index} className="flex flex-col gap-2">
          <div className="flex flex-col md:flex-row gap-4 md:items-start print:flex-col print:gap-2">
            <h3 className="w-32 shrink-0 font-bold text-foreground/90 uppercase tracking-wider text-sm mt-1">
              {group.category}
            </h3>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                {group.skills.map((skill) => (
                  <Badge
                    key={skill.name}
                    variant={skill.level === "master" ? "default" : "secondary"}
                    className="font-mono text-xs px-2.5 py-0.5 print:border-black print:text-black print:bg-transparent"
                  >
                    {skill.name}
                  </Badge>
                ))}
              </div>
              {group.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {group.description}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
