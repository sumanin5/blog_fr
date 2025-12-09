import React from 'react';
import { Button } from './ui/Button';
import { ArrowRight, Sparkles, Zap, Shield, Globe, Cpu, Code } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen">

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-48">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-secondary/10 rounded-full blur-[100px] -z-10" />

        <div className="container px-4 md:px-6 mx-auto flex flex-col items-center text-center space-y-8 max-w-5xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-background/50 backdrop-blur px-3 py-1 text-sm font-medium text-primary mb-4">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            Lumina OS v2.0 is live
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60 leading-[1.1]">
            Knowledge for the <br className="hidden sm:inline" />
            <span className="text-primary glow-text">Next Generation</span> of Engineers
          </h1>

          <p className="mx-auto max-w-[700px] text-muted-foreground text-lg md:text-xl leading-relaxed">
            A minimalist, AI-powered publishing platform designed for developers, designers, and tech enthusiasts.
            Experience content like never before with Gemini integration.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-4">
            <Button size="lg" variant="tech" className="h-12 px-8 text-base" onClick={() => navigate('/blog')}>
              Start Reading <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base" onClick={() => navigate('/register')}>
              Join Network
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border/40 bg-background/50 backdrop-blur-sm">
        <div className="container px-4 md:px-6 mx-auto py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <h3 className="text-3xl font-bold font-mono">10K+</h3>
              <p className="text-sm text-muted-foreground uppercase tracking-widest">Developers</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-bold font-mono">500+</h3>
              <p className="text-sm text-muted-foreground uppercase tracking-widest">Articles</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-bold font-mono">99.9%</h3>
              <p className="text-sm text-muted-foreground uppercase tracking-widest">Uptime</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-bold font-mono">0.2s</h3>
              <p className="text-sm text-muted-foreground uppercase tracking-widest">Latency</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container px-4 md:px-6 mx-auto py-24">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
           <h2 className="text-3xl md:text-5xl font-bold tracking-tighter">
             Architected for Performance
           </h2>
           <p className="max-w-[900px] text-muted-foreground text-lg">
             Built with the latest stack to ensure a seamless reading experience.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Sparkles className="h-10 w-10 text-primary" />}
            title="AI Summarization"
            description="Leverage Google Gemini to generate concise summaries of complex technical articles instantly."
          />
          <FeatureCard
            icon={<Zap className="h-10 w-10 text-primary" />}
            title="Blazing Fast"
            description="Powered by React and Vite, delivering content with near-zero latency and smooth transitions."
          />
          <FeatureCard
            icon={<Shield className="h-10 w-10 text-primary" />}
            title="Secure by Design"
            description="Enterprise-grade security standards with encrypted user data and secure authentication."
          />
          <FeatureCard
            icon={<Globe className="h-10 w-10 text-primary" />}
            title="Global Edge"
            description="Content delivered via edge networks ensuring low latency access from anywhere on Earth."
          />
          <FeatureCard
            icon={<Cpu className="h-10 w-10 text-primary" />}
            title="Modern Stack"
            description="Built using the latest React Server Components concepts and Tailwind CSS architecture."
          />
          <FeatureCard
            icon={<Code className="h-10 w-10 text-primary" />}
            title="Developer First"
            description="Syntax highlighting, code snippets, and technical deep dives tailored for engineers."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container px-4 md:px-6 mx-auto py-24">
        <div className="relative rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-secondary/10 px-6 py-16 md:px-16 md:py-24 text-center">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-primary/20 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-secondary/20 rounded-full blur-[80px]" />

          <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Ready to upgrade your knowledge?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of developers who trust Lumina for their daily dose of tech insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="h-12 px-8" onClick={() => navigate('/register')}>
                Create Account
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8" onClick={() => navigate('/blog')}>
                Browse Articles
              </Button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-background/50 p-8 transition-all hover:bg-muted/50 hover:shadow-lg hover:border-primary/50">
    <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
      {icon}
    </div>
    <h3 className="mb-2 text-xl font-bold">{title}</h3>
    <p className="text-muted-foreground leading-relaxed">{description}</p>
  </div>
);
