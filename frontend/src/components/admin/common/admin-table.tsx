"use client";

import React, { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPagination } from "@/components/admin/layout/admin-pagination";

interface AdminTableProps<TData, TValue> {
  data: TData[]; // 核心数据
  columns: ColumnDef<TData, TValue>[]; // 列定义
  isLoading?: boolean;
  emptyMessage?: string;

  // 分页相关
  pagination?: {
    page: number;
    pages: number;
    total: number;
  };
  onPageChange?: (page: number) => void;

  // 选择相关
  selectedRows?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  getRowId?: (row: TData) => string; // 默认使用 id 字段
}

export function AdminTable<TData, TValue>({
  data,
  columns,
  isLoading,
  emptyMessage = "未找到匹配的数据条目",
  pagination,
  onPageChange,
  selectedRows,
  onSelectionChange,
  getRowId = (row: any) => row.id,
}: AdminTableProps<TData, TValue>) {
  // 转换 Set<string> -> RowSelectionState
  const rowSelection = React.useMemo(() => {
    if (!selectedRows) return {};
    const selection: RowSelectionState = {};
    selectedRows.forEach((id) => {
      selection[id] = true;
    });
    return selection;
  }, [selectedRows]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    state: {
      rowSelection,
    },
    onRowSelectionChange: (updaterOrValue) => {
      if (!onSelectionChange) return;

      const nextSelection =
        typeof updaterOrValue === "function"
          ? updaterOrValue(rowSelection)
          : updaterOrValue;

      const nextSet = new Set(Object.keys(nextSelection));
      onSelectionChange(nextSet);
    },
    enableRowSelection: true,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center italic text-muted-foreground animate-pulse shadow-sm">
        系统正在努力加载数据，请稍候...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground shadow-sm">
        <p className="italic">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-muted/30 hover:bg-muted/30 border-b"
              >
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 自动集成：只要有分页信息就渲染分页器 */}
      {pagination && onPageChange && (
        <AdminPagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
