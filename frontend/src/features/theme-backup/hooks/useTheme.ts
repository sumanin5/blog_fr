import { useContext } from "react";
import { ThemeProviderContext } from "../types/theme";

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
