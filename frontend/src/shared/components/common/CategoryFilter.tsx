import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Filter } from "lucide-react";

interface CategoryFilterProps<T extends string> {
    categories: readonly T[];
    activeCategory: T;
    onCategoryChange: (category: T) => void;
    itemCount: number;
    className?: string;
}

/**
 * 🏷️ 分类筛选器组件
 *
 * 通用的分类筛选组件，支持泛型类型安全
 */
export function CategoryFilter<T extends string>({
    categories,
    activeCategory,
    onCategoryChange,
    itemCount,
    className
}: CategoryFilterProps<T>) {
    return (
        <div className={`mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between ${className || ""}`}>
            <Tabs value={activeCategory} onValueChange={(value) => onCategoryChange(value as T)}>
                <TabsList>
                    {categories.map((cat) => (
                        <TabsTrigger key={cat} value={cat}>
                            {cat}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Filter className="h-4 w-4" />
                <span>共 {itemCount} 篇文章</span>
            </div>
        </div>
    );
}
