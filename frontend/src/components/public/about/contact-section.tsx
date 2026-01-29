import Link from "next/link";
import { Code2, Github, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export function ContactSection() {
  return (
    <div className="relative rounded-[3rem] border border-border/40 bg-linear-to-br from-card/50 to-background p-12 overflow-hidden text-center">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Code2 className="w-64 h-64" />
      </div>

      <div className="max-w-2xl mx-auto space-y-8 relative z-10">
        <h2 className="text-3xl font-bold">准备好一起探索了吗？</h2>
        <p className="text-lg text-muted-foreground font-light">
          这个项目是开源的，我欢迎任何形式的贡献或技术交流。如果你发现了 Bug
          或者有任何想法，随时联系我。
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Button
            size="lg"
            className="rounded-full px-8 gap-2 shadow-xl shadow-primary/20"
            asChild
          >
            <Link href="https://github.com/sumanin5/blog_fr">
              <Github className="w-5 h-5" /> GitHub 仓库
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full px-8 gap-2"
            asChild
          >
            <Link href={siteConfig.links.email}>
              <Mail className="w-5 h-5" /> 邮件联系
            </Link>
          </Button>
        </div>

        <div className="pt-8">
          <Link
            href="/"
            className="text-sm font-mono text-muted-foreground hover:text-primary flex items-center justify-center gap-2 transition-colors"
          >
            返回控制台 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
