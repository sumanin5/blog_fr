"use client";

import NextLink from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, FileText, Folder } from "lucide-react";
import { Category } from "@/shared/api/types";
import { cn } from "@/lib/utils";
import { getThumbnailUrl, getMediaUrl } from "@/lib/media-utils";
import { motion } from "framer-motion";

interface CategoryCardProps {
  category: Category;
  postType: string;
}

export function CategoryCard({ category, postType }: CategoryCardProps) {
  const postCount = category.postCount ?? 0;
  // Use 'large' thumbnail or original cover if available
  const coverImageUrl = getThumbnailUrl(category.coverMediaId, "large");
  const iconMediaId = category.iconId;
  const iconUrl = getMediaUrl(iconMediaId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5 }}
      className="group h-full"
    >
      <NextLink
        href={`/posts/${postType}/categories/${category.slug}`}
        className="block h-full w-full outline-hidden"
      >
        <Card
          className={cn(
            "group relative h-[400px] w-full overflow-hidden rounded-2xl border border-border/50 bg-card transition-all hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5",
          )}
        >
          {/* Background Image Layer */}
          <div className="absolute inset-0 z-0">
            {coverImageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverImageUrl}
                  alt={category.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-100"
                />

                {/* Top Semantic Gradient: Softly blends top edge into card background */}
                <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-card/60 to-transparent z-10" />

                {/* Semantic Gradient Overlay: Fades from transparent into the CARD BACKGROUND COLOR */}
                {/* This ensures readability regardless of theme (Light: White fade; Dark: Black fade) */}
                <div className="absolute inset-0 bg-linear-to-t from-card via-muted/80 to-transparent opacity-100" />
              </>
            ) : (
              <div className="h-full w-full opacity-10 pointer-events-none">
                <div className="absolute inset-0 bg-size-[20px_20px] bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)]" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent" />
              </div>
            )}
          </div>

          {/* Content Container */}
          <div className="relative z-10 h-full flex flex-col justify-between">
            {/* Top Section: Badge */}
            <CardHeader className="p-8 pb-4">
              <div className="flex justify-between items-start">
                <div></div>
                <Badge
                  variant="outline"
                  className="font-mono text-[10px] uppercase tracking-[0.2em] px-3 py-1 border-dashed backdrop-blur-sm border-border text-foreground/80 bg-background/50"
                >
                  {postType || "Module"}
                </Badge>
              </div>
            </CardHeader>

            <div className="flex flex-col flex-1 justify-end">
              <CardContent className="px-8 pb-4">
                {/* Icon & Title Group */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    {iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={iconUrl}
                        alt="icon"
                        className="w-10 h-10 object-contain drop-shadow-sm"
                      />
                    ) : (
                      <div className="text-4xl">
                        {/* Icon Preset or Default Folder */}
                        {category.iconPreset ? (
                          <span className="text-primary">
                            {category.iconPreset}
                          </span>
                        ) : (
                          <Folder className="w-10 h-10 text-primary" />
                        )}
                      </div>
                    )}

                    <CardTitle className="text-4xl font-bold tracking-tighter transition-colors group-hover:text-primary text-card-foreground">
                      {category.name}
                    </CardTitle>
                  </div>

                  <div className="h-1 w-12 bg-primary rounded-full origin-left transition-transform duration-500 group-hover:scale-x-150 ml-1" />

                  <p className="line-clamp-2 text-sm leading-relaxed font-light mt-4 text-muted-foreground">
                    {category.excerpt ||
                      "探索此分类下的所有技术文章与深度分析，发现更多灵感与见解。"}
                  </p>
                </div>
              </CardContent>

              <CardFooter className="p-8 pt-4 flex items-center justify-between border-t mt-4 border-border/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-card-foreground">
                      {postCount} Articles
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono uppercase">
                      system.storage.v1
                    </span>
                  </div>
                </div>

                <motion.div
                  whileHover={{ x: 5 }}
                  className="flex items-center justify-center w-10 h-10 rounded-full border transition-all border-border bg-background/50 hover:bg-primary/10 hover:border-primary/20 hover:text-primary text-foreground"
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </CardFooter>
            </div>
          </div>

          {/* Decorative Corner */}
          <div className="absolute bottom-0 right-0 w-12 h-12 pointer-events-none opacity-30">
            <div className="absolute bottom-0 right-0 w-full h-full border-r border-b border-primary translate-x-6 translate-y-6" />
          </div>
        </Card>
      </NextLink>
    </motion.div>
  );
}
