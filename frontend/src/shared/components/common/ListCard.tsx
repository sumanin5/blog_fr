import React from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Clock, Calendar, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

export interface ListCardItem {
  id: string | number;
  title: string;
  excerpt: string;
  coverImage: string;
  date: string;
  readTime: string;
  tags: string[];
  category?: string;
  author?: {
    name: string;
    avatar: string;
    role: string;
  };
}

interface ListCardProps {
  item: ListCardItem;
  index: number;
  onClick?: () => void;
}

/**
 * 📋 列表卡片组件
 *
 * 可复用的卡片组件，适用于：
 * - 博客列表
 * - 项目列表
 * - 资源列表
 * - 任何需要展示卡片的场景
 *
 * 特性：
 * - 响应式设计
 * - 图片悬停缩放效果
 * - 标签显示
 * - 元数据显示（日期、阅读时间）
 * - 平滑动画
 */
export const ListCard: React.FC<ListCardProps> = ({ item, index, onClick }) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onClick={onClick}
      className="group border-border bg-card text-card-foreground hover:border-primary/50 hover:shadow-primary/5 relative flex cursor-pointer flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg"
    >
      {/* 图片容器 */}
      <div className="bg-muted relative aspect-video w-full overflow-hidden">
        <img
          src={item.coverImage}
          alt={item.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="from-background/80 absolute inset-0 bg-gradient-to-t to-transparent opacity-60" />

        {/* 分类标签（如果存在） */}
        {item.category && (
          <div className="absolute bottom-3 left-3 flex gap-2">
            <Badge
              variant="secondary"
              className="border-white/10 bg-black/50 text-white backdrop-blur-md"
            >
              {item.category}
            </Badge>
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex flex-1 flex-col p-5">
        {/* 标签 */}
        <div className="mb-3 flex flex-wrap gap-3">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="text-foreground/70 text-[11px] font-bold tracking-wider uppercase"
              style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* 标题 */}
        <h3 className="group-hover:text-primary mb-2 text-xl leading-tight font-bold tracking-tight transition-colors">
          {item.title}
        </h3>

        {/* 摘要 */}
        <p className="text-muted-foreground mb-4 line-clamp-2 flex-1 text-sm">
          {item.excerpt}
        </p>

        {/* 页脚元数据 */}
        <div className="border-border/50 text-muted-foreground mt-auto flex items-center justify-between border-t pt-4 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{item.date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{item.author?.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{item.readTime}</span>
            </div>
          </div>

          <div className="text-primary flex -translate-x-2 items-center gap-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
            <span className="font-medium">Read</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </motion.article>
  );
};
