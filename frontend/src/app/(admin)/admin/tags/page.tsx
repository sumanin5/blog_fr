"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listTags,
  updateTag,
  mergeTags,
  deleteOrphanedTags,
  type TagResponse,
} from "@/shared/api/generated";

// Extend TagResponse to include optional properties that might be returned by backend
// but not yet in OpenAPI schema (e.g. annotated counts)
interface ExtendedTagResponse extends TagResponse {
  post_count?: number;
}
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Tags,
  Trash2,
  Edit2,
  ShieldAlert,
  Merge,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";

// -----------------------------------------------------------------------------
// Tag Merge Dialog Component
// -----------------------------------------------------------------------------

function TagMergeDialog({
  open,
  onOpenChange,
  tags,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: TagResponse[];
  onSuccess: () => void;
}) {
  const [sourceId, setSourceId] = React.useState("");
  const [targetId, setTargetId] = React.useState("");

  const mergeMutation = useMutation({
    mutationFn: () =>
      mergeTags({
        body: { source_tag_id: sourceId, target_tag_id: targetId },
        throwOnError: true,
      }),
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
      setSourceId("");
      setTargetId("");
      toast.success("标签合并成功");
    },
    onError: (err) =>
      toast.error(
        "合并失败：" + (err instanceof Error ? err.message : "未知错误")
      ),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>合并标签</DialogTitle>
          <DialogDescription>
            将“源标签”合并到“目标标签”。
            <br />
            <span className="text-destructive font-bold">
              源标签将被永久删除
            </span>
            ，其关联的所有文章将自动转移到目标标签。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>源标签 (Source)</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            >
              <option value="">选择要删除的标签...</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === targetId}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center text-muted-foreground/50">
            ⬇ 合并到
          </div>

          <div className="space-y-2">
            <Label>目标标签 (Target)</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              <option value="">选择保留的标签...</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === sourceId}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={() => mergeMutation.mutate()}
            disabled={
              mergeMutation.isPending ||
              !sourceId ||
              !targetId ||
              sourceId === targetId
            }
          >
            {mergeMutation.isPending ? "合并中..." : "确认合并"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Main Config Page
// -----------------------------------------------------------------------------

export default function TagsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");

  // Dialog states
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingTag, setEditingTag] = React.useState<TagResponse | null>(null);
  const [isMergeOpen, setIsMergeOpen] = React.useState(false);
  const [isCleanupOpen, setIsCleanupOpen] = React.useState(false);

  // Edit Form
  const [editForm, setEditForm] = React.useState({
    name: "",
    slug: "",
    color: "",
  });

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "tags"],
    queryFn: async () => {
      // Fetch all tags (page 1, large size)
      // Warning: Backend limit is likely 50 or 100 via fastapi-pagination default Params
      return listTags({
        query: { page: 1, size: 50 },
        throwOnError: true,
      });
    },
    // Only fetch if user is admin
    enabled:
      !!user?.role && (user.role === "admin" || user.role === "superadmin"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      id: string;
      name: string;
      slug: string;
      color?: string;
    }) =>
      updateTag({
        path: { tag_id: data.id },
        body: { name: data.name, slug: data.slug, color: data.color },
        throwOnError: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tags"] });
      toast.success("标签更新成功");
      setIsEditOpen(false);
    },
    onError: (err) =>
      toast.error(
        "更新失败：" + (err instanceof Error ? err.message : "未知错误")
      ),
  });

  const cleanupMutation = useMutation({
    mutationFn: () => deleteOrphanedTags({ throwOnError: true }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tags"] });
      // @ts-expect-error - access custom response message safely
      const msg = data.data?.message || "清理完成";
      toast.success(msg);
      setIsCleanupOpen(false);
    },
    onError: (err) =>
      toast.error(
        "清理失败：" + (err instanceof Error ? err.message : "未知错误")
      ),
  });

  if (user?.role !== "superadmin") {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive opacity-50" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">权限不足</h2>
          <p className="text-muted-foreground">仅超级管理员可管理标签。</p>
        </div>
      </div>
    );
  }

  const tags = data?.data?.items || [];
  const filteredTags = tags.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (tag: TagResponse) => {
    setEditingTag(tag);
    setEditForm({
      name: tag.name,
      slug: tag.slug,
      color: tag.color || "#6c757d",
    });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">标签治理</h1>
          <p className="text-muted-foreground">
            管理全站标签、合并同义词及清理孤立数据。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            刷新
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsCleanupOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> 清理孤立标签
          </Button>
          <Button size="sm" onClick={() => setIsMergeOpen(true)}>
            <Merge className="mr-2 h-4 w-4" /> 合并标签
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg border">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索标签名称..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs bg-background"
        />
        <div className="text-sm text-muted-foreground ml-auto">
          共 {tags.length} 个标签
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>名称</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>颜色</TableHead>
              <TableHead>关联文章数</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  正在加载标签数据...
                </TableCell>
              </TableRow>
            ) : filteredTags.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  未找到匹配的标签
                </TableCell>
              </TableRow>
            ) : (
              filteredTags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tags className="size-4 text-primary/40" />
                      <span className="font-medium">{tag.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {tag.slug}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="size-3 rounded-full border shadow-sm"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {tag.color}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {(tag as ExtendedTagResponse).post_count ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">打开菜单</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(tag)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            // 这里可以复用合并逻辑，或者单独做删除
                            toast.info("请使用合并功能来移除此标签");
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑标签</DialogTitle>
            <DialogDescription>修改标签的基本信息。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>标签名称</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={editForm.slug}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, slug: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>颜色 (Hex)</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    className="w-12 p-1 cursor-pointer"
                    value={editForm.color}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        color: e.target.value,
                      }))
                    }
                  />
                  <Input
                    value={editForm.color}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        color: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              取消
            </Button>
            <Button
              onClick={() =>
                editingTag &&
                updateMutation.mutate({ id: editingTag.id, ...editForm })
              }
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "保存中..." : "保存更改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog (Extracted Component) */}
      <TagMergeDialog
        open={isMergeOpen}
        onOpenChange={setIsMergeOpen}
        tags={tags}
        onSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["admin", "tags"] })
        }
      />

      {/* Cleanup Alert */}
      <AlertDialog open={isCleanupOpen} onOpenChange={setIsCleanupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清理孤立标签？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将扫描整个数据库，并<strong>永久删除</strong>
              所有未被任何文章引用的空标签。
              <br />
              这通常用于清理自动导入产生的垃圾数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cleanupMutation.mutate()}
              className="bg-destructive hover:bg-destructive/90"
              disabled={cleanupMutation.isPending}
            >
              {cleanupMutation.isPending ? "清理中..." : "确认清理"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
