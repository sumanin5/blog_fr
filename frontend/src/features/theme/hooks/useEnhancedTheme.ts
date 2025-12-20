import { useTheme as useNextTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * 🪝 增强的主题 Hook
 *
 * 在 next-themes 基础上添加更多功能
 */
export function useEnhancedTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  // 防止 hydration 不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取实际显示的主题（解决 system 主题的显示问题）
  const actualTheme = mounted ? resolvedTheme : undefined;

  // 主题切换动画
  const setThemeWithTransition = (newTheme: string) => {
    // 添加过渡类
    document.documentElement.classList.add("theme-transitioning");

    setTheme(newTheme);

    // 移除过渡类
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
    }, 300);
  };

  // 切换到下一个主题
  const toggleTheme = () => {
    const themes = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme || "system");
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // 检查是否为暗色主题
  const isDark = actualTheme === "dark";
  const isLight = actualTheme === "light";
  const isSystem = theme === "system";

  return {
    // 原始 next-themes 功能
    theme,
    setTheme,
    resolvedTheme: actualTheme,
    systemTheme,

    // 增强功能
    mounted,
    isDark,
    isLight,
    isSystem,
    toggleTheme,
    setThemeWithTransition,

    // 主题状态检查
    isReady: mounted && actualTheme !== undefined,
  };
}
