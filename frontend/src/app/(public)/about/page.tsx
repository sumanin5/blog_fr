import { HeroSection } from "@/components/public/about/hero-section";
import { FeatureSection } from "@/components/public/about/feature-section";
import { DataFlowVisual } from "@/components/public/about/data-flow";
import { TechStackSection } from "@/components/public/about/tech-stack";
import { ContactSection } from "@/components/public/about/contact-section";

import { PageBackground } from "@/components/public/common/page-background";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen overflow-hidden relative">
      <PageBackground />

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
