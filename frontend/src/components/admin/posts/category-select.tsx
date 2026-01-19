"use client";

import React from "react";
import { PostType, CategoryResponse } from "@/shared/api/generated";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface CategorySelectProps {
  postType: PostType;
  value?: string;
  onValueChange: (value: string) => void;
  categories: CategoryResponse[];
  isLoading?: boolean;
  className?: string;
}

export function CategorySelect({
  postType,
  value,
  onValueChange,
  categories,
  isLoading = false,
  className,
}: CategorySelectProps) {
  // 确保如果当前值不在列表中，且不是 "none"，则显示占位或处理
  // 这里简化处理，直接透传

  return (
    <Select value={value || "none"} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={isLoading ? "加载中..." : "选择分类"} />
      </SelectTrigger>
      <SelectContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SelectItem value="none">暂无分类</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </>
        )}
      </SelectContent>
    </Select>
  );
}
