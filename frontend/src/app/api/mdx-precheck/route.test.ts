// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("dev mdx-precheck API", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
      REVALIDATE_SECRET: "test-secret",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  function buildRequest(body: unknown, token = "test-secret") {
    return new NextRequest("http://localhost:3000/api/mdx-precheck", {
      method: "POST",
      headers: {
        authorization: token ? `Bearer ${token}` : "",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  it("returns 404 in production even with valid token", async () => {
    process.env = { ...process.env, NODE_ENV: "production" };
    const response = await POST(
      buildRequest({ files: [{ path: "a.mdx", source: "hello" }] }),
    );
    expect(response.status).toBe(404);
  });

  it("returns 401 when bearer secret is missing or mismatched", async () => {
    const response = await POST(
      buildRequest({ files: [] }, "wrong-secret"),
    );
    expect(response.status).toBe(401);
  });

  it("accepts valid MDX using registered Tabs and ignores capitalized tags inside code fences", async () => {
    const response = await POST(
      buildRequest({
        files: [
          {
            path: "ideas/note/valid.mdx",
            source: [
              "---",
              "title: Demo",
              "---",
              "# Heading",
              "",
              '<Tabs defaultValue="a">',
              "<TabsList>",
              '  <TabsTrigger value="a">A</TabsTrigger>',
              "</TabsList>",
              '<TabsContent value="a">',
              "",
              "- 列表项",
              "",
              "```tsx",
              "<FakeTagInCode />",
              "```",
              "",
              "</TabsContent>",
              "</Tabs>",
            ].join("\n"),
          },
        ],
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, checked: 1 });
  });

  it("rejects unregistered JSX tags and MDX syntax errors with 422", async () => {
    const unknownRes = await POST(
      buildRequest({
        files: [
          {
            path: "ideas/note/unknown.mdx",
            source: "<NonExistentWidget />",
          },
        ],
      }),
    );
    expect(unknownRes.status).toBe(422);
    const unknownBody = (await unknownRes.json()) as {
      ok: boolean;
      errors: Array<{ path: string; message: string }>;
    };
    expect(unknownBody.ok).toBe(false);
    expect(unknownBody.errors[0]?.message).toContain("NonExistentWidget");

    const syntaxRes = await POST(
      buildRequest({
        files: [
          {
            path: "ideas/note/bad-indent.mdx",
            source: [
              '<Tabs defaultValue="a">',
              '<TabsContent value="a">',
              "- item",
              "  </TabsContent>",
              "</Tabs>",
            ].join("\n"),
          },
        ],
      }),
    );
    expect(syntaxRes.status).toBe(422);
    const syntaxBody = (await syntaxRes.json()) as {
      ok: boolean;
      errors: Array<{ path: string; message: string }>;
    };
    expect(syntaxBody.ok).toBe(false);
    expect(syntaxBody.errors[0]?.path).toBe("ideas/note/bad-indent.mdx");
  });

  it("compiles CJK emphasis near Chinese punctuation cleanly without warnings", async () => {
    const response = await POST(
      buildRequest({
        files: [
          {
            path: "ideas/note/cjk.mdx",
            source: [
              "---",
              "title: CJK",
              "---",
              "# CJK",
              "",
              "从**“阶段性指标交付”**与**自指（Self-Reference）**继续，把**《道德经》**和~~（旧方案）~~看清楚。",
            ].join("\n"),
          },
        ],
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, checked: 1 });
  });

  it("returns non-blocking warnings with file line numbers for spaced or unclosed ** outside code", async () => {
    const response = await POST(
      buildRequest({
        files: [
          {
            path: "ideas/note/warn.mdx",
            source: [
              "---",
              "title: Warn",
              "---",
              "# Warn",
              "",
              "这里是** 多余空格 **的问题。",
              "",
              "这一行是**忘记闭合的加粗。",
              "",
              "行内代码 `**kwargs` 与下方代码块不该误报：",
              "",
              "```python",
              "def fn(**kwargs):",
              "    return 2 ** 3",
              "```",
            ].join("\n"),
          },
        ],
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      ok: boolean;
      checked: number;
      warnings?: Array<{ path: string; line: number | null; message: string }>;
    };
    expect(body.ok).toBe(true);
    expect(body.checked).toBe(1);
    expect(body.warnings).toBeDefined();
    expect(body.warnings?.length).toBe(2);
    expect(body.warnings?.[0]?.path).toBe("ideas/note/warn.mdx");
    expect(body.warnings?.[0]?.line).toBe(6);
    expect(body.warnings?.[0]?.message).toContain("多余空格");
    expect(body.warnings?.[1]?.line).toBe(8);
    expect(body.warnings?.[1]?.message).toContain("忘记闭合");
  });
});
