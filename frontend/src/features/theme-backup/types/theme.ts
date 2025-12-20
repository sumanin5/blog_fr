import { createContext } from "react";

// 定义主题类型：可以是 "dark" (深色), "light" (浅色), 或者 "system" (跟随系统设置)
export type Theme = "dark" | "light" | "system";

// 定义 Context 的数据结构
export type ThemeProviderState = {
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
export const ThemeProviderContext =
  createContext<ThemeProviderState>(initialState);
