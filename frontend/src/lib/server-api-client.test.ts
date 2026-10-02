// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
const cookieState = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => cookieState.token ? { value: cookieState.token } : undefined }) }));
import { createServerFetch, serverClient } from "./server-api-client";
import { listPostsByType } from "@/shared/api/generated/sdk.gen";

afterEach(() => { cookieState.token = undefined; vi.restoreAllMocks(); });

describe("server SDK fetch boundary", () => {
  it("passes cache tags through the generated SDK and keeps wire keys unchanged", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], total: 0, view_count: 2 }));
    const result = await listPostsByType({ path: { post_type: "articles" }, client: serverClient, fetch: createServerFetch({ tags: ["posts"] }) });
    expect(result.data).toHaveProperty("view_count", 2);
    expect(request).toHaveBeenCalledWith(expect.any(Request), expect.objectContaining({ next: { revalidate: 300, tags: ["posts", "api"] } }));
  });
  it("preserves Request headers and disables caching for authenticated calls", async () => {
    cookieState.token = "test-token";
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({}));
    await createServerFetch({ tags: ["posts"] })(new Request("http://example.test", { headers: { "X-Request-ID": "test-id" } }));
    const init = request.mock.calls[0][1];
    const headers = new Headers(init?.headers);
    expect(headers.get("X-Request-ID")).toBe("test-id");
    expect(headers.get("Authorization")).toBe("Bearer test-token");
    expect(init?.cache).toBe("no-store");
    expect(init?.next).toBeUndefined();
  });
});
