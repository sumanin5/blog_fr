import React from "react";
import { Terminal, Search, Github, Twitter, Sun, Moon } from "lucide-react";
import { Button } from "./ui/Button";

interface HeaderProps {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, toggleTheme }) => {
  return (
    <header className="border-border/40 bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur transition-colors duration-300">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors">
            <Terminal size={18} />
          </div>
          <span className="text-lg font-bold tracking-tight">DevPulse_</span>
        </div>

        <nav className="text-muted-foreground hidden items-center gap-6 text-sm font-medium md:flex">
          <a href="#" className="hover:text-foreground transition-colors">
            Blog
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Projects
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            About
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Uses
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <input
              type="text"
              placeholder="Search posts..."
              className="border-input bg-background focus:border-ring focus:ring-ring h-9 w-64 rounded-md border pr-4 pl-9 text-sm transition-all outline-none focus:ring-1"
            />
          </div>

          <div className="border-border ml-2 flex items-center gap-1 border-l pl-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
            <Button variant="ghost" size="icon">
              <Github size={20} />
            </Button>
            <Button variant="ghost" size="icon">
              <Twitter size={20} />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
