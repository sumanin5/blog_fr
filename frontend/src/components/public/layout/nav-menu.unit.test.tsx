import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileNav } from "./nav-menu";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: null, isLoading: false, logout: vi.fn() }),
}));

describe("mobile public authentication entry", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it.each([undefined, "false", "true"])(
    "respects NEXT_PUBLIC_SHOW_AUTH_ENTRY=%s when opening the actual mobile menu",
    async (value) => {
      vi.stubEnv("NEXT_PUBLIC_SHOW_AUTH_ENTRY", value);
      render(<MobileNav />);
      fireEvent.click(screen.getByRole("button", { name: "切换导航菜单" }));
      await screen.findByRole("dialog");
      if (value === "true") {
        expect(screen.getByRole("link", { name: "登录" })).toHaveAttribute("href", "/auth/login");
        expect(screen.getByRole("link", { name: "注册" })).toHaveAttribute("href", "/auth/register");
      } else {
        expect(screen.queryByRole("link", { name: "登录" })).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "注册" })).not.toBeInTheDocument();
      }
    },
  );
});
