import { ListCard, type ListCardItem } from "@/shared/components/common/ListCard";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui-extended";
import { FileText } from "lucide-react";

interface PostGridProps {
    posts: ListCardItem[];
    onPostClick: (post: ListCardItem) => void;
    emptyState?: {
        icon?: React.ComponentType<{ className?: string }>;
        message: string;
        action?: {
            label: string;
            onClick: () => void;
        };
    };
    className?: string;
}

/**
 * 📝 文章网格组件
 *
 * 博客专用的文章列表展示组件，支持空状态自定义
 */
export function PostGrid({ posts, onPostClick, emptyState, className }: PostGridProps) {
    if (posts.length === 0 && emptyState) {
        const EmptyIcon = emptyState.icon || FileText;

        return (
            <Card className={`border-dashed ${className || ""}`}>
                <CardContent className="flex h-64 flex-col items-center justify-center text-center">
                    <EmptyIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">{emptyState.message}</p>
                    {emptyState.action && (
                        <Button variant="ghost" onClick={emptyState.action.onClick}>
                            {emptyState.action.label}
                        </Button>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${className || ""}`}>
            {posts.map((post, index) => (
                <ListCard
                    key={post.id}
                    item={post}
                    index={index}
                    onClick={() => onPostClick(post)}
                />
            ))}
        </div>
    );
}
