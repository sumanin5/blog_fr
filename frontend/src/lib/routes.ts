import { PostType } from "@/shared/api";
import { Route } from "next";

export const routes = {
  home: "/" as Route,
  about: "/about" as Route,
  postList: (postType: string) => `/posts/${postType}` as Route,
  postCategories: (postType: string) =>
    `/posts/${postType}/categories` as Route,
  postTags: (postType: string) => `/posts/${postType}/tags` as Route,
  postDetailSlug: (postType: PostType, slug: string) =>
    `/posts/${postType}/${slug}` as Route,
};
