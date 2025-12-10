import React from "react";
import { BlogPost } from "../types";
import { Badge } from "./ui/Badge";
import { Clock, Calendar, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

interface BlogCardProps {
  post: BlogPost;
  index: number;
}

export const BlogCard: React.FC<BlogCardProps> = ({ post, index }) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group border-border bg-card text-card-foreground hover:border-primary/50 hover:shadow-primary/5 relative flex flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg"
    >
      {/* Image Container */}
      <div className="bg-muted relative aspect-video w-full overflow-hidden">
        <img
          src={post.coverImage}
          alt={post.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="from-background/80 absolute inset-0 bg-gradient-to-t to-transparent opacity-60" />
        <div className="absolute bottom-3 left-3 flex gap-2">
          <Badge
            variant="secondary"
            className="border-white/10 bg-black/50 text-white backdrop-blur-md"
          >
            {post.category}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase"
            >
              #{tag}
            </span>
          ))}
        </div>

        <h3 className="group-hover:text-primary mb-2 text-xl leading-tight font-bold tracking-tight transition-colors">
          {post.title}
        </h3>

        <p className="text-muted-foreground mb-4 line-clamp-2 flex-1 text-sm">
          {post.excerpt}
        </p>

        {/* Footer Metadata */}
        <div className="border-border/50 text-muted-foreground mt-auto flex items-center justify-between border-t pt-4 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{post.date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{post.readTime}</span>
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
