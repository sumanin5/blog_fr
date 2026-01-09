import Link from "next/link";
import { Github, Twitter, Mail } from "lucide-react";

const FOOTER_LINKS = [
  { path: "/about", label: "关于" },
  { path: "/privacy", label: "隐私政策" },
  { path: "/terms", label: "服务条款" },
];

const SOCIAL_LINKS = [
  { href: "https://github.com", icon: Github, label: "GitHub" },
  { href: "https://twitter.com", icon: Twitter, label: "Twitter" },
  { href: "mailto:contact@example.com", icon: Mail, label: "Email" },
];

/**
 * 🦶 页脚组件 (Next.js 适配版)
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-border/40 bg-background/80 border-t backdrop-blur-sm">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 py-8 md:h-24 md:flex-row md:py-0">
          <div className="flex flex-col items-center gap-2 md:flex-row md:gap-4">
            <p className="text-muted-foreground font-mono text-sm">
              SYSTEM_STATUS:{" "}
              <span className="inline-flex items-center gap-1 text-green-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                ONLINE
              </span>
            </p>
            <span className="text-muted-foreground/50 hidden md:inline">
              {"//"}
            </span>
            <p className="text-muted-foreground font-mono text-sm">
              STACK: <span className="text-primary/80">NEXT.js + FASTAPI</span>
            </p>
          </div>

          <div className="flex items-center gap-6">
            <nav className="text-muted-foreground flex items-center gap-4 text-sm">
              {FOOTER_LINKS.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className="hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="bg-border/50 h-4 w-px" />

            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  title={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-border/20 text-muted-foreground border-t py-4 text-center text-xs">
          <p>
            © {currentYear} BLOG_FR. All rights reserved.
            <span className="mx-2">|</span>
            <span className="font-mono">BUILD: 2026.01.08</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
