"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  FileText,
  Layers,
  Lightbulb,
  User,
  Settings,
  Sun,
  Moon,
  Laptop,
  Search,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="relative h-8 w-full justify-start rounded-full bg-muted/40 text-xs font-normal text-muted-foreground shadow-none hover:bg-muted/70 sm:w-40 md:w-56"
      >
        <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-60" />
        <span className="hidden sm:inline-flex">搜索文章或命令...</span>
        <span className="inline-flex sm:hidden">搜索...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-background/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="输入关键词搜索页面、文章或命令..." />
        <CommandList>
          <CommandEmpty>未找到相关结果。</CommandEmpty>
          
          <CommandGroup heading="核心导航">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/"))}
            >
              <FileText className="mr-2 h-4 w-4" />
              <span>首页 (Home)</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/posts/articles/categories"))}
            >
              <Layers className="mr-2 h-4 w-4" />
              <span>专栏合集 (Categories)</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/posts/ideas"))}
            >
              <Lightbulb className="mr-2 h-4 w-4" />
              <span>灵感流 (Ideas & Streams)</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/about"))}
            >
              <User className="mr-2 h-4 w-4" />
              <span>关于博主 (About)</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/admin/dashboard"))}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>管理后台 (Admin Console)</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="外观与主题">
            <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
              <Sun className="mr-2 h-4 w-4" />
              <span>浅色模式 (Light Mode)</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
              <Moon className="mr-2 h-4 w-4" />
              <span>深色模式 (Dark Mode)</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
              <Laptop className="mr-2 h-4 w-4" />
              <span>跟随系统 (System Default)</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
