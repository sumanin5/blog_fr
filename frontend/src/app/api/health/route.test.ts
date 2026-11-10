// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.restoreAllMocks());

describe("deployment readiness", () => {
  it("checks backend readiness without caching", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining("/health/ready"),
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
  });

  it("returns 503 when the backend is unhealthy", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("private detail", { status: 503 }));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });

  it("returns 503 when the backend cannot be reached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("private connection detail"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });
});
