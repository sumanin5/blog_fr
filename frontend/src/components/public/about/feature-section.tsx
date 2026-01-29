"use client";

import { motion, Variants } from "framer-motion";
import { FEATURES } from "./data";

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 },
  },
};

export function FeatureSection() {
  return (
    <section className="grid gap-8 md:grid-cols-3 mb-24">
      {FEATURES.map((feature, i) => (
        <motion.div
          key={i}
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="group p-8 rounded-3xl border border-border/40 bg-card/20 backdrop-blur-xs hover:bg-card/40 transition-all hover:shadow-2xl hover:shadow-primary/5"
        >
          <div className="mb-6 inline-flex p-3 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
            <feature.icon className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
          <p className="text-muted-foreground leading-relaxed font-light">
            {feature.description}
          </p>
        </motion.div>
      ))}
    </section>
  );
}
