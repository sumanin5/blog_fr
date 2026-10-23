"use client";

import { ChevronDown, Copy, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CopyPageMenuProps {
  markdown: string;
  markdownHref?: string;
}

export function CopyPageMenu({ markdown, markdownHref }: CopyPageMenuProps) {
  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      toast.success("Markdown 已复制");
    } catch {
      toast.error("复制失败，请手动选择正文内容");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Copy className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Copy page</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={copyMarkdown} className="gap-2">
          <Copy className="h-4 w-4" />
          复制 Markdown
        </DropdownMenuItem>
        {markdownHref && (
          <DropdownMenuItem asChild className="gap-2">
            <a href={markdownHref} target="_blank" rel="noreferrer">
              <FileText className="h-4 w-4" />
              查看纯 Markdown
            </a>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
