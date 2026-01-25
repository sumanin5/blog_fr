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
    accessorKey: "name",
    header: "名称",
    cell: ({ row }) => {
      const cat = row.original;
      return (
        <div className="flex items-center gap-2">
          {cat.parentId && (
            <ChevronRight className="h-3 w-3 text-muted-foreground/50 ml-2" />
          )}
          <FolderTree className="h-4 w-4 text-primary/60" />
          <span className="font-medium">{cat.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue("slug")}</span>
    ),
  },
  {
    accessorKey: "sortOrder",
    header: "排序",
  },
  {
    accessorKey: "isActive",
    header: "状态",
    cell: ({ row }) => {
      const isActive = row.getValue("isActive") as boolean;
      return (
        <Badge variant={isActive ? "default" : "secondary"}>
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
