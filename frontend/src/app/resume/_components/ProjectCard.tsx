import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Github, ExternalLink } from "lucide-react";

interface ProjectHighlight {
  title: string;
  description: string;
}

interface ProjectCardProps {
  title: string;
  subtitle?: string;
  githubUrl?: string;
  demoUrl?: string;
  techStack: string[];
  quote?: string;
  highlights: ProjectHighlight[];
  tags?: string[];
}

export function ProjectCard({
  title,
  subtitle,
  githubUrl,
  demoUrl,
  techStack,
  quote,
  highlights,
  tags,
}: ProjectCardProps) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-card to-muted/20 print:border hover:border-border/80 print:shadow-none print:bg-none print:transform-none">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1 relative z-10">
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            {subtitle && (
              <CardDescription className="text-base font-medium mt-1">
                {subtitle}
              </CardDescription>
            )}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 pt-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-xs bg-background/50"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 gap-3 z-10 print:hidden">
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 gap-2"
              >
                <Github className="w-4 h-4" />
                <span>Code</span>
              </a>
            )}
            {demoUrl && (
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Article</span>
              </a>
            )}
          </div>
        </div>

        {techStack.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {techStack.map((tech) => (
              <span
                key={tech}
                className="text-sm font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {quote && (
          <blockquote className="border-l-4 border-primary/40 bg-muted/40 pl-4 py-3 italic text-foreground/80 rounded-r-lg print:border-l-gray-400 print:bg-transparent text-sm leading-relaxed">
            {quote}
          </blockquote>
        )}

        <ul className="space-y-5">
          {highlights.map((highlight, index) => (
            <li key={index} className="relative group/item pl-5">
              <span className="absolute left-0 top-1.5 flex h-2 w-2 items-center justify-center rounded-full bg-primary ring-4 ring-primary/20 print:ring-0">
                <span className="h-1.5 w-1.5 rounded-full bg-background" />
              </span>
              <div className="space-y-1 text-sm">
                <h4 className="font-semibold text-foreground">
                  {highlight.title}
                </h4>
                <p className="text-muted-foreground/90 leading-relaxed font-normal">
                  {highlight.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
