# 前端配置完成 ✅

## 已完成的配置

### 1. 环境变量

- ✅ `.env.example` - 环境变量示例
- ✅ `.env.local` - 本地开发配置

### 2. Next.js 配置

- ✅ 图片优化（支持后端媒体文件）
- ✅ 环境变量配置
- ✅ 生产优化

### 3. 依赖安装

```bash
pnpm install
```

新增依赖：

- `katex` - 数学公式样式
- `highlight.js` - 代码高亮样式
- `mermaid` - 图表渲染
- `@tailwindcss/typography` - 文章排版

### 4. MDX 渲染组件

- ✅ `PostContent` - 文章内容渲染
- ✅ `PostToc` - 目录导航
- ✅ `PostMeta` - 文章元信息

### 5. 样式配置

- ✅ KaTeX 数学公式样式
- ✅ Highlight.js 代码高亮
- ✅ Mermaid 图表样式
- ✅ Tailwind Typography

---

## 使用方法

### 渲染文章

```tsx
import { PostContent } from "@/components/post/post-content";
import { PostMeta } from "@/components/post/post-meta";
import { PostToc } from "@/components/post/post-toc";

export default function PostPage({ post }) {
  return (
    <div>
      <h1>{post.title}</h1>

      <PostMeta
        author={post.author}
        publishedAt={post.published_at}
        readingTime={post.reading_time}
        viewCount={post.view_count}
      />

      <div className="grid grid-cols-[1fr_250px]">
        <PostContent html={post.content_html} />
        <PostToc toc={post.toc} />
      </div>
    </div>
  );
}
```

### 从 API 获取文章

```tsx
import { getPostBySlug } from "@/shared/api";

export default async function PostPage({ params }) {
  const { data: post } = await getPostBySlug({
    path: { slug: params.slug },
  });

  return <PostContent html={post.content_html} />;
}
```

---

## 启动开发服务器

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 访问 http://localhost:3000
```

---

## 后端已处理的内容

后端 `PostProcessor` 已经处理了：

1. ✅ Frontmatter 解析
2. ✅ TOC 生成
3. ✅ LaTeX → MathML 转换
4. ✅ Mermaid 图表包装
5. ✅ 代码高亮
6. ✅ 阅读时间计算
7. ✅ 摘要生成
8. ✅ 图片压缩

**前端只需要：**

- 渲染 `content_html`
- 添加样式
- 初始化 Mermaid

---

## 下一步

1. **生成 API 客户端**

   ```bash
   pnpm run api:generate
   ```

2. **实现文章列表页**

   - `/app/posts/page.tsx`

3. **实现文章详情页**

   - `/app/posts/[slug]/page.tsx`

4. **添加路由保护**
   - `middleware.ts`

---

## 注意事项

### 环境变量

确保 `.env.local` 中配置了：

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### CORS

后端已配置允许 `http://localhost:3000`

### 图片

使用 Next.js Image 组件：

```tsx
import Image from "next/image";

<Image
  src={`${process.env.NEXT_PUBLIC_API_URL}/media/${post.cover_media.file_path}`}
  alt={post.title}
  width={800}
  height={400}
/>;
```

---

**配置完成！开始开发吧！** 🚀
