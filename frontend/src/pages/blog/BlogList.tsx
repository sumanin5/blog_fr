import { useNavigate } from "react-router-dom";
import { ListCard, type ListCardItem } from "@/components/common/ListCard";
import { Sparkles, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";

type Category = "All" | "React" | "TypeScript" | "CSS" | "DevOps";

/**
 * 📝 博客文章数据（示例）
 */
const BLOG_POSTS: (ListCardItem & { category: Category })[] = [
  {
    id: 1,
    title: "React 19 新特性详解",
    excerpt:
      "深入了解 React 19 带来的革命性变化，包括 Server Components、Actions 等新功能。",
    coverImage:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80",
    date: "2024-01-15",
    readTime: "8 分钟",
    tags: ["React", "前端", "JavaScript"],
    category: "React",
    author: {
      name: "张伟",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zhangwei",
      role: "前端架构师",
    },
  },
  {
    id: 2,
    title: "TypeScript 5.0 实战指南",
    excerpt:
      "探索 TypeScript 5.0 的新特性，学习如何在实际项目中应用这些强大的类型系统功能。",
    coverImage:
      "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800&q=80",
    date: "2024-01-10",
    readTime: "12 分钟",
    tags: ["TypeScript", "类型系统", "前端"],
    category: "TypeScript",
    author: {
      name: "李娜",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=lina",
      role: "全栈工程师",
    },
  },
  {
    id: 3,
    title: "Tailwind CSS 最佳实践",
    excerpt: "分享在大型项目中使用 Tailwind CSS 的经验和技巧，提升开发效率。",
    coverImage:
      "https://images.unsplash.com/photo-1507721999472-8ed4421c4af2?w=800&q=80",
    date: "2024-01-05",
    readTime: "6 分钟",
    tags: ["CSS", "Tailwind", "样式设计"],
    category: "CSS",
    author: {
      name: "王强",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=wangqiang",
      role: "UI 工程师",
    },
  },
];

const CATEGORIES: Category[] = ["All", "React", "TypeScript", "CSS", "DevOps"];

/**
 * 📚 博客列表页面
 */
export default function BlogList() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  const filteredPosts = useMemo(() => {
    if (activeCategory === "All") return BLOG_POSTS;
    return BLOG_POSTS.filter((post) => post.category === activeCategory);
  }, [activeCategory]);

  return (
    <>
      <section className="relative overflow-hidden px-4 py-20 text-center sm:py-32 lg:px-8">
        <div className="relative container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="border-border bg-background/50 mx-auto mb-6 flex max-w-fit items-center justify-center space-x-2 overflow-hidden rounded-full border px-4 py-1.5 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-muted-foreground text-sm font-medium">
                技术分享与实践
              </span>
            </div>

            <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
              探索
              <span className="bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                技术世界
              </span>
              <br />
              构建
              <span className="text-foreground">优秀项目</span>
            </h1>

            <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-lg leading-relaxed sm:text-xl">
              深度分享前端开发、架构设计、最佳实践等技术文章。为开发者提供有价值的见解和实践指导。
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters & Grid Section */}
      <section className="container mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="border-border bg-muted/30 flex w-fit flex-wrap gap-2 rounded-lg border p-1 backdrop-blur-sm transition-colors">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-background text-foreground ring-border shadow-sm ring-1"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4" />
            <span>共 {filteredPosts.length} 篇文章</span>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post, index) => (
            <ListCard
              key={post.id}
              item={post}
              index={index}
              onClick={() => navigate(`/blog/${post.id}`)}
            />
          ))}
        </div>

        {/* 空状态提示 */}
        {filteredPosts.length === 0 && (
          <div className="text-muted-foreground border-border flex h-64 flex-col items-center justify-center rounded-xl border border-dashed">
            <p>当前分类暂无文章</p>
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => setActiveCategory("All")}
            >
              查看所有文章
            </Button>
          </div>
        )}
      </section>
    </>
  );
}
