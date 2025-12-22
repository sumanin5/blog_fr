import { Link } from "@tanstack/react-router";
import { Github, Twitter, Mail } from "lucide-react";

/**
 * 🦶 页脚链接配置
 */
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
 * 🦶 页脚组件
 *
 * 特点：
 * 1. 科技风格的系统状态显示
 * 2. 毛玻璃背景效果
 * 3. 响应式布局（移动端垂直，桌面端水平）
 * 4. 社交媒体链接
 * 5. 版权信息
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-border/40 bg-background/80 border-t backdrop-blur-sm">
      <div className="container mx-auto max-w-screen-2xl px-4">
        {/* ============================================
            主要内容区域
            ============================================ */}
        <div className="flex flex-col items-center justify-between gap-4 py-6 md:h-24 md:flex-row md:py-0">
          {/* 左侧：系统状态（科技风格） */}
          <div className="flex flex-col items-center gap-2 md:flex-row md:gap-4">
            {/* 状态指示器 */}
            <p className="text-muted-foreground font-mono text-sm">
              SYSTEM_STATUS:{" "}
              <span className="inline-flex items-center gap-1 text-green-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                ONLINE
              </span>
            </p>

            {/* 分隔符 */}
            <span className="text-muted-foreground/50 hidden md:inline">
              //
            </span>

            {/* 技术栈标识 */}
            <p className="text-muted-foreground font-mono text-sm">
              POWERED_BY:{" "}
              <span className="text-primary/80">REACT + VITE + TAILWIND</span>
            </p>
          </div>

          {/* 右侧：链接组 */}
          <div className="flex items-center gap-4">
            {/* 页面链接 */}
            <nav className="text-muted-foreground flex items-center gap-4 text-sm">
              {FOOTER_LINKS.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="hover:text-primary transition-colors hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* 分隔线 */}
            <div className="bg-border/50 h-4 w-px" />

            {/* 社交媒体图标 */}
            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary p-1 transition-colors"
                  title={social.label}
                >
                  <social.icon className="h-4 w-4" />
                  <span className="sr-only">{social.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================
            版权信息（可选，更完整的页脚）
            ============================================ */}
        <div className="border-border/20 text-muted-foreground border-t py-4 text-center text-xs">
          <p>
            © {currentYear} My Blog. All rights reserved.
            <span className="mx-2">|</span>
            <span className="font-mono">BUILD_VERSION: 1.0.0</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
