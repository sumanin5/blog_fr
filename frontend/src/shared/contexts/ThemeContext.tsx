import { createContext, useContext, useEffect, useState } from "react";

// 定义主题类型：可以是 "dark" (深色), "light" (浅色), 或者 "system" (跟随系统设置)
type Theme = "dark" | "light" | "system";

// 定义 Context 的数据结构
type ThemeProviderState = {
  theme: Theme; // 当前选中的主题模式 (注意：这不一定是最终显示的主题，比如选了 system，实际可能是 dark)
  setTheme: (theme: Theme) => void; // 切换主题的方法
};

// 初始状态
const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

// 创建 React Context
// 这是一个"全局数据管道"，让任何子组件都能访问到主题信息
const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

// 组件属性类型定义
type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string; // 也就是 localStorage 的 key，默认叫 "vite-ui-theme"
  enableTransitions?: boolean; // 是否启用主题切换动画，默认 true
  onThemeChange?: (theme: Theme) => void; // 主题切换时的回调函数
};

/**
 * 🎨 主题提供者组件 (ThemeProvider)
 *
 * 它的核心工作原理：
 * 1. 管理 theme 状态 (存储在 localStorage 中)。
 * 2. 监听 theme 变化，动态修改 HTML 根标签 (<html>) 的 class。
 *    - 如果是 "dark" -> 给 <html> 加上 class="dark"
 *    - 如果是 "light" -> 给 <html> 移除 class="dark"
 *    - 如果是 "system" -> 检查系统的 prefers-color-scheme，再决定加不加 class="dark"
 * 3. 通过 Context 把 theme 和 setTheme 暴露给子组件使用。
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  enableTransitions = true,
  onThemeChange,
  ...props
}: ThemeProviderProps) {
  // 1. 初始化 State
  // 优先从 localStorage 读取上次存的主题，读不到就用默认值
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );

  useEffect(() => {
    const root = window.document.documentElement;
    // 1. 创建系统主题的监听对象
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    // 2. 封装「更新页面主题类名」的逻辑（抽成函数，方便复用）
    const updateThemeClass = () => {
      // 🎨 性能优化：移除全局过渡注入，改用 CSS 控制
      // 旧方案会导致全页面重排，造成 500ms+ 卡顿
      // 新方案：只更新类名，让 CSS 中的 transition 自然生效

      root.classList.remove("light", "dark");
      if (theme === "system") {
        // 检测当前系统主题（实时）
        const systemTheme = mediaQuery.matches ? "dark" : "light";
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    };

    // 3. 首次执行：初始化页面类名
    updateThemeClass();

    // 4. 添加监听：系统主题变化时，重新执行updateThemeClass
    mediaQuery.addEventListener("change", updateThemeClass);

    // 5. 清理监听：组件卸载时移除（避免内存泄漏）
    return () => {
      mediaQuery.removeEventListener("change", updateThemeClass);
    };
  }, [theme, enableTransitions]); // 依赖theme和enableTransitions，变化时重新执行

  // 4. 封装 value 对象
  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      // 更新状态时，顺便保存到 localStorage
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);

      // 🔔 触发回调函数（如果提供了）
      onThemeChange?.(newTheme);
    },
  };

  // 5. 渲染 Context Provider，把 value 传下去
  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

/**
 * 🪝 自定义 Hook: useTheme
 *
 * 让子组件可以方便地使用： const { theme, setTheme } = useTheme()
 */
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};
