import { PostType } from "@/shared/api/generated";

export const POST_TYPE_LABELS: Record<PostType, string> = {
  article: "文章",
  idea: "想法",
};

export const POST_TYPE_OPTIONS = [
  { value: "article" as PostType, label: "文章" },
  { value: "idea" as PostType, label: "想法" },
];
