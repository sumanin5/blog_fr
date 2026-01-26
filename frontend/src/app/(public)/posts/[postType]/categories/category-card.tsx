import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CategoryResponse } from "@/shared/api/generated/types.gen";
import { ArrowRight } from "lucide-react";

interface CategoryCardProps {
  category: CategoryResponse;
  postType: string;
}

export function CategoryCard({ category, postType }: CategoryCardProps) {
  // 两种模式：有封面图 vs 无封面图（纯色/渐变模式）
  // 有封面图时，强调沉浸感，文字叠加在图片上
  // 无封面图时，强调排版和图标，类似于 Bento Grid 风格

  if (category.cover_image) {
    return (
      <Link
        href={`/posts/${postType}/categories/${category.slug}`}
        className="group relative block h-full w-full"
      >
        <Card className="relative h-[320px] w-full overflow-hidden border-0 bg-black text-white shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          {/* 背景图片 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={category.cover_image}
            alt={category.name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80"
          />
          {/* 渐变遮罩: 让文字更清晰 */}
          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />

          {/* 内容区域 */}
          <div className="absolute inset-0 flex flex-col justify-end p-8">
            <div className="flex items-center gap-2 mb-3 opacity-0 -translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
              <Badge
                variant="secondary"
                className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border-0"
              >
                Explore
              </Badge>
            </div>

            <h3 className="text-3xl font-bold tracking-tight mb-2 text-white group-hover:text-primary-foreground transition-colors">
              {category.name}
            </h3>

            <p className="text-gray-300 line-clamp-2 text-sm max-w-[90%] mb-4 opacity-90 group-hover:opacity-100">
              {category.description || "暂无描述"}
            </p>

            {/* 底部互动区 */}
            <div className="flex items-center justify-between border-t border-white/20 pt-4 mt-auto">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-gray-400">
                {category.icon_preset && (
                  <span className="text-lg">{category.icon_preset}</span>
                )}
                <span>Topic Focus</span>
              </div>
              <ArrowRight className="w-5 h-5 text-white/50 transition-transform group-hover:translate-x-1 group-hover:text-white" />
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  // 无封面图模式：设计感强的卡片
  return (
    <Link
      href={`/posts/${postType}/categories/${category.slug}`}
      className="group relative block h-full w-full"
    >
      <Card className="relative flex flex-col h-[320px] w-full overflow-hidden border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group-hover:border-primary/50">
        {/* 指示条 - 类似你提供的 Activity Bar */}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-linear-to-b from-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* 顶部图标区 */}
        <div className="p-8 pb-0">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 shadow-xs">
            {category.icon_preset || "📂"}
          </div>

          <h3 className="text-2xl font-bold tracking-tight mb-2 group-hover:text-primary transition-colors">
            {category.name}
          </h3>

          <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
            {category.description || "暂无描述，点击探索更多精彩内容。"}
          </p>
        </div>

        {/* 装饰性背景圆 */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-linear-to-br from-primary/20 to-secondary/20 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none" />

        {/* 底部区域 */}
        <div className="mt-auto p-8 pt-0 flex items-center justify-between z-10">
          <Badge
            variant="outline"
            className="group-hover:bg-primary/5 border-dashed"
          >
            View Articles
          </Badge>

          <div className="w-8 h-8 rounded-full border flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
