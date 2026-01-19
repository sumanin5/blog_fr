"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TagResponse } from "@/shared/api/generated";

interface TagSelectProps {
  availableTags: TagResponse[];
  selectedTags: string[]; // tag names
  onValueChange: (tags: string[]) => void;
  className?: string;
}

export function TagSelect({
  availableTags,
  selectedTags,
  onValueChange,
  className,
}: TagSelectProps) {
  const handleToggle = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onValueChange(selectedTags.filter((t) => t !== tagName));
    } else {
      onValueChange([...selectedTags, tagName]);
    }
  };

  const handleRemove = (e: React.MouseEvent, tagName: string) => {
    e.stopPropagation();
    onValueChange(selectedTags.filter((t) => t !== tagName));
  };

  return (
    <div className="flex flex-col gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={`w-full justify-between h-auto min-h-10 py-2 ${className}`}
          >
            <span className="truncate text-left text-xs font-normal">
              {selectedTags.length > 0
                ? `${selectedTags.length} 个标签已选择`
                : "选择标签..."}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px]" align="start">
          <DropdownMenuLabel>标签列表</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <ScrollArea className="h-[200px]">
            {availableTags.length === 0 ? (
              <div className="p-2 text-xs text-muted-foreground text-center">
                暂无可用标签
              </div>
            ) : (
              availableTags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag.id}
                  checked={selectedTags.includes(tag.name)}
                  onCheckedChange={() => handleToggle(tag.name)}
                >
                  {tag.name}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="px-1 text-[10px] h-5 flex items-center gap-1"
            >
              {tag}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={(e) => handleRemove(e, tag)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
