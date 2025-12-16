import { useNavigate } from "react-router-dom";
import { type ListCardItem } from "@/shared/components/common/ListCard";
import { HeroSection, CategoryFilter } from "@/shared/components/common";
import { PostGrid } from "@/features/blog/components";
import { Sparkles, FileText } from "lucide-react";
import { useState, useMemo } from "react";

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
      <HeroSection
        badge={{
          icon: Sparkles,
          text: "技术分享与实践"
        }}
        title={
          <>
            探索
            <span className="bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              技术世界
            </span>
            <br />
            构建
            <span className="text-foreground">优秀项目</span>
          </>
        }
        description="深度分享前端开发、架构设计、最佳实践等技术文章。为开发者提供有价值的见解和实践指导。"
      />

      <section className="container mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <CategoryFilter
          categories={CATEGORIES}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          itemCount={filteredPosts.length}
        />

        <PostGrid
          posts={filteredPosts}
          onPostClick={(post) => navigate(`/blog/${post.id}`)}
          emptyState={{
            icon: FileText,
            message: "当前分类暂无文章",
            action: {
              label: "查看所有文章",
              onClick: () => setActiveCategory("All")
            }
          }}
        />
      </section>
    </>
  );
}
