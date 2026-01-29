import Link from "next/link";
import { Github, Mail } from "lucide-react";
import { siteConfig } from "@/config/site";

/**
 * 🦶 页脚组件 - 极致简约设计
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-auto border-t border-border/40 bg-background/50 backdrop-blur-md">
      <div className="container mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          {/* Logo & Copyright */}
          <div className="flex flex-col items-center gap-2 md:items-start">
            <Link
              href="/"
              className="text-lg font-bold tracking-tighter hover:opacity-80 transition-opacity"
            >
              BLOG_FR
            </Link>
            <p className="text-muted-foreground text-xs font-medium">
              © {currentYear} Created by tomy. All rights reserved.
            </p>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-5">
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noopener noreferrer"
              className="group text-muted-foreground hover:text-primary transition-all duration-300"
              title="GitHub"
            >
              <Github className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            </a>
            <a
              href={`mailto:${siteConfig.links.email}`}
              className="group text-muted-foreground hover:text-primary transition-all duration-300"
              title="Email"
            >
              <Mail className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="h-1 w-full bg-linear-to-r from-transparent via-primary/10 to-transparent" />
    </footer>
  );
}
