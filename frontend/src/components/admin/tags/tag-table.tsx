"use client";

import { type TagResponse } from "@/shared/api/generated";
import { type ApiData } from "@/shared/api/transformers";
import { AdminTable } from "../common/admin-table";
import { getTagColumns } from "./tag-columns";

interface TagTableProps {
  tags: ApiData<TagResponse>[];
  isLoading: boolean;
  onEdit: (tag: ApiData<TagResponse>) => void;
  onMergeRequest: () => void;
  pagination?: {
    total: number;
    page: number;
    pages: number;
  };
  onPageChange?: (page: number) => void;
}

export function TagTable({
  tags,
  isLoading,
  onEdit,
  onMergeRequest,
  pagination,
  onPageChange,
}: TagTableProps) {
  return (
    <AdminTable
      data={tags}
      isLoading={isLoading}
      columns={getTagColumns({ onEdit, onMergeRequest })}
      pagination={pagination}
      onPageChange={onPageChange}
      emptyMessage="未找到任何匹配的标签数据"
    />
  );
}
