import { create } from "zustand";

/**
 * 🔒 全局 Blob 注册中心 (The Global Blob Registry)
 *
 * 职责：
 * 1. 唯一性：确保同一个文件在全站永远共享同一个内存 URL。
 * 2. 引用计数：记录每一张图正被多少个组件引用。
 * 3. 智能销毁：只有当全站没有组件使用某张图时，才真正释放内存。
 */

interface RegistryEntry {
  url: string; // 真正的内存地址 (blob:http://...)
  refCount: number; // 引用计数器 (有多少组件在用它)
  blob: Blob; // 原始数据备份 (用于比对 or 重新生成)
}

interface MediaStore {
  // 核心账本：key (fileId:size) -> { url, refCount, blob }
  registry: Record<string, RegistryEntry>;

  // 动作：我需要使用这张图
  acquireUrl: (fileId: string, size: string, blob: Blob) => string;

  // 动作：我用完了这张图
  releaseUrl: (fileId: string, size: string) => void;

  // 动作：强制清空所有
  revokeAll: () => void;
}

export const useMediaStore = create<MediaStore>((set, get) => ({
  registry: {},

  acquireUrl: (fileId, size, blob) => {
    const key = `${fileId}:${size}`;
    const state = get();
    const existing = state.registry[key];

    // Case 1: 已经存在 -> 复用链接，计数+1
    if (existing) {
      // 深度优化：如果 Blob 内容也完全一样（虽可能对象不同），直接复用
      // 注意：这里简单假设 fileId 唯一对应内容。
      set((s) => ({
        registry: {
          ...s.registry,
          [key]: {
            ...existing,
            refCount: existing.refCount + 1,
          },
        },
      }));
      return existing.url;
    }

    // Case 2: 不存在 -> 创建新链接，计数=1
    const newUrl = URL.createObjectURL(blob);
    set((s) => ({
      registry: {
        ...s.registry,
        [key]: {
          url: newUrl,
          refCount: 1,
          blob,
        },
      },
    }));
    return newUrl;
  },

  releaseUrl: (fileId, size) => {
    const key = `${fileId}:${size}`;
    set((s) => {
      const entry = s.registry[key];
      if (!entry) return s;

      const newCount = entry.refCount - 1;

      // Case 1: 还有人用 -> 仅减少计数
      if (newCount > 0) {
        return {
          registry: {
            ...s.registry,
            [key]: { ...entry, refCount: newCount },
          },
        };
      }

      // Case 2: 没人用了 -> 真正销毁内存链接，并从账本删除
      URL.revokeObjectURL(entry.url);
      const newRegistry = { ...s.registry };
      delete newRegistry[key];

      // 控制台日志（调试用）
      // console.log(`[Media Registry] Revoked URL for ${fileId}`);

      return { registry: newRegistry };
    });
  },

  revokeAll: () => {
    const { registry } = get();
    Object.values(registry).forEach((entry) => {
      URL.revokeObjectURL(entry.url);
    });
    set({ registry: {} });
  },
}));
