import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  // OpenAPI 规范文件路径
  input: "./openapi.json",

  // 生成代码的输出目录
  output: {
    path: "./src/shared/api/generated",
    format: "prettier",
  },

  // 使用 fetch 客户端
  client: "@hey-api/client-fetch",

  // 插件配置
  plugins: ["@hey-api/typescript", "@hey-api/sdk"],
});
