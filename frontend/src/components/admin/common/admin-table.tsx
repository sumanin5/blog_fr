"use client";

import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
  RowData,
} from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}
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

  // 现代 TanStack 分页
  pageCount?: number; // 总页数
  pageIndex?: number; // 当前页码 (0-indexed)
  pageSize?: number;
  totalItems?: number; // 总数据量
  onPageChange?: (pageIndex: number) => void;

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
  pageCount = -1,
  pageIndex = 0,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  selectedRows,
  onSelectionChange,
  getRowId = (row: TData) => (row as any).id,
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
    pageCount, // 服务器端总页数
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    state: {
      rowSelection,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (!onPageChange) return;
      const nextState =
        typeof updater === "function"
          ? updater({ pageIndex, pageSize })
          : updater;
      onPageChange(nextState.pageIndex);
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
                    <TableHead
                      key={header.id}
                      className={header.column.columnDef.meta?.className}
                    >
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
                  <TableCell
                    key={cell.id}
                    className={cell.column.columnDef.meta?.className}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 只要有 pageCount (>=0) 就渲染分页器 */}
      {pageCount !== -1 && onPageChange && (
        <AdminPagination
          page={pageIndex + 1}
          pages={pageCount}
          total={totalItems}
          onPageChange={(p) => onPageChange(p - 1)}
        />
      )}
    </div>
  );
}
