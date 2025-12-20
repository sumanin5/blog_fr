import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes/dist/types";

/**
 * 🎨 主题提供者组件 (使用 next-themes)
 *
 * 现在使用 next-themes 库来处理主题管理，提供更稳定的实现
 * 支持多种定制化配置
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      // 基础配置
      attribute="class" // 使用 class 属性控制主题
      defaultTheme="system" // 默认跟随系统
      enableSystem // 启用系统主题检测
      disableTransitionOnChange // 禁用切换时的过渡动画，避免闪烁
      storageKey="my-blog-theme" // localStorage 存储键
      // 高级定制选项
      themes={["light", "dark", "system"]} // 可用主题列表
      enableColorScheme={false} // 不自动设置 color-scheme
      // 自定义属性值映射（可选）
      // value={{ light: 'light-mode', dark: 'dark-mode' }}

      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
