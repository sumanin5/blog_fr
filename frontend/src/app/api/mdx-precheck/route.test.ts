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
});
