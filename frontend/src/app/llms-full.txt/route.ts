import { siteConfig } from "@/config/site";
import { getPublishedPost, renderPostMarkdown } from "@/lib/markdown/export";
import { READER_MAX_PART_CHARS } from "@/lib/markdown/reader";
import { POST_TYPES, absoluteUrl, getAllPublishedPosts, type PublishedPost } from "@/lib/seo";

export const revalidate = 300;

// 逐篇请求详情接口，限制并发避免瞬时压垮后端（详情请求均走数据缓存）
const CONCURRENCY = 5;

async function renderAll(posts: PublishedPost[]) {
  const results: string[] = [];
  for (let i = 0; i < posts.length; i += CONCURRENCY) {
    const batch = await Promise.all(
      posts.slice(i, i + CONCURRENCY).map(async (post) => {
        const detail = await getPublishedPost(post.postType, post.slug);
        return detail ? renderPostMarkdown(detail, post.postType, post.slug) : null;
      }),
    );
    results.push(...batch.filter((doc): doc is string => doc !== null));
  }
  return results;
}

/** llms-full.txt：全部已发布文章的 Markdown 合集，供 LLM 一次性读取 */
export async function GET() {
  const posts = (await Promise.all(POST_TYPES.map(getAllPublishedPosts))).flat();
  const documents = await renderAll(posts);

  const header = `# ${siteConfig.name}\n\n> ${siteConfig.description}\n\n> 若单次抓取有长度上限，请改用每篇文章的 \`/posts/:type/:slug/read\` 分段入口，每段约 ${READER_MAX_PART_CHARS} 字。\n\n来源：${absoluteUrl("/")}，共 ${documents.length} 篇。\n`;
  const body = `${header}\n${documents.join("\n\n")}`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Length": String(new TextEncoder().encode(body).byteLength),
      "Access-Control-Allow-Origin": "*",
    },
  });
}
