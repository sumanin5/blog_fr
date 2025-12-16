import * as React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/shared/components/ui/badge";

interface HeroSectionProps {
    badge?: {
        icon?: React.ComponentType<{ className?: string }>;
        text: string;
    };
    title: React.ReactNode;
    description?: string;
    className?: string;
}

/**
 * 🎨 Hero 区域组件
 *
 * 可复用的页面头部区域，支持徽章、标题、描述等
 */
export function HeroSection({ badge, title, description, className }: HeroSectionProps) {
    return (
        <section className={`relative overflow-hidden px-4 py-20 text-center sm:py-32 lg:px-8 ${className || ""}`}>
            <div className="relative container mx-auto max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {badge && (
                        <Badge variant="secondary" className="mx-auto mb-6 gap-2">
                            {badge.icon && <badge.icon className="h-3.5 w-3.5 text-yellow-400" />}
                            {badge.text}
                        </Badge>
                    )}

                    <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
                        {title}
                    </h1>

                    {description && (
                        <p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-lg leading-relaxed sm:text-xl">
                            {description}
                        </p>
                    )}
                </motion.div>
            </div>
        </section>
    );
}
