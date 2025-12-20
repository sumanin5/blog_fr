import { Moon, Sun, Monitor, Palette } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useEnhancedTheme } from "../hooks/useEnhancedTheme";

/**
 * 🎨 高级主题切换组件
 *
 * 提供更丰富的主题切换功能
 */
export function AdvancedThemeToggle() {
  const {
    theme,
    setTheme,
    setThemeWithTransition,
    toggleTheme,
    isDark,
    isSystem,
    isReady,
  } = useEnhancedTheme();

  // 防止 hydration 不匹配
  if (!isReady) {
    return (
      <Button variant="outline" size="icon" disabled>
        <div className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    );
  }

  const themeConfig = {
    light: {
      icon: Sun,
      label: "浅色模式",
      description: "使用浅色主题",
    },
    dark: {
      icon: Moon,
      label: "深色模式",
      description: "使用深色主题",
    },
    system: {
      icon: Monitor,
      label: "跟随系统",
      description: "跟随系统设置",
    },
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          {/* 主图标 */}
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />

          {/* 系统主题指示器 */}
          {isSystem && (
            <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400" />
          )}

          <span className="sr-only">切换主题</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        {Object.entries(themeConfig).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = theme === key;

          return (
            <DropdownMenuItem
              key={key}
              onClick={() => setThemeWithTransition(key)}
              className={`flex items-center gap-2 ${isActive ? "bg-accent" : ""}`}
            >
              <Icon className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{config.label}</span>
                <span className="text-muted-foreground text-xs">
                  {config.description}
                </span>
              </div>
              {isActive && (
                <div className="bg-primary ml-auto h-2 w-2 rounded-full" />
              )}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={toggleTheme}
          className="flex items-center gap-2"
        >
          <Palette className="h-4 w-4" />
          <span className="text-sm">快速切换</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
