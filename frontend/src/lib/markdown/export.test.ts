// @vitest-environment node
import { describe, expect, it } from "vitest";
import { toPortableMarkdown } from "./export";

describe("toPortableMarkdown", () => {
  it("replaces self-closing components with a readable placeholder", () => {
    expect(toPortableMarkdown("## 图表\n\n<TanStackChart />\n\n说明")).toBe(
      "## 图表\n\n*[交互内容：TanStackChart，请在原文页面查看]*\n\n说明",
    );
  });

  it("keeps inner text of paired components and JSX-only HTML", () => {
    const mdx = [
      '<InteractiveButton message="ok">',
      "  点我验证 hydration",
      "</InteractiveButton>",
      "",
      '<div style={{ padding: "20px" }}>',
      "  <strong>内联区块</strong>",
      "</div>",
    ].join("\n");
    expect(toPortableMarkdown(mdx)).toBe(
      "点我验证 hydration\n\n<strong>内联区块</strong>",
    );
  });

  it("removes the closing tag of a removed JSX-only wrapper but keeps nested plain HTML", () => {
    const mdx = '<div style={{ a: 1 }}>\n    <div>\n    普通 HTML\n    </div>\n</div>';
    expect(toPortableMarkdown(mdx)).toBe("<div>\n普通 HTML\n</div>");
  });

  it("handles multi-line component tags", () => {
    expect(toPortableMarkdown('<Chart\n  data={rows}\n  height={300}\n/>')).toBe(
      "*[交互内容：Chart，请在原文页面查看]*",
    );
  });

  it("drops MDX imports/exports but keeps prose and code blocks untouched", () => {
    const mdx = [
      'import { Chart } from "@/components/chart";',
      "export const meta = { a: 1 };",
      "import 语句只是正文里的普通一句话。",
      "```tsx",
      "<Chart />",
      'import x from "y";',
      "```",
    ].join("\n");
    expect(toPortableMarkdown(mdx)).toBe(
      ["import 语句只是正文里的普通一句话。", "```tsx", "<Chart />", 'import x from "y";', "```"].join("\n"),
    );
  });

  it("leaves plain markdown and plain HTML as is", () => {
    const md = "# 标题\n\n正文 `<Code />` 与 <kbd>Ctrl</kbd>\n\n<details>\n<summary>更多</summary>\n</details>";
    expect(toPortableMarkdown(md)).toBe(md);
  });
});
