"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CodeBlock = ({
  className,
  code,
}: {
  className?: string;
  code: string;
}) => {
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  // Extract language name from className (e.g., "language-typescript" -> "typescript")
  const language = className?.match(/language-([\w-]+)/)?.[1] || "";

  useEffect(() => {
    let isMounted = true;
    const element = ref.current;
    if (!element) return;

    const highlight = async () => {
      if (!isMounted) return;

      const hljs = (await import("highlight.js")).default;
      if (!isMounted) return;

      // Reset for re-highlighting
      element.removeAttribute("data-highlighted");
      element.classList.remove("hljs");

      hljs.highlightElement(element);
    };

    highlight();

    return () => {
      isMounted = false;
    };
  }, [code, className]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="relative my-4 group rounded-lg border bg-muted/50">
      {/* Header / Actions Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50 rounded-t-lg">
        {/* Language Badge */}
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {language || "TEXT"}
        </span>

        {/* Copy Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onCopy}
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Code Area */}
      <div className="overflow-x-auto p-4 pt-2">
        <pre className="m-0! p-0! bg-transparent">
          <code
            ref={ref}
            className={`${className || ""} bg-transparent p-0! border-0`}
          >
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
};
