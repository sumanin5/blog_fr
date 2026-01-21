import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  PostMetadata,
  POST_STATUS_VALUES,
} from "@/components/admin/posts/post-metadata-sidebar";
import { PostStatus } from "@/shared/api/generated";

interface EditorState {
  title: string;
  contentMdx: string;
  metadata: PostMetadata;
  // 记录当前编辑的文章 ID，用于区分不同文章的草稿
  currentPostId: string | null;
}

interface EditorActions {
  initializeEditor: (postId: string, initialData: Partial<EditorState>) => void;
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
  setMetadata: (metadata: PostMetadata) => void;
  updateMetadata: (updates: Partial<PostMetadata>) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState & EditorActions>()(
  persist(
    (set, get) => ({
      currentPostId: null,
      title: "",
      contentMdx: "",
      metadata: {
        slug: "",
        status: POST_STATUS_VALUES.DRAFT,
        categoryId: "none",
        tags: [],
        cover: null,
        excerpt: "",
        isFeatured: false,
        enableJsx: false,
        useServerRendering: false,
      },

      initializeEditor: (postId, initialData) => {
        const state = get();
        // 如果 ID 匹配且已有数据，说明是意外退出后的恢复，保留草稿
        // 这里可以加一个逻辑：如果 store 里的 updatedAt 比 initialData 旧，则覆盖（暂时不搞这么复杂，以本地优先，但需要用户感知）
        // 目前策略：如果 ID 变了，彻底重置；如果 ID 没变，保留当前 store 的状态（即草稿）
        if (state.currentPostId !== postId) {
          set({
            currentPostId: postId,
            title: initialData.title ?? "",
            contentMdx: initialData.contentMdx ?? "",
            metadata: initialData.metadata ?? state.metadata,
          });
        }
      },

      setTitle: (title) => set({ title }),
      setContent: (contentMdx) => set({ contentMdx }),
      setMetadata: (metadata) => set({ metadata }),
      updateMetadata: (updates) =>
        set((state) => ({
          metadata: { ...state.metadata, ...updates },
        })),

      reset: () =>
        set({
          currentPostId: null,
          title: "",
          contentMdx: "",
          metadata: {
            slug: "",
            status: POST_STATUS_VALUES.DRAFT,
            categoryId: "none",
            tags: [],
            cover: null,
            excerpt: "",
            isFeatured: false,
            enableJsx: false,
            useServerRendering: false,
          },
        }),
    }),
    {
      name: "blog-editor-storage", // localStorage key
      // 只持久化数据字段，不持久化 actions
      partialize: (state) => ({
        title: state.title,
        contentMdx: state.contentMdx,
        metadata: state.metadata,
        currentPostId: state.currentPostId,
      }),
    }
  )
);
