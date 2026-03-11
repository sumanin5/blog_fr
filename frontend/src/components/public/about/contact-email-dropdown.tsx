"use client";

import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { siteConfig } from "@/config/site";
import React from "react";

// You can add more icons here if needed
const getEmailIcon = (email: string) => {
  if (email.toLowerCase().includes("gmail.com")) {
    return (
      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
      </svg>
    );
  }
  if (
    email.toLowerCase().includes("outlook.com") ||
    email.toLowerCase().includes("hotmail.com")
  ) {
    return (
      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
        <path d="M1.325 3.125a.91.91 0 0 0-.643.272.935.935 0 0 0-.258.654v15.898c0 .256.101.503.28.682a.965.965 0 0 0 .684.283h6.353V3.064H1.387c-.02 0-.041.021-.062.062zm15.118-2c-4.437 0-8.033 3.596-8.033 8.033 0 4.437 3.596 8.033 8.033 8.033 4.437 0 8.033-3.596 8.033-8.033s-3.596-8.033-8.033-8.033zm0 3.7c2.392 0 4.333 1.94 4.333 4.333 0 2.392-1.94 4.333-4.333 4.333-2.392 0-4.333-1.94-4.333-4.333 0-2.392 1.94-4.333 4.333-4.333z" />
      </svg>
    );
  }
  return <Mail className="w-4 h-4 mr-2" />;
};

export function ContactEmailDropdown() {
  const emails = siteConfig.emails as readonly {
    label: string;
    address: string;
  }[];

  // Fallback to the old single email behavior if emails array isn't defined
  if (!emails || emails.length === 0) {
    const singleEmail = siteConfig.author.email;
    return (
      <Button
        size="lg"
        variant="outline"
        className="rounded-full px-8 gap-2"
        asChild
      >
        <a href={`mailto:${singleEmail}`}>
          <Mail className="w-5 h-5" /> 邮件联系
        </a>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="lg" variant="outline" className="rounded-full px-8 gap-2">
          <Mail className="w-5 h-5" /> 邮件联系
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="min-w-[200px] p-2 rounded-xl"
      >
        <div className="text-xs text-muted-foreground font-medium px-2 py-1.5 mb-1 uppercase tracking-wider">
          选择联系邮箱
        </div>
        {emails.map((item, index) => (
          <DropdownMenuItem
            key={index}
            asChild
            className="cursor-pointer rounded-lg mb-1 last:mb-0"
          >
            <a
              href={`mailto:${item.address}`}
              className="flex items-center w-full px-2 py-2"
            >
              {getEmailIcon(item.address)}
              <div className="flex flex-col">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">
                  {item.address}
                </span>
              </div>
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
