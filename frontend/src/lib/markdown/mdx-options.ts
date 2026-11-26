import rehypeKatex from "rehype-katex";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkCjkFriendlyGfmStrikethrough from "remark-cjk-friendly-gfm-strikethrough";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { serialize } from "next-mdx-remote/serialize";

export type MdxSerializeOptions = NonNullable<Parameters<typeof serialize>[1]>;
export type MdxCompileOptions = NonNullable<MdxSerializeOptions["mdxOptions"]>;
export type MdxRemarkPlugins = NonNullable<MdxCompileOptions["remarkPlugins"]>;
export type MdxRehypePlugins = NonNullable<MdxCompileOptions["rehypePlugins"]>;

export interface LeakedEmphasisWarning {
  line: number | null;
  snippet: string;
}

interface MdastPosition {
  start?: {
    line?: number;
  };
}

interface MdastNode {
  type?: string;
  value?: unknown;
  position?: MdastPosition;
  children?: MdastNode[];
}

/**
 * 检查普通文本节点中是否仍残留未闭合或被空格/标点阻断的裸露 `**`。
 */
export function hasSuspiciousRawBoldMarkers(text: string): boolean {
  if (!text.includes("**")) return false;

  // 忽略纯算术幂运算 `2 ** 3`
  const withoutPow = text.replace(/\b\d+\s*\*\*\s*\d+\b/g, "");
  if (!withoutPow.includes("**")) return false;

  // 忽略函数签名/参数解包中的单个 `**kwargs`（仅当不存在第二个 `**` 时）
  const markerCount = (withoutPow.match(/\*\*/g) ?? []).length;
  if (
    markerCount === 1 &&
    /(?:^|[(\s,，])\*\*[A-Za-z_][A-Za-z0-9_]*(?=[),:\s，。]|$)/.test(
      withoutPow,
    )
  ) {
    return false;
  }

  return true;
}

/**
 * 创建用于 `/api/mdx-precheck` 的 remark 插件：收集解析完成后仍残留的裸露 `**` 位置。
 * 仅遍历 MDAST 中的普通 `text` 节点，自动豁免代码块、行内代码、数学公式与 JSX 属性。
 */
export function createLeakedEmphasisCollector(
  warnings: LeakedEmphasisWarning[],
  lineOffset = 0,
): MdxRemarkPlugins[number] {
  return function collectLeakedEmphasis() {
    return (tree: MdastNode) => {
      const visit = (node: MdastNode) => {
        if (
          node.type === "code" ||
          node.type === "inlineCode" ||
          node.type === "math" ||
          node.type === "inlineMath"
        ) {
          return;
        }

        if (node.type === "text" && typeof node.value === "string") {
          if (hasSuspiciousRawBoldMarkers(node.value)) {
            const rawLine = node.position?.start?.line;
            warnings.push({
              line: typeof rawLine === "number" ? rawLine + lineOffset : null,
              snippet: node.value.replace(/\s+/g, " ").trim().slice(0, 80),
            });
          }
          return;
        }

        if (Array.isArray(node.children)) {
          for (const child of node.children) {
            visit(child);
          }
        }
      };

      visit(tree);
    };
  };
}

export const mdxRemarkPlugins: MdxRemarkPlugins = [
  remarkGfm,
  remarkCjkFriendly,
  remarkCjkFriendlyGfmStrikethrough,
  remarkMath,
];

export const mdxRehypePlugins: MdxRehypePlugins = [rehypeKatex];

/**
 * 统一构造前端服务端/客户端/预检共用的 MDX 编译配置。
 * 严禁引入 `server-only`，以保证 `MdxClientRenderer` 等客户端渲染链路可安全复用。
 */
export function createMdxCompileOptions(
  extraRemarkPlugins: MdxRemarkPlugins = [],
): Pick<MdxSerializeOptions, "mdxOptions"> {
  return {
    mdxOptions: {
      remarkPlugins: [...mdxRemarkPlugins, ...extraRemarkPlugins],
      rehypePlugins: [...mdxRehypePlugins],
    },
  };
}
