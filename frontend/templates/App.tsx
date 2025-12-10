import React, { useState, useMemo, useEffect } from "react";
import { Header } from "./components/Header";
import { BlogCard } from "./components/BlogCard";
import { MOCK_POSTS } from "./constants";
import { Category } from "./types";
import { Button } from "./components/ui/Button";
import { Sparkles, Filter } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORIES: Category[] = ["All", "Frontend", "Backend", "DevOps", "AI"];

function App() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Initialize theme from local storage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  // Update HTML class and localStorage
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const filteredPosts = useMemo(() => {
    if (activeCategory === "All") return MOCK_POSTS;
    return MOCK_POSTS.filter((post) => post.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="bg-background text-foreground selection:bg-primary/20 selection:text-primary min-h-screen font-sans transition-colors duration-300">
      {/* Background Grid Decoration */}
      <div className="bg-grid-pattern pointer-events-none fixed inset-0 z-0 opacity-30" />
      <div className="from-background pointer-events-none fixed inset-0 z-0 bg-gradient-to-t via-transparent to-transparent" />

      <Header theme={theme} toggleTheme={toggleTheme} />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 py-20 text-center sm:py-32 lg:px-8">
          {/* Glow Effect behind title - Adjusted color for better visibility in light mode */}
          <div
            className={`pointer-events-none absolute top-1/2 left-1/2 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px] transition-colors duration-500 ${
              theme === "dark" ? "bg-primary/20" : "bg-blue-500/10"
            }`}
          />

          <div className="relative container mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="border-border bg-background/50 mx-auto mb-6 flex max-w-fit items-center justify-center space-x-2 overflow-hidden rounded-full border px-4 py-1.5 shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                <span className="text-muted-foreground text-sm font-medium">
                  The Future of Development
                </span>
              </div>

              <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
                Explore the{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Unknown
                </span>
                <br /> Build the{" "}
                <span className="text-foreground">Impossible.</span>
              </h1>

              <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-lg leading-relaxed sm:text-xl">
                Insights on Frontend Architecture, AI Engineering, and the
                modern web ecosystem. Curated for the builders of tomorrow.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  size="lg"
                  className={`rounded-full ${
                    theme === "dark"
                      ? "shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                      : "shadow-primary/20 shadow-lg"
                  }`}
                >
                  Latest Articles
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="hover:bg-muted/50 rounded-full bg-transparent"
                >
                  Subscribe Newsletter
                </Button>
              </div>
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
              <span>Showing {filteredPosts.length} posts</span>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post, index) => (
              <BlogCard key={post.id} post={post} index={index} />
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-muted-foreground border-border flex h-64 flex-col items-center justify-center rounded-xl border border-dashed">
              <p>No posts found for this category.</p>
              <Button
                variant="ghost"
                className="mt-4"
                onClick={() => setActiveCategory("All")}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </section>
      </main>

      <footer className="border-border/40 bg-background/50 text-muted-foreground border-t py-12 text-center text-sm backdrop-blur transition-colors">
        <p>© 2024 DevPulse Blog. Built with React & Tailwind.</p>
      </footer>
    </div>
  );
}

export default App;
