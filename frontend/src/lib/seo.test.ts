// @vitest-environment node
import { describe, expect, it } from "vitest";
import { absoluteUrl, toPlainExcerpt } from "./seo";

describe("toPlainExcerpt", () => {
  it("strips markdown syntax, code blocks and JSX before truncating", () => {
    const md = "---\ntitle: x\n---\n# 标题\n\n> 引用 **加粗** 与 [链接](https://a.b)\n\n```py\nprint(1)\n```\n\n<Callout>提示</Callout>\n- 列表项 `code`";
    expect(toPlainExcerpt(md)).toBe("标题 引用 加粗 与 链接 提示 列表项 code");
  });
  it("truncates with an ellipsis", () => {
    expect(toPlainExcerpt("一二三四五六", 3)).toBe("一二三…");
  });
});

describe("absoluteUrl", () => {
  it("resolves paths against the canonical site url", () => {
    expect(absoluteUrl("/posts/articles/x")).toMatch(/^https?:\/\/[^/]+\/posts\/articles\/x$/);
  });
});
