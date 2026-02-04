import { revalidatePath, updateTag } from "next/cache";
import { NextRequest } from "next/server";

/**
 * Next.js 缓存失效 API
 * 用于后端同步完成后，手动失效前端缓存
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 验证密钥
    const authHeader = request.headers.get("authorization");
    const secret = process.env.REVALIDATE_SECRET;

    if (!secret || authHeader !== `Bearer ${secret}`) {
      console.error("❌ Unauthorized revalidate request");
      console.error(`Received: ${authHeader}`);
      console.error(`Expected: Bearer ${secret}`);
      return Response.json(
        { error: "Unauthorized", received: authHeader },
        { status: 401 },
      );
    }

    // 2. 解析请求体
    const body = await request.json();
    const { tags = [], paths = [] } = body;

    // 3. 失效 tags
    if (Array.isArray(tags) && tags.length > 0) {
      for (const tag of tags) {
        // 在 Next.js 16 中使用 updateTag 代替 revalidateTag
        await updateTag(tag);
        console.log(`✅ Revalidated tag: ${tag}`);
      }
    }

    // 4. 失效 paths
    if (Array.isArray(paths) && paths.length > 0) {
      for (const path of paths) {
        // 明确指定 type 为 'page' 以避免 TS 报错
        revalidatePath(path, "page");
        console.log(`✅ Revalidated path: ${path}`);
      }
    }

    // 5. 返回成功响应
    return Response.json({
      success: true,
      revalidated: {
        tags,
        paths,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Revalidate error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
