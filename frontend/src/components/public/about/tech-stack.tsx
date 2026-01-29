"use client";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { TECH_STACK } from "./data";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 },
  },
};

export function TechStackSection() {
  return (
    <div className="space-y-16 mb-32">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4 tracking-tight">技术栈蓝图</h2>
        <p className="text-muted-foreground font-mono text-sm">
          System Architecture & Core Components
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        className="grid gap-6 lg:grid-cols-3"
      >
        {TECH_STACK.map((tech, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            className={cn(
              "relative p-1 rounded-[2rem] overflow-hidden group",
              tech.borderColor,
              "border",
            )}
          >
            <div className="absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl", tech.bgColor, tech.color)}>
                  <tech.icon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-lg">{tech.category}</h4>
              </div>

              <ul className="space-y-3">
                {tech.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center text-sm font-medium text-muted-foreground"
                  >
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full mr-3",
                        tech.color.replace("text-", "bg-"),
                      )}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
