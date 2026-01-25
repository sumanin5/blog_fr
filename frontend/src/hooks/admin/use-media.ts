/**
 * Media Module Official SDK
 *
 * 职责：作为媒体模块的唯一对外门户 (Facade)，整合查询、变更与工具函数。
 * 外部组件应统一从本文件引入逻辑，不建议直接深入 ./media/ 目录。
 */

// 1. 导出所有的读取钩子 (Queries)
export {
  useMediaFiles, // 获取用户文件列表
  useAllMediaAdmin, // 管理员获取全站文件
  useMediaStats, // 获取统计概览
  useMediaFile, // 获取单个文件详情
  useMediaBlob, // 获取受保护的二进制流 (标准资源加载方式)
} from "./media/queries";

// 2. 导出所有的操作钩子 (Mutations)
export {
  useUploadFile, // 上传
  useUpdateFile, // 更新元数据
  useDeleteFile, // 物理删除
  useBatchDeleteFiles, // 批量删除
  useRegenerateThumbnails, // 强制重绘缩略图
} from "./media/mutations";

// 3. 导出所有的工具函数 (Utils)
export {
  getAssetIdentity, // 获取可读的资产标识 (文件名+大小)
} from "./media/utils";

// 5. 导出缓存键 (用于手动失效缓存等高级场景)
export { mediaKeys } from "./media/constants";
