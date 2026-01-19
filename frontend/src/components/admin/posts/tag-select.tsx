"use client";

import * as React from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TagResponse } from "@/shared/api/generated";

interface TagSelectProps {
  selectedTags: string[]; // tag names
  onValueChange: (tags: string[]) => void;
  className?: string;
}

export function TagSelect({
  selectedTags,
  onValueChange,
  className,
}: TagSelectProps) {
  const [inputValue, setInputValue] = React.useState("");

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      onValueChange([...selectedTags, trimmedTag]);
    }
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (
      e.key === "Backspace" &&
      !inputValue &&
      selectedTags.length > 0
    ) {
      onValueChange(selectedTags.slice(0, -1));
    }
  };

  const handleRemove = (tagName: string) => {
    onValueChange(selectedTags.filter((t) => t !== tagName));
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="relative">
        <Input
          placeholder="输入标签并回车添加..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(inputValue)}
          className="pr-10"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Plus className="h-4 w-4" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
        {selectedTags.length > 0 ? (
          selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="px-2 py-0.5 text-xs flex items-center gap-1 transition-all hover:bg-secondary/80"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemove(tag)}
                className="hover:text-destructive transition-colors rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground py-1">暂无标签</span>
        )}
      </div>
    </div>
  );
}
