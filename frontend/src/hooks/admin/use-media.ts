/**
 * 📦 Media Hook 聚合导出
 * 统一管理媒体中心的所有 Query 和 Mutation
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
  useUpdateFile, // 更新信息 (重命名/描述等)
  useDeleteFile, // 删除
  useBatchDeleteFiles, // 批量删除
  // useTogglePublicity, // 切换公开状态
  useRegenerateThumbnails, // 重新生成缩略图
} from "./media/mutations";
