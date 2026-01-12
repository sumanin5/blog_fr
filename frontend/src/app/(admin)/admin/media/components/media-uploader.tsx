"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useUploadFile } from "@/hooks/use-media";
// import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UploadTask {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

export function MediaUploader() {
  const [open, setOpen] = useState(false);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const uploadMutation = useUploadFile();

  // 使用 react-dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
      "video/*": [".mp4", ".webm", ".avi", ".mov"],
      "application/pdf": [".pdf"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: async (acceptedFiles) => {
      // 初始化上传任务
      const tasks: UploadTask[] = acceptedFiles.map((file) => ({
        file,
        status: "pending",
        progress: 0,
      }));
      setUploadTasks(tasks);

      // 逐个上传
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        setUploadTasks((prev) =>
          prev.map((t, idx) =>
            idx === i ? { ...t, status: "uploading", progress: 50 } : t
          )
        );

        try {
          await uploadMutation.mutateAsync({
            file: task.file,
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

      // 3秒后自动关闭
      setTimeout(() => {
        const allSuccess = tasks.every((t) => t.status === "success");
        if (allSuccess) {
          setOpen(false);
          setUploadTasks([]);
        }
      }, 3000);
    },
  });

  const getStatusIcon = (status: UploadTask["status"]) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        上传文件
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>上传文件</DialogTitle>
            <DialogDescription>
              拖拽文件到下方区域，或点击选择文件（最大 10MB）
            </DialogDescription>
          </DialogHeader>

          {uploadTasks.length === 0 ? (
            // 拖拽上传区域
            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload
                className={`h-12 w-12 mx-auto mb-4 ${
                  isDragActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <p className="text-sm font-medium mb-1">
                {isDragActive ? "释放以上传文件" : "拖拽文件到此处"}
              </p>
              <p className="text-xs text-muted-foreground">
                或点击选择文件（支持批量上传）
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                支持: 图片、视频、PDF 文档
              </p>
            </div>
          ) : (
            // 上传进度列表
            <ScrollArea className="h-96 pr-4">
              <div className="space-y-3">
                {uploadTasks.map((task, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    {getStatusIcon(task.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {task.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(task.file.size / 1024).toFixed(1)} KB
                      </p>
                      {task.status === "uploading" && (
                        <Progress value={task.progress} className="h-1 mt-1" />
                      )}
                      {task.error && (
                        <p className="text-xs text-red-500 mt-1">
                          {task.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {uploadTasks.length > 0 && (
            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {uploadTasks.filter((t) => t.status === "success").length} /{" "}
                {uploadTasks.length} 完成
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setUploadTasks([]);
                }}
              >
                关闭
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
