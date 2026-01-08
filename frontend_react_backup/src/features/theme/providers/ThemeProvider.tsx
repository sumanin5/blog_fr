import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ComponentProps } from "react";

/**
 * 🎨 简化的主题提供者
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="my-blog-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
