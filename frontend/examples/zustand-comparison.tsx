/**
 * Zustand vs 当前方案对比示例
 *
 * 这个文件展示了如果使用 Zustand 替换当前的状态管理会是什么样子
 */

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createContext, useContext, useState, useEffect } from "react";

// ============================================
// 示例 1：UI 状态管理（侧边栏）
// ============================================

// ========== 当前方案：React Context ==========

// 1. 定义类型
type SidebarContextType = {
  isOpen: boolean;
  toggle: () => void;
};

// 2. 创建 Context
const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// 3. 创建 Provider
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);

  const toggle = () => setIsOpen((prev) => !prev);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

// 4. 创建 Hook
export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

// 5. 使用
function SidebarWithContext() {
  const { isOpen, toggle } = useSidebar();

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <button onClick={toggle}>Toggle</button>
      <nav>Sidebar Content</nav>
    </aside>
  );
}

// 总代码量：约 30 行

// ========== Zustand 方案 ==========

// 1. 创建 Store（包含类型定义）
interface SidebarState {
  isOpen: boolean;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: true,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}));

// 2. 使用（无需 Provider）
function SidebarWithZustand() {
  const { isOpen, toggle } = useSidebarStore();

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <button onClick={toggle}>Toggle</button>
      <nav>Sidebar Content</nav>
    </aside>
  );
}

// 总代码量：约 10 行
// 减少：67%

// ============================================
// 示例 2：主题管理
// ============================================

// ========== 当前方案：next-themes ==========

// 使用 next-themes（已经处理了所有复杂逻辑）
/*
import { useTheme } from "next-themes";

function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();

  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      Current: {theme === "system" ? systemTheme : theme}
    </button>
  );
}
*/

// 优势：
// - 自动处理 SSR 闪烁
// - 自动检测系统主题
// - 自动持久化
// - 零配置

// ========== Zustand 方案 ==========

interface ThemeState {
  theme: "light" | "dark" | "system";
  resolvedTheme: "light" | "dark";
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "system",
      resolvedTheme: "light",

      setTheme: (theme) => {
        set({ theme });

        // 手动处理系统主题
        let resolved: "light" | "dark" = "light";
        if (theme === "system") {
          resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
        } else {
          resolved = theme;
        }

        set({ resolvedTheme: resolved });

        // 手动更新 DOM
        document.documentElement.classList.toggle("dark", resolved === "dark");
      },
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// 需要在客户端初始化时处理 SSR 闪烁
export function ThemeInitializer() {
  useEffect(() => {
    const { theme, setTheme } = useThemeStore.getState();
    setTheme(theme); // 触发 DOM 更新

    // 监听系统主题变化
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        setTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return null;
}

function ThemeToggleWithZustand() {
  const { theme, resolvedTheme, setTheme } = useThemeStore();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      Current: {theme === "system" ? `system (${resolvedTheme})` : theme}
    </button>
  );
}

// 问题：
// - 需要手动处理 SSR 闪烁（需要在 _document.tsx 添加脚本）
// - 需要手动监听系统主题变化
// - 需要手动更新 DOM
// - 代码量增加 3 倍

// ============================================
// 示例 3：复杂 UI 状态（多个对话框、抽屉等）
// ============================================

// ========== 当前方案：多个 Context ==========

// 需要为每个 UI 状态创建单独的 Context
// 代码重复，样板代码多

// ========== Zustand 方案（优势明显）==========

interface UIState {
  // 侧边栏
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // 主对话框
  dialogOpen: boolean;
  dialogContent: React.ReactNode | null;
  openDialog: (content: React.ReactNode) => void;
  closeDialog: () => void;

  // 确认对话框
  confirmDialogOpen: boolean;
  confirmDialogConfig: {
    title: string;
    message: string;
    onConfirm: () => void;
  } | null;
  openConfirmDialog: (config: {
    title: string;
    message: string;
    onConfirm: () => void;
  }) => void;
  closeConfirmDialog: () => void;

  // 抽屉
  drawerOpen: boolean;
  drawerContent: React.ReactNode | null;
  openDrawer: (content: React.ReactNode) => void;
  closeDrawer: () => void;

  // 通知
  notifications: Array<{
    id: string;
    message: string;
    type: "info" | "success" | "error";
  }>;
  addNotification: (
    message: string,
    type: "info" | "success" | "error"
  ) => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // 侧边栏
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // 主对话框
  dialogOpen: false,
  dialogContent: null,
  openDialog: (content) => set({ dialogOpen: true, dialogContent: content }),
  closeDialog: () => set({ dialogOpen: false, dialogContent: null }),

  // 确认对话框
  confirmDialogOpen: false,
  confirmDialogConfig: null,
  openConfirmDialog: (config) =>
    set({ confirmDialogOpen: true, confirmDialogConfig: config }),
  closeConfirmDialog: () =>
    set({ confirmDialogOpen: false, confirmDialogConfig: null }),

  // 抽屉
  drawerOpen: false,
  drawerContent: null,
  openDrawer: (content) => set({ drawerOpen: true, drawerContent: content }),
  closeDrawer: () => set({ drawerOpen: false, drawerContent: null }),

  // 通知
  notifications: [],
  addNotification: (message, type) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id: Math.random().toString(), message, type },
      ],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));

