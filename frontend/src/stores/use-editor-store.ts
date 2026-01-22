import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PostUpdate, MediaFileResponse } from "@/shared/api/generated";

// ===== 类型定义 =====
interface EditorState {
  // 存储后端模型 + 预览用的图片对象
  drafts: Record<
    string,
    PostUpdate & { cover_media?: MediaFileResponse | null }
  >;
  // 任务锚点：用于区分不同文章的草稿
  currentPostId: string | null;
}

interface EditorActions {
  // 初始化编辑器（新建或编辑现有文章时调用）
  initializeEditor: (
    postId: string,
    data: PostUpdate,
    coverPreview?: MediaFileResponse | null
  ) => void;

  // 万能修改器：用户改任何字段时都走这个
  updateField: (updates: Partial<PostUpdate>) => void;

  // 获取当前正在编辑的文章数据（便利方法）
  getCurrentData: () =>
    | (PostUpdate & { cover_media?: MediaFileResponse | null })
    | null;

  // 清除当前文章的草稿并重置状态
  reset: () => void;

  // 清除特定文章的草稿（不改变 currentPostId）
  clearDraft: (postId: string) => void;
}

// ===== Store 定义 =====
export const useEditorStore = create<EditorState & EditorActions>()(
  persist(
    (set, get) => ({
      // ===== 初始状态 =====
      drafts: {}, // ← 初始为空，不预先创建 "new" 的 draft
      currentPostId: null,

      // ===== Action 1：初始化编辑器 =====
      // 这是解决"白屏/死循环"的关键函数
      initializeEditor: (postId, data, coverPreview) => {
        const currentId = get().currentPostId;
        // 只有当 ID 变了时才更新
        // 这个 if 就是打破死循环的"防火墙"
        if (currentId !== postId) {
          set((state) => ({
            currentPostId: postId,
            drafts: {
              ...state.drafts,
              [postId]: {
                ...data,
                cover_media: coverPreview || null,
              },
            },
          }));
        }
      },

      // ===== Action 2：获取当前文章数据 =====
      // ✨ 便利方法：不需要手动从 drafts 字典里取
      getCurrentData: () => {
        const { currentPostId, drafts } = get();
        return currentPostId && drafts[currentPostId]
          ? drafts[currentPostId]
          : null;
      },

      // ===== Action 3：更新单个或多个字段 =====
      // 这是 Zustand 最清爽的用法：一个函数管全家
      // 用户改标题 → updateField({ title: "新标题" })
      // 用户改状态 → updateField({ status: "published" })
      // 用户改多个 → updateField({ title: "新", slug: "new" })
      updateField: (updates) =>
        set((state) => {
          const currentId = state.currentPostId;
          // ← 安全检查：如果没有当前文章，不做任何事
          if (!currentId || !state.drafts[currentId]) {
            return state;
          }

          return {
            drafts: {
              ...state.drafts,
              [currentId]: {
                ...state.drafts[currentId],
                ...updates,
              },
            },
          };
        }),

      // ===== Action 4：清除当前文章的草稿并重置 =====
      // 通常在保存成功后调用
      reset: () =>
        set((state) => {
          const currentId = state.currentPostId;
          const newDrafts = { ...state.drafts };

          // ← 安全检查：只有当 currentId 存在时才删除
          if (currentId) {
            delete newDrafts[currentId];
          }

          return {
            drafts: newDrafts,
            currentPostId: null,
          };
        }),

      // ===== Action 5：清除特定文章的草稿 =====
      // 不改变 currentPostId（只删除该文章的草稿）
      clearDraft: (postId) =>
        set((state) => {
          const newDrafts = { ...state.drafts };
          delete newDrafts[postId];
          return { drafts: newDrafts };
        }),
    }),
    {
      name: "blog-editor-storage", // localStorage 里的 key 名
      // 只持久化数据部分，不持久化 actions
      partialize: (state) => ({
        drafts: state.drafts,
        currentPostId: state.currentPostId,
      }),
    }
  )
);
