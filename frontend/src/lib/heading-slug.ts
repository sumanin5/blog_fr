export type HeadingSlugger = (title: string) => string;

/**
 * Create a slugger that mirrors backend PostProcessor._generate_unique_slug.
 *
 * Backend logic:
 *   base_slug = re.sub(r"[^\w\s-]", "", title).strip().lower().replace(" ", "-")
 *   base_slug = re.sub(r"-+", "-", base_slug).strip("-")
 *   duplicates => `${base}-${n}` (starting from 1)
 */
export function createHeadingSlugger(): HeadingSlugger {
  const counter: Record<string, number> = {};

  return (title: string) => {
    let base = title
      .replace(/[^\p{L}\p{N}_\s-]/gu, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!base) base = "heading";

    if (counter[base] == null) {
      counter[base] = 1;
      return base;
    }

    const n = counter[base];
    counter[base] += 1;
    return `${base}-${n}`;
  };
}

export function extractTextFromReactNode(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromReactNode).join("");

  if (typeof node === "object" && node !== null && "props" in node) {
    const props = (node as { props?: unknown }).props;
    if (props && typeof props === "object" && "children" in props) {
      return extractTextFromReactNode((props as { children?: unknown }).children);
    }
  }

  return "";
}
