import hljs from "highlight.js";
import { CopyButton } from "./copy-button";

export const CodeBlock = ({
  className,
  code,
}: {
  className?: string;
  code: string;
}) => {
  // Extract language name from className (e.g., "language-typescript" -> "typescript")
  const language = className?.match(/language-([\w-]+)/)?.[1] || "";

  // 在服务端直接高亮代码
  let highlightedCode = code;
  try {
    if (language && hljs.getLanguage(language)) {
      highlightedCode = hljs.highlight(code, { language }).value;
    } else {
      highlightedCode = hljs.highlightAuto(code).value;
    }
  } catch (err) {
    console.error("Highlight.js error:", err);
  }

  return (
    <div className="relative my-4 group rounded-lg border bg-muted/50">
      {/* Header / Actions Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50 rounded-t-lg">
        {/* Language Badge */}
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {language || "TEXT"}
        </span>

        {/* Copy Button - 客户端组件 */}
        <CopyButton code={code} />
      </div>

      {/* Code Area */}
      <div className="overflow-x-auto p-4 pt-2">
        <pre className="m-0! p-0! bg-transparent">
          <code
            className={`hljs ${className || ""} bg-transparent p-0! border-0`}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      </div>
    </div>
  );
};
