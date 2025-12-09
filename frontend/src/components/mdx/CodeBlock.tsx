import { useRef, useState } from "react";

type Props = React.HTMLAttributes<HTMLPreElement>;

export function CodeBlock(props: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  const language =
    props.className?.match(/language-([\w-]+)/)?.[1]?.toUpperCase() ?? "CODE"; // 提取代码语言

  const handleCopy = async () => {
    // 复制代码到剪贴板
    const text = preRef.current?.innerText ?? "";
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="code-wrapper relative my-4">
      <div className="pointer-events-none absolute inset-0 rounded-lg border border-transparent" />
      <button
        type="button"
        onClick={handleCopy}
        className="sticky top-[clamp(12px,24vh,120px)] z-10 float-right mr-2 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white shadow hover:bg-black/75 focus:ring-2 focus:ring-white/70 focus:outline-none"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <span className="absolute top-2 left-2 z-10 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white shadow">
        {language}
      </span>
      <pre ref={preRef} {...props} className={`${props.className} pt-12`}>
        {props.children}
      </pre>
    </div>
  );
}
