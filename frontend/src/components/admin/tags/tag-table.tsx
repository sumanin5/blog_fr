"use client";

import { AdminTable } from "../common/admin-table";
import { getTagColumns, type AdminTag } from "./tag-columns";

interface TagTableProps {
  tags: AdminTag[];
  isLoading: boolean;
  onEdit: (tag: AdminTag) => void;
  onMergeRequest: () => void;
  pageCount?: number;
  pageIndex?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
}

export function TagTable({
  tags,
  isLoading,
  onEdit,
  onMergeRequest,
  pageCount,
  pageIndex,
  totalItems,
  onPageChange,
}: TagTableProps) {
  return (
    <AdminTable
      data={tags}
      isLoading={isLoading}
      columns={getTagColumns({ onEdit, onMergeRequest })}
      pageCount={pageCount}
      pageIndex={pageIndex}
      totalItems={totalItems}
      onPageChange={onPageChange}
      emptyMessage="未找到任何匹配的标签数据"
    />
  );
}
