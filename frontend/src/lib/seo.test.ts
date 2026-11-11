// @vitest-environment node
import { describe, expect, it } from "vitest";
import { absoluteUrl, toDomainExcerpt, toPlainExcerpt } from "./seo";

describe("toPlainExcerpt", () => {
  it("strips markdown syntax, code blocks and JSX before truncating", () => {
    const md = "---\ntitle: x\n---\n# 标题\n\n> 引用 **加粗** 与 [链接](https://a.b)\n\n```py\nprint(1)\n```\n\n<Callout>提示</Callout>\n- 列表项 `code`";
    expect(toPlainExcerpt(md)).toBe("标题 引用 加粗 与 链接 提示 列表项 code");
  });
  it("drops GitHub-style callout markers", () => {
    expect(toPlainExcerpt("## 说明\n\n> [!TIP]\n> 左侧目录负责文章集合")).toBe("说明 左侧目录负责文章集合");
  });
  it("truncates with an ellipsis", () => {
    expect(toPlainExcerpt("一二三四五六", 3)).toBe("一二三…");
  });
});

describe("toDomainExcerpt", () => {
  it("prefers the curated excerpt and removes the category name prefix", () => {
    expect(
      toDomainExcerpt(
        {
          name: "三十题记",
          excerpt: "三十题记：三十岁，一个还没长大的大人。",
        },
        40,
      ),
    ).toBe("三十岁，一个还没长大的大人。");
  });

  it("uses the first blockquote as a hook when there is no excerpt", () => {
    const description = [
      "# 🌀 GEB：自指的怪圈",
      "",
      '> "This sentence is false." (这句话是假的。)',
      "> —— 所有的故事，都从这个让逻辑崩塌的悖论开始。",
      "",
      "## 📖 简介",
      "",
      "《哥德尔、艾舍尔、巴赫》讨论逻辑、计算机与意识。",
    ].join("\n");

    expect(toDomainExcerpt({ name: "GEB", description }, 40)).toBe(
      '"This sentence is false." (这句话是假的。)',
    );
  });

  it("falls back to the first prose block when there is no blockquote", () => {
    const description = [
      "# 🌀 GEB：自指的怪圈",
      "",
      "## 📖 简介",
      "",
      "《哥德尔、艾舍尔、巴赫》讨论逻辑、计算机与意识。这是一本很难被定义的书。",
    ].join("\n");

    expect(toDomainExcerpt({ name: "GEB", description }, 25)).toBe(
      "《哥德尔、艾舍尔、巴赫》讨论逻辑、计算机与意识。",
    );
  });

  it("returns an empty string when there is no prose block", () => {
    expect(toDomainExcerpt({ description: "> 只有引用" })).toBe("");
  });
});

describe("absoluteUrl", () => {
  it("resolves paths against the canonical site url", () => {
    expect(absoluteUrl("/posts/articles/x")).toMatch(/^https?:\/\/[^/]+\/posts\/articles\/x$/);
  });
});
