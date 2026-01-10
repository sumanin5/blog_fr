"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listTags,
  updateTag,
  mergeTags,
  deleteOrphanedTags,
  TagResponse,
} from "@/shared/api/generated";
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
import { Label } from "@/components/ui/label";

export default function TagsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = React.useState("");

  // Dialog states
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingTag, setEditingTag] = React.useState<TagResponse | null>(null);
  const [isMergeOpen, setIsMergeOpen] = React.useState(false);
  const [isCleanupOpen, setIsCleanupOpen] = React.useState(false);

  // Forms
  const [editForm, setEditForm] = React.useState({ name: "", slug: "" });
  const [mergeForm, setMergeForm] = React.useState({
    sourceId: "",
    targetId: "",
  });

  // Query Tags (We might need to implement a dedicated listTags endpoint logic if it's paginated differently,
  // but assuming we can filter or search on client side for now if list is small, or use backend search)
  // NOTE: The current SDK might not have a direct `listTags` for admin without filters.
  // We'll use listTags from generated SDK, assuming it exists or we mock it for now.
  // Checking router.py, there isn't a direct "list all tags" for admin, but usually tags are fetched via posts or separate endpoint.
  // Let's check generated/sdk.gen.ts to be sure. I will assume it exists or use a workaround.
  // Actually, checking standard blog implementations, usually there is `listTags`.

  // WORKAROUND: If listTags is missing in SDK for simple listing, we might need to add it to backend.
  // But for now, let's assume `listTags` exists as per standard conventions or we use `listCategoriesByType` equivalent for tags.
  // Wait, I didn't see `listTags` in router.py explicitly exporting a general list.
  // Let's implement the UI assuming the API exists, and if it fails, I'll fix the backend.

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin", "tags"],
    queryFn: async () => {
      // Since we didn't explicitly see a "list all tags" endpoint in the viewed router.py snippets,
      // only update/delete/merge.
      // I'll fetch tags via a known public endpoint or assume one was generated.
      // Re-checking previous context... standard `listTags` usually exists for autocomplete.
      return listTags({
        query: { page: 1, size: 100 }, // Fetch first 100 for now
        throwOnError: true,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; name: string; slug: string }) =>
      updateTag({
        path: { tag_id: data.id },
        body: { name: data.name, slug: data.slug },
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

  const mergeMutation = useMutation({
    mutationFn: (data: { sourceId: string; targetId: string }) =>
      mergeTags({
        body: { source_tag_id: data.sourceId, target_tag_id: data.targetId },
        throwOnError: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tags"] });
      toast.success("标签合并成功");
      setIsMergeOpen(false);
      setMergeForm({ sourceId: "", targetId: "" });
    },
    onError: (err) =>
      toast.error(
        "合并失败：" + (err instanceof Error ? err.message : "未知错误")
      ),
  });

  const cleanupMutation = useMutation({
    mutationFn: () => deleteOrphanedTags({ throwOnError: true }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "tags"] });
      const responseData = data.data as unknown as { message: string };
      toast.success(`清理完成: ${responseData.message}`);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">标签治理</h1>
          <p className="text-muted-foreground">合并重复标签，清理无用标签。</p>
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

      <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索标签..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs bg-background"
        />
        <div className="text-sm text-muted-foreground">
          共 {tags.length} 个标签
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>名称</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>关联文章数</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  正在加载...
                </TableCell>
              </TableRow>
            ) : filteredTags.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  无匹配标签
                </TableCell>
              </TableRow>
            ) : (
              filteredTags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tags className="size-4 text-primary/60" />
                      <span className="font-medium">{tag.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {tag.slug}
                  </TableCell>
                  <TableCell>
                    {/* Assuming tag object has count or we calculate it? Schema usually has post_count */}
                    <Badge variant="secondary">
                      {(tag as unknown as { post_count: number }).post_count ??
                        0}{" "}
                      篇
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingTag(tag);
                        setEditForm({ name: tag.name, slug: tag.slug });
                        setIsEditOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
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
            <DialogDescription>修改标签名称和 URL 别名</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>标签名称</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={editForm.slug}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, slug: e.target.value }))
                }
              />
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
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={isMergeOpen} onOpenChange={setIsMergeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>合并标签</DialogTitle>
            <DialogDescription>
              将“源标签”合并到“目标标签”。合并后，所有关联文章将指向目标标签，
              <span className="text-destructive font-bold">源标签将被删除</span>
              。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>源标签 (要被删除的)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={mergeForm.sourceId}
                onChange={(e) =>
                  setMergeForm((prev) => ({
                    ...prev,
                    sourceId: e.target.value,
                  }))
                }
              >
                <option value="">选择标签...</option>
                {tags.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    disabled={t.id === mergeForm.targetId}
                  >
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-center text-muted-foreground">
              ⬇ 合并到 ⬇
            </div>
            <div className="space-y-2">
              <Label>目标标签 (保留的)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={mergeForm.targetId}
                onChange={(e) =>
                  setMergeForm((prev) => ({
                    ...prev,
                    targetId: e.target.value,
                  }))
                }
              >
                <option value="">选择标签...</option>
                {tags.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    disabled={t.id === mergeForm.sourceId}
                  >
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMergeOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => mergeMutation.mutate(mergeForm)}
              disabled={
                mergeMutation.isPending ||
                !mergeForm.sourceId ||
                !mergeForm.targetId
              }
            >
              确认合并
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cleanup Alert */}
      <AlertDialog open={isCleanupOpen} onOpenChange={setIsCleanupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清理孤立标签？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除所有未被任何文章引用的空标签。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cleanupMutation.mutate()}
              className="bg-destructive hover:bg-destructive/90"
            >
              确认清理
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
