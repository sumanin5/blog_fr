"use client";

import React from "react";
import { motion } from "framer-motion";
import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  tagline: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  tagline,
  title,
  subtitle,
  description,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "max-w-4xl mx-auto text-center space-y-8 mb-16 px-4",
        className,
      )}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-mono text-primary backdrop-blur-sm mx-auto"
      >
        <Terminal className="mr-2 h-3.5 w-3.5" />
        <span>{tagline}</span>
      </motion.div>

      <div className="space-y-6">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-5xl font-extrabold tracking-tighter sm:text-7xl bg-clip-text text-transparent bg-linear-to-b from-foreground to-foreground/50 py-2 leading-tight px-4"
        >
          {title}
          {subtitle && (
            <>
              <br />
              <span className="text-primary/80">{subtitle}</span>
            </>
          )}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto"
        >
          {description}
        </motion.p>
      </div>

      {children && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}
