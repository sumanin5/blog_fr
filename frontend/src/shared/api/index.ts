/**
 * 🚀 API 全局网关层 - 实用主义版
 *
 * 架构声明：
 * 1. 运行时转换：由 config.ts 中的拦截器全自动完成 (CamelCase <-> SnakeCase)。
 * 2. 类型定义：types.ts 提供全套驼峰类型 (High Fidelity Types)。
 * 3. 极简模式：直接导出原始 SDK，在 Hook 层使用类型断言。
 */

// 🔴 关键：必须导入执行 config.ts 以注册拦截器和基础配置
import "./config";

export * from "./generated";
export * from "./types";

// 解决星号导出冲突：当下划线版本与驼峰版本同名时，手动指定导出
export type {
  BatchDeleteFilesData,
  CategoryCreate,
  CategoryUpdate,
  ErrorDetail,
  FileUsage,
  GetAllFilesAdminData,
  GetUserFilesData,
  MediaType,
  PostCreate,
  PostPreviewRequest,
  PostStatus,
  PostType,
  PostUpdate,
  SyncError,
  TagUpdate,
  UpdateFileData,
  UploadFileData,
  UserRegister,
  UserRole,
  UserUpdate,
} from "./generated";

// 导出基础配置（来自生成的 client，但已被 config.ts 修改）
export { client } from "./generated/client.gen";
