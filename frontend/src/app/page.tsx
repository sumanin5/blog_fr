import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-8 sm:p-20">
      <main className="flex flex-col items-center gap-8">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Welcome to <span className="text-primary">BLOG_FR</span>
          </h1>
          <p className="max-w-[600px] text-muted-foreground text-lg">
            A modern blogging platform built with Next.js 15, FastAPI, and
            Tailwind CSS v4. High performance, SEO optimized, and developer
            friendly.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <a
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-8 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            href="/blog"
          >
            Read Blog
          </a>
          <a
            className="flex h-12 items-center justify-center rounded-full border border-solid border-black/[.08] px-8 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
