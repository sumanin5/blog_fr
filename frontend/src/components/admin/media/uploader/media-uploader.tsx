"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { useUploadFile } from "@/hooks/admin/use-media";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminActionButton } from "@/components/admin/common/admin-action-button";
import { Button } from "@/components/ui/button";

interface UploadTask {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

/**
 * 媒体库上传器
 * 已接入 AdminActionButton 统一触发器
 */
export function MediaUploader() {
  const [open, setOpen] = useState(false);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const uploadMutation = useUploadFile();

  const isUploadingAny = uploadTasks.some((t) => t.status === "uploading");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
      "video/*": [".mp4", ".webm", ".avi", ".mov"],
      "application/pdf": [".pdf"],
    },
    maxSize: 10 * 1024 * 1024,
    onDrop: async (acceptedFiles) => {
      const tasks: UploadTask[] = acceptedFiles.map((file) => ({
        file,
        status: "pending",
        progress: 0,
      }));
      setUploadTasks(tasks);

      for (let i = 0; i < tasks.length; i++) {
        setUploadTasks((prev) =>
          prev.map((t, idx) =>
            idx === i ? { ...t, status: "uploading", progress: 50 } : t
          )
        );

        try {
          await uploadMutation.mutateAsync({
            file: tasks[i].file,
            usage: "general",
            isPublic: false,
          });

          setUploadTasks((prev) =>
            prev.map((t, idx) =>
              idx === i ? { ...t, status: "success", progress: 100 } : t
            )
          );
        } catch (error) {
          setUploadTasks((prev) =>
            prev.map((t, idx) =>
              idx === i
                ? {
                    ...t,
                    status: "error",
                    error: error instanceof Error ? error.message : "上传失败",
                  }
                : t
            )
          );
        }
      }

      // 全部成功则自动关闭
      setTimeout(() => {
        const allCompleted = tasks.every(
          (t) => t.status === "success" || t.status === "error"
        );
        const anyError = tasks.some((t) => t.status === "error");
        if (allCompleted && !anyError) {
          setOpen(false);
          setUploadTasks([]);
        }
      }, 2000);
    },
  });

  return (
    <>
      <AdminActionButton
        onClick={() => setOpen(true)}
        icon={Upload}
        className="h-9 px-4 shadow-lg shadow-primary/10"
      >
        上传媒体
      </AdminActionButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary/5 p-6 border-b border-primary/10">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold italic tracking-tight uppercase flex items-center gap-2">
                <Upload className="size-5 text-primary" />
                Media Intake
              </DialogTitle>
              <DialogDescription className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                Bulk Assets Upload / Max 10MB per file
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6">
            {uploadTasks.length === 0 ? (
              <div
                {...getRootProps()}
                className={`group relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? "border-primary bg-primary/10 scale-[0.99]"
                    : "border-muted-foreground/15 hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                <input {...getInputProps()} />
                <div
                  className={`mx-auto mb-6 size-16 rounded-full flex items-center justify-center transition-colors ${
                    isDragActive
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                  }`}
                >
                  <Upload className="size-8" />
                </div>
                <p className="text-base font-bold italic mb-1 uppercase tracking-tight">
                  {isDragActive ? "Infiltrate Files Now" : "Deploy Your Assets"}
                </p>
                <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest">
                  Drag & Drop or Click to Browse
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] -mx-1 pr-4">
                <div className="space-y-3">
                  {uploadTasks.map((task, index) => (
                    <div
                      key={index}
                      className="group flex items-center gap-4 p-4 rounded-xl border bg-card/50 transition-all hover:shadow-sm"
                    >
                      <div className="flex flex-col items-center gap-1">
                        {task.status === "uploading" && (
                          <div className="size-4 animate-spin border-2 border-primary border-t-transparent rounded-full" />
                        )}
                        {task.status === "success" && (
                          <CheckCircle2 className="size-5 text-emerald-500" />
                        )}
                        {task.status === "error" && (
                          <AlertCircle className="size-5 text-destructive" />
                        )}
                        {task.status === "pending" && (
                          <div className="size-2 bg-muted rounded-full" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="text-sm font-bold truncate text-foreground/80 lowercase italic font-mono">
                            {task.file.name}
                          </p>
                          <span className="text-[10px] font-bold text-muted-foreground/40 tabular-nums">
                            {(task.file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        {task.status === "uploading" && (
                          <Progress
                            value={task.progress}
                            className="h-1 bg-muted shrink-0"
                          />
                        )}
                        {task.error && (
                          <p className="text-[10px] text-destructive font-bold uppercase tracking-tight mt-1">
                            Error: {task.error}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {uploadTasks.length > 0 && (
            <div className="p-4 bg-muted/30 border-t flex justify-between items-center px-6">
              <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">
                Mission Progress:{" "}
                {uploadTasks.filter((t) => t.status === "success").length} of{" "}
                {uploadTasks.length}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full font-bold uppercase text-[10px] tracking-widest px-4"
                disabled={isUploadingAny}
                onClick={() => {
                  setOpen(false);
                  setUploadTasks([]);
                }}
              >
                Close Portal
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
