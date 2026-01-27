"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { CategoryResponse } from "@/shared/api/generated";
import { ApiData } from "@/shared/api/transformers";
import { Badge } from "@/components/ui/badge";
import { FolderTree, ChevronRight, Edit2, Trash2 } from "lucide-react";
import { AdminActionButton } from "@/components/admin/common/admin-action-button";

interface CategoryColumnsProps {
  onEdit: (category: ApiData<CategoryResponse>) => void;
  onDelete: (id: string) => void;
}

export const getCategoryColumns = ({
  onEdit,
  onDelete,
}: CategoryColumnsProps): ColumnDef<ApiData<CategoryResponse>>[] => [
  {
    accessorKey: "coverImage",
    header: "封面",
    cell: ({ row }) => {
      const cover = row.original.coverImage;
      return cover ? (
        <div className="relative h-10 w-16 overflow-hidden rounded-md border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="h-10 w-16 rounded-md border border-dashed flex items-center justify-center bg-muted/30">
          <span className="text-[10px] text-muted-foreground">无</span>
        </div>
      );
    },
  },
  {
    accessorKey: "name",
    header: "名称",
    cell: ({ row }) => {
      const cat = row.original;
      return (
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-primary/60" />
          <div className="flex flex-col">
            <span className="font-medium">{cat.name}</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {cat.slug}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "postCount",
    header: "文章数",
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono bg-primary/5 text-primary">
        {row.original.postCount || 0}
      </Badge>
    ),
  },
  {
    accessorKey: "sortOrder",
    header: "排序",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue("sortOrder")}</span>
    ),
  },
  {
    accessorKey: "isActive",
    header: "状态",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <Badge
          variant={isActive ? "default" : "secondary"}
          className={isActive ? "bg-emerald-500 hover:bg-emerald-600" : ""}
        >
          {isActive ? "已启用" : "停用"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-right">操作</div>,
    cell: ({ row }) => {
      const cat = row.original;
      return (
        <div className="text-right flex justify-end gap-2">
          <AdminActionButton
            variant="ghost"
            size="sm"
            onClick={() => onEdit(cat)}
            icon={Edit2}
          />
          <AdminActionButton
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(cat.id)}
            icon={Trash2}
          />
        </div>
      );
    },
  },
];
