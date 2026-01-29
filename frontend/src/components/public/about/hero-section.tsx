import { PageHeader } from "../common/page-header";

export function HeroSection() {
  return (
    <PageHeader
      tagline="sys.info — version 1.0.0"
      title="About &"
      subtitle="Backstory"
      description="这是一个为“技术极客”设计的数字花园。我们不仅分享代码，更在构建一个优雅、高效且富有审美的知识分享系统。"
      className="mb-32"
    />
  );
}
