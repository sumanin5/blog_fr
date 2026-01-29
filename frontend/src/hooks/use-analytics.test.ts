import { renderHook, waitFor } from "@testing-library/react";
import { useAnalytics } from "@/hooks/use-analytics";
import { describe, it, expect, beforeAll } from "vitest";
import { resetDB, loginAdmin, TEST_API_URL } from "@/lib/test-utils";
import { client } from "@/shared/api";

// Configure Client for this test file
client.setConfig({ baseUrl: TEST_API_URL });

describe("useAnalytics Integration Test (Real Backend)", () => {
  beforeAll(async () => {
    // 1. Mock User Agent to avoid "Bot" detection by backend
    Object.defineProperty(window.navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      configurable: true,
    });

    // 2. Reset Backend DB (creates admin user)
    await resetDB();
  });

  it("should send page_view and reflect in dashboard stats", async () => {
    // Step 1: Simulate Visitor (No Auth)
    // Clear cookies just in case
    if (typeof document !== "undefined") {
      document.cookie =
        "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }

    // Render Hook -> triggers 'page_view' automatically on mount
    renderHook(() => useAnalytics());

    // Step 2: Login as Admin to check stats
    // Increase wait time to ensure POST completes
    await new Promise((r) => setTimeout(r, 2000));

    const token = await loginAdmin();

    // Step 3: Fetch Stats via Raw Fetch to verify side effects
    // Dashboard stats API: /api/v1/analytics/stats/overview

    await waitFor(
      async () => {
        const res = await fetch(
          `${TEST_API_URL}/api/v1/analytics/stats/overview`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to fetch stats: ${res.status} ${text}`);
        }

        const data = await res.json();
        console.log("Stats Data:", data);

        // Verify that we have at least 1 page view
        // Correct field is total_pv
        expect(data.total_pv).toBeGreaterThan(0);
      },
      { timeout: 10000 },
    );
  });
});
