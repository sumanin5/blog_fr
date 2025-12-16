/**
 * MDX 类型声明
 *
 * 让 TypeScript 识别 .mdx 文件的导入
 */

declare module "*.mdx" {
  import type { ComponentType } from "react";

  // MDX 文件导出的默认组件
  const MDXComponent: ComponentType;
  export default MDXComponent;

  // MDX 文件可以导出的元数据（frontmatter）
  export const frontmatter: Record<string, unknown>;
}
