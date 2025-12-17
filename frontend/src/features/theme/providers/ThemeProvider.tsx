import { useLayoutEffect, useState } from "react";
import { type Theme, ThemeProviderContext } from "../types/theme";

// 默认的 storage key，与 index.html 中的内联脚本保持一致
const DEFAULT_STORAGE_KEY = "my-blog-theme";

// 组件属性类型定义
type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string; // localStorage 的 key，默认 "my-blog-theme"
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
    storageKey = DEFAULT_STORAGE_KEY,
    onThemeChange,
    ...props
}: ThemeProviderProps) {
    // 1. 初始化 State
    // 优先从 localStorage 读取上次存的主题，读不到就用默认值
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
    );

    // 使用 useLayoutEffect 在浏览器绑制前同步更新 DOM，减少闪烁
    useLayoutEffect(() => {
        const root = window.document.documentElement;
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        // 计算实际应该显示的主题
        const getResolvedTheme = () => {
            if (theme === "system") {
                return mediaQuery.matches ? "dark" : "light";
            }
            return theme;
        };

        // 更新页面主题类名（只在需要时更新，避免不必要的 DOM 操作）
        const updateThemeClass = () => {
            const resolvedTheme = getResolvedTheme();
            const currentTheme = root.classList.contains("dark") ? "dark" : "light";

            // 只有当主题真正改变时才更新 DOM
            if (currentTheme !== resolvedTheme) {
                root.classList.remove("light", "dark");
                root.classList.add(resolvedTheme);
            }
        };

        // 首次执行
        updateThemeClass();

        // 监听系统主题变化
        mediaQuery.addEventListener("change", updateThemeClass);

        return () => {
            mediaQuery.removeEventListener("change", updateThemeClass);
        };
    }, [theme]);

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
