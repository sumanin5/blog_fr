import { MDXProvider } from "@/shared/components/mdx";
import TestContent from "@/shared/content/test-highlight.mdx";

export default function TestHighlight() {
  return (
    <div className="container mx-auto px-4 py-8">
      <article className="prose max-w-none">
        <MDXProvider>
          <TestContent />
        </MDXProvider>
      </article>
    </div>
  );
}
