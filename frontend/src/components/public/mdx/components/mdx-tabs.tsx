"use client";

import * as React from "react";

import {
  Tabs as UiTabs,
  TabsContent as UiTabsContent,
  TabsList as UiTabsList,
  TabsTrigger as UiTabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface MdxTabsContextValue {
  inMdxTabs: boolean;
  activeValue: string | undefined;
}

const MdxTabsContext = React.createContext<MdxTabsContextValue>({
  inMdxTabs: false,
  activeValue: undefined,
});

function flattenReactNodes(children: React.ReactNode): React.ReactNode[] {
  const flat: React.ReactNode[] = [];
  React.Children.forEach(children, (child) => {
    if (child === null || child === undefined || typeof child === "boolean") {
      return;
    }
    if (typeof child === "string" && child.trim().length === 0) {
      return;
    }
    if (React.isValidElement(child) && child.type === React.Fragment) {
      const props = child.props as { children?: React.ReactNode };
      flat.push(...flattenReactNodes(props.children));
      return;
    }
    flat.push(child);
  });
  return flat;
}

function isTabsContentElement(
  node: React.ReactNode,
): node is React.ReactElement<React.ComponentProps<typeof UiTabsContent>> {
  if (!React.isValidElement(node)) {
    return false;
  }
  if (node.type === MdxTabsContent) {
    return true;
  }
  const typeMeta = node.type as
    | { displayName?: string; name?: string }
    | undefined;
  if (
    typeMeta?.displayName === "MdxTabsContent" ||
    typeMeta?.name === "MdxTabsContent"
  ) {
    return true;
  }
  // 兼容 RSC 传输边界代理引用：Tabs 直接子元素中仅 TabsContent 携带字符串 value 属性
  const props = node.props as Record<string, unknown> | undefined;
  return (
    typeof node.type !== "string" &&
    typeof props?.value === "string" &&
    node.type !== MdxTabsList &&
    node.type !== MdxTabsTrigger
  );
}

/**
 * MDX 文章专用 Tabs 根容器：
 * - 追踪当前激活标签并通过 Context 同步给子级 TabsContent
 * - 自动将同组 TabsContent 收入共享 CSS Grid，实现切换零重排（自适应最高面板）
 * - 完全向后兼容标准 `<Tabs defaultValue="..."><TabsList>...<TabsContent>...</Tabs>` 写法
 */
export function MdxTabs({
  className,
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: React.ComponentProps<typeof UiTabs>) {
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = React.useState<
    string | undefined
  >(defaultValue);

  const activeValue = isControlled ? value : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [isControlled, onValueChange],
  );

  const contextValue = React.useMemo<MdxTabsContextValue>(
    () => ({
      inMdxTabs: true,
      activeValue,
    }),
    [activeValue],
  );

  const nodes = React.useMemo(() => flattenReactNodes(children), [children]);
  const leadingNodes: React.ReactNode[] = [];
  const panelNodes: React.ReactNode[] = [];
  const trailingNodes: React.ReactNode[] = [];

  for (const node of nodes) {
    if (isTabsContentElement(node)) {
      panelNodes.push(node);
    } else if (panelNodes.length === 0) {
      leadingNodes.push(node);
    } else {
      trailingNodes.push(node);
    }
  }

  return (
    <MdxTabsContext.Provider value={contextValue}>
      <UiTabs
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        className={cn("my-6 flex flex-col gap-0", className)}
        {...props}
      >
        {leadingNodes}
        {panelNodes.length > 0 ? (
          <div className="mt-3 grid grid-cols-1">{panelNodes}</div>
        ) : null}
        {trailingNodes}
      </UiTabs>
    </MdxTabsContext.Provider>
  );
}
MdxTabs.displayName = "MdxTabs";

/**
 * MDX TabsList：带明确底槽边框与响应式换行能力。
 */
export function MdxTabsList({
  className,
  ...props
}: React.ComponentProps<typeof UiTabsList>) {
  return (
    <UiTabsList
      className={cn(
        "not-prose inline-flex h-auto w-fit max-w-full flex-wrap items-center justify-start gap-1 rounded-lg border border-border/70 bg-muted/60 p-1 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
MdxTabsList.displayName = "MdxTabsList";

/**
 * MDX TabsTrigger：强化亮色与暗黑模式下激活态/未激活态的视觉反差，附带主色底边指示条。
 */
export function MdxTabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof UiTabsTrigger>) {
  return (
    <UiTabsTrigger
      className={cn(
        "relative h-auto flex-none cursor-pointer rounded-md border border-transparent px-3 py-1.5 text-sm font-medium text-muted-foreground dark:text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground dark:hover:bg-background/40 dark:hover:text-foreground data-[state=active]:border-border dark:data-[state=active]:border-border data-[state=active]:bg-background dark:data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground dark:data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-primary/30 after:pointer-events-none after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100",
        className,
      )}
      {...props}
    />
  );
}
MdxTabsTrigger.displayName = "MdxTabsTrigger";

/**
 * MDX TabsContent：
 * - 带独立语义卡片外框（rounded-lg border border-border/60 bg-card/60 p-4）
 * - 默认开启 forceMount，并叠放在同一网格单元（col-start-1 row-start-1）锁住最大面板高度
 * - 非激活态保留占位高度同时通过 aria-hidden / inert / tabIndex=-1 阻断误聚焦与读屏干扰
 */
export function MdxTabsContent({
  className,
  forceMount,
  value,
  "aria-hidden": ariaHiddenProp,
  inert: inertProp,
  tabIndex: tabIndexProp,
  ...props
}: React.ComponentProps<typeof UiTabsContent>) {
  const { inMdxTabs, activeValue } = React.useContext(MdxTabsContext);
  const isInactive = inMdxTabs && activeValue !== value;

  return (
    <UiTabsContent
      value={value}
      forceMount={forceMount ?? (inMdxTabs ? true : undefined)}
      aria-hidden={isInactive ? true : ariaHiddenProp}
      inert={isInactive ? true : inertProp}
      tabIndex={isInactive ? -1 : (tabIndexProp ?? 0)}
      className={cn(
        "col-start-1 row-start-1 min-w-0 flex-none rounded-lg border border-border/60 bg-card/60 p-4 text-card-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&[hidden]]:block data-[state=inactive]:invisible data-[state=inactive]:pointer-events-none data-[state=inactive]:select-none",
        className,
      )}
      {...props}
    />
  );
}
MdxTabsContent.displayName = "MdxTabsContent";
