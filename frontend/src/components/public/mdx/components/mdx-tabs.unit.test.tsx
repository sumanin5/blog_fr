import { fireEvent, render, screen } from "@testing-library/react";
import { compileMDX } from "next-mdx-remote/rsc";
import { renderToStaticMarkup } from "react-dom/server";
import remarkGfm from "remark-gfm";
import { describe, expect, it, vi } from "vitest";
import { createMdxComponents } from "../registry/mdx-components";
import {
  MdxTabs,
  MdxTabsContent,
  MdxTabsList,
  MdxTabsTrigger,
} from "./mdx-tabs";

describe("MdxTabs", () => {
  it("compiles standard MDX Tabs into a zero-reflow shared grid with high-contrast semantic tokens", async () => {
    const mdxSource = `
<Tabs defaultValue="sync" className="my-6">
<TabsList>
  <TabsTrigger value="sync">同步实现</TabsTrigger>
  <TabsTrigger value="async">异步事件循环</TabsTrigger>
</TabsList>
<TabsContent value="sync">

同步模式说明内容。

</TabsContent>
<TabsContent value="async">

- 异步第一条
- 异步第二条

</TabsContent>
</Tabs>
`;

    const { content } = await compileMDX({
      source: mdxSource,
      components: createMdxComponents(),
      options: {
        mdxOptions: {
          remarkPlugins: [remarkGfm],
        },
      },
    });

    const html = renderToStaticMarkup(content);
    const container = document.createElement("div");
    container.innerHTML = html;

    // 两个面板同时挂载在共享的 CSS Grid 容器中，确保切换零重排
    const tabsRoot = container.querySelector('[data-slot="tabs"]');
    expect(tabsRoot).not.toBeNull();
    const gridWrapper = tabsRoot?.querySelector("div.mt-3.grid");
    expect(gridWrapper).not.toBeNull();

    const panels = gridWrapper?.querySelectorAll('[data-slot="tabs-content"]');
    expect(panels?.length).toBe(2);

    const syncPanel = panels?.[0] as HTMLElement;
    const asyncPanel = panels?.[1] as HTMLElement;

    expect(syncPanel.textContent).toContain("同步模式说明内容");
    expect(asyncPanel.textContent).toContain("异步第一条");

    // 激活态与非激活态可访问性及布局叠加样式
    expect(syncPanel.getAttribute("data-state")).toBe("active");
    expect(syncPanel.getAttribute("aria-hidden")).toBeNull();
    expect(syncPanel.hasAttribute("inert")).toBe(false);
    expect(syncPanel.getAttribute("tabindex")).toBe("0");

    expect(asyncPanel.getAttribute("data-state")).toBe("inactive");
    expect(asyncPanel.getAttribute("aria-hidden")).toBe("true");
    expect(asyncPanel.hasAttribute("inert")).toBe(true);
    expect(asyncPanel.getAttribute("tabindex")).toBe("-1");

    for (const cls of [
      "col-start-1",
      "row-start-1",
      "[&[hidden]]:block",
      "data-[state=inactive]:invisible",
      "data-[state=inactive]:pointer-events-none",
      "data-[state=inactive]:select-none",
      "rounded-lg",
      "border-border/60",
      "bg-card/60",
      "p-4",
    ]) {
      expect(asyncPanel.className).toContain(cls);
    }

    // TabsList / TabsTrigger 使用语义化高对比度 Token，不含硬编码色板类名
    const tabsList = container.querySelector('[data-slot="tabs-list"]');
    expect(tabsList?.className).toContain("border-border/70");
    expect(tabsList?.className).toContain("bg-muted/60");

    const activeTrigger = container.querySelector(
      '[data-slot="tabs-trigger"][data-state="active"]',
    );
    expect(activeTrigger?.className).toContain(
      "data-[state=active]:bg-background",
    );
    expect(activeTrigger?.className).toContain(
      "dark:data-[state=active]:bg-background",
    );
    expect(activeTrigger?.className).toContain(
      "data-[state=active]:ring-primary/30",
    );

    const inactiveTrigger = container.querySelector(
      '[data-slot="tabs-trigger"][data-state="inactive"]',
    );
    expect(inactiveTrigger?.className).toContain("text-muted-foreground");
    expect(html).not.toMatch(/\b(bg|text|border)-(slate|gray|zinc|white|black)\b/);
  });

  it("updates active panel accessibility attributes and keeps all panels mounted on tab switch", () => {
    render(
      <MdxTabs defaultValue="first">
        <MdxTabsList>
          <MdxTabsTrigger value="first">面板一</MdxTabsTrigger>
          <MdxTabsTrigger value="second">面板二</MdxTabsTrigger>
        </MdxTabsList>
        <MdxTabsContent value="first">
          <button type="button">第一页按钮</button>
        </MdxTabsContent>
        <MdxTabsContent value="second">
          <button type="button">第二页按钮</button>
        </MdxTabsContent>
        <p data-testid="trailing-note">附注</p>
      </MdxTabs>,
    );

    const panels = screen.getAllByRole("tabpanel", { hidden: true });
    expect(panels).toHaveLength(2);
    expect(panels[0]).toHaveAttribute("data-state", "active");
    expect(panels[0]).not.toHaveAttribute("aria-hidden");
    expect(panels[0]).not.toHaveAttribute("inert");
    expect(panels[0]).toHaveAttribute("tabindex", "0");

    expect(panels[1]).toHaveAttribute("data-state", "inactive");
    expect(panels[1]).toHaveAttribute("aria-hidden", "true");
    expect(panels[1]).toHaveAttribute("inert");
    expect(panels[1]).toHaveAttribute("tabindex", "-1");

    // 尾部附注节点保留在共享 Grid 之外
    const grid = panels[0].parentElement;
    expect(grid).toHaveClass("mt-3", "grid");
    expect(grid?.contains(screen.getByTestId("trailing-note"))).toBe(false);

    // 点击切换到第二个 Tab（Radix TabsTrigger 在 mouseDown button=0 时激活）
    const secondTrigger = screen.getByRole("tab", { name: "面板二" });
    fireEvent.mouseDown(secondTrigger, { button: 0 });
    fireEvent.click(secondTrigger);

    expect(panels[0]).toHaveAttribute("data-state", "inactive");
    expect(panels[0]).toHaveAttribute("aria-hidden", "true");
    expect(panels[0]).toHaveAttribute("inert");
    expect(panels[0]).toHaveAttribute("tabindex", "-1");

    expect(panels[1]).toHaveAttribute("data-state", "active");
    expect(panels[1]).not.toHaveAttribute("aria-hidden");
    expect(panels[1]).not.toHaveAttribute("inert");
    expect(panels[1]).toHaveAttribute("tabindex", "0");
  });

  it("supports controlled value and onValueChange props cleanly", () => {
    const onValueChange = vi.fn();
    render(
      <MdxTabs value="b" onValueChange={onValueChange}>
        <MdxTabsList>
          <MdxTabsTrigger value="a">A</MdxTabsTrigger>
          <MdxTabsTrigger value="b">B</MdxTabsTrigger>
        </MdxTabsList>
        <MdxTabsContent value="a">内容 A</MdxTabsContent>
        <MdxTabsContent value="b">内容 B</MdxTabsContent>
      </MdxTabs>,
    );

    const panels = screen.getAllByRole("tabpanel", { hidden: true });
    expect(panels[0]).toHaveAttribute("aria-hidden", "true");
    expect(panels[1]).not.toHaveAttribute("aria-hidden");

    const triggerA = screen.getByRole("tab", { name: "A" });
    fireEvent.mouseDown(triggerA, { button: 0 });
    expect(onValueChange).toHaveBeenCalledWith("a");
  });
});
