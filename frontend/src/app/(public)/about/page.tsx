import type { Metadata } from "next";
import { HeroSection } from "@/components/public/about/hero-section";
import { FeatureSection } from "@/components/public/about/feature-section";
import { DataFlowVisual } from "@/components/public/about/data-flow";
import { TechStackSection } from "@/components/public/about/tech-stack";
import { ContactSection } from "@/components/public/about/contact-section";

export const metadata: Metadata = {
  title: "关于",
  description: "关于这个数字花园：基于 FastAPI 与 Next.js 的全栈博客，以及背后的技术栈与数据流设计。",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen overflow-hidden relative">
      <main className="relative z-10 container mx-auto px-4 md:px-6 py-24 lg:py-32">
        <HeroSection />
        <FeatureSection />
        {/* 4. Data Flow Visualization */}
        <div className="mb-32">
          <DataFlowVisual />
        </div>
        <TechStackSection />
        <ContactSection />
      </main>
    </div>
  );
}