// 使用示例
function ComplexUIExample() {
  const {
    sidebarOpen,
    toggleSidebar,
    openDialog,
    openConfirmDialog,
    addNotification,
  } = useUIStore();

  return (
    <div>
      <button onClick={toggleSidebar}>Toggle Sidebar</button>
      <button onClick={() => openDialog(<div>Dialog Content</div>)}>
        Open Dialog
      </button>
      <button
        onClick={() =>
          openConfirmDialog({
            title: "确认删除",
            message: "确定要删除这个项目吗？",
            onConfirm: () => console.log("Deleted"),
          })
        }
      >
        Delete Item
      </button>
      <button onClick={() => addNotification("操作成功", "success")}>
        Show Notification
      </button>
    </div>
  );
}

// 优势：
// - 所有 UI 状态集中管理
// - 无需多个 Provider
// - 代码简洁
// - 可以在任何地方调用（包括工具函数）

// ============================================
// 示例 4：性能对比
// ============================================

// ========== Context 性能问题 ==========

interface AppContextType {
  user: any;
  theme: string;
  sidebarOpen: boolean;
  // ... 更多状态
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function AppProviderWithContext({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("light");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 问题：任何一个状态变化，所有使用 useContext 的组件都会重渲染
  const value = { user, theme, sidebarOpen };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// 即使组件只需要 theme，user 变化时也会重渲染
function ThemeDisplay() {
  const { theme } = useContext(AppContext)!;
  console.log("ThemeDisplay 重渲染"); // user 变化时也会打印
  return <div>Theme: {theme}</div>;
}

// ========== Zustand 精确订阅 ==========

interface AppState {
  user: any;
  setUser: (user: any) => void;
  theme: string;
  setTheme: (theme: string) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  theme: "light",
  setTheme: (theme) => set({ theme }),
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

// 只订阅 theme，user 变化时不会重渲染
function ThemeDisplayOptimized() {
  const theme = useAppStore((state) => state.theme); // 精确订阅
  console.log("ThemeDisplayOptimized 重渲染"); // 只有 theme 变化时才打印
  return <div>Theme: {theme}</div>;
}

// ============================================
// 总结对比
// ============================================

export function ComparisonSummary() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Zustand vs 当前方案对比</h1>

      <section>
        <h2 className="text-2xl font-bold mb-4">1. 简单 UI 状态（侧边栏）</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="border p-4 rounded">
            <h3 className="font-bold mb-2">Context 方案</h3>
            <ul className="text-sm space-y-1">
              <li>✅ React 原生</li>
              <li>✅ 支持 children 穿透</li>
              <li>❌ 样板代码多（30 行）</li>
              <li>❌ 必须在 Provider 内使用</li>
            </ul>
          </div>
          <div className="border p-4 rounded">
            <h3 className="font-bold mb-2">Zustand 方案</h3>
            <ul className="text-sm space-y-1">
              <li>✅ 代码简洁（10 行）</li>
              <li>✅ 无需 Provider</li>
              <li>✅ 可以在任何地方使用</li>
              <li>❌ 额外依赖</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">2. 主题管理</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="border p-4 rounded">
            <h3 className="font-bold mb-2">next-themes</h3>
            <ul className="text-sm space-y-1">
              <li>✅ 专门为 Next.js 设计</li>
              <li>✅ 自动处理 SSR 闪烁</li>
              <li>✅ 自动检测系统主题</li>
              <li>✅ 零配置</li>
            </ul>
          </div>
          <div className="border p-4 rounded">
            <h3 className="font-bold mb-2">Zustand</h3>
            <ul className="text-sm space-y-1">
              <li>❌ 需要手动处理 SSR</li>
              <li>❌ 需要手动检测系统主题</li>
              <li>❌ 需要手动更新 DOM</li>
              <li>❌ 代码量增加 3 倍</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">3. 复杂 UI 状态</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="border p-4 rounded">
            <h3 className="font-bold mb-2">多个 Context</h3>
            <ul className="text-sm space-y-1">
              <li>❌ 需要多个 Provider</li>
              <li>❌ 样板代码重复</li>
              <li>❌ Provider 嵌套地狱</li>
            </ul>
          </div>
          <div className="border p-4 rounded bg-green-50">
            <h3 className="font-bold mb-2">Zustand（优势明显）</h3>
            <ul className="text-sm space-y-1">
              <li>✅ 集中管理所有 UI 状态</li>
              <li>✅ 无需多个 Provider</li>
              <li>✅ 代码简洁清晰</li>
              <li>✅ 可以在工具函数中使用</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">4. 性能</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="border p-4 rounded">
            <h3 className="font-bold mb-2">Context</h3>
            <ul className="text-sm space-y-1">
              <li>❌ Context 变化时所有消费者重渲染</li>
              <li>❌ 需要手动优化（useMemo、React.memo）</li>
            </ul>
          </div>
          <div className="border p-4 rounded bg-green-50">
            <h3 className="font-bold mb-2">Zustand</h3>
            <ul className="text-sm space-y-1">
              <li>✅ 精确订阅，只重渲染需要的组件</li>
              <li>✅ 自动优化，无需手动处理</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-yellow-50 p-6 rounded">
        <h2 className="text-2xl font-bold mb-4">推荐方案</h2>
        <div className="space-y-2">
          <p className="font-bold">保持现状，但在以下情况考虑 Zustand：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>UI 状态变多（多个对话框、抽屉、侧边栏）</li>
            <li>需要在 React 外访问状态（工具函数、中间件）</li>
            <li>Context 导致性能问题</li>
          </ul>
          <p className="mt-4 font-bold text-red-600">不要用 Zustand 替换：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>❌ React Query（服务端状态）</li>
            <li>❌ next-themes（主题管理）</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
