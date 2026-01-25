"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { MediaFile } from "@/shared/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Download,
  RefreshCw,
} from "lucide-react";
import { MediaImage } from "../ui/media-image";
import { toast } from "sonner";
import { downloadFile } from "@/shared/api";

interface MediaColumnsProps {
  onPreview: (file: MediaFile) => void;
  onRename: (file: MediaFile) => void;
  onDelete: (file: MediaFile) => void;
  onRegenerate?: (id: string) => Promise<void>;
}

export const getMediaColumns = ({
  onPreview,
  onRename,
  onDelete,
  onRegenerate,
}: MediaColumnsProps): ColumnDef<MediaFile>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "originalFilename",
    header: "资源信息",
    cell: ({ row }) => {
      const file = row.original;
      return (
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center border shadow-inner shrink-0">
            <MediaImage
              file={file}
              size="small"
              className="size-full object-cover"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-foreground/80 italic tracking-tight truncate max-w-[200px]">
              {file.originalFilename}
            </span>
            <span className="text-[8px] font-mono text-muted-foreground/40 lowercase -mt-0.5">
              {file.id.substring(0, 8)}...
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "mediaType",
    header: "类型",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="text-[9px] font-mono uppercase bg-muted/50 rounded-md py-0 px-2"
      >
        {row.original.mediaType}
      </Badge>
    ),
  },
  {
    accessorKey: "fileSize",
    header: () => <div className="text-right">大小</div>,
    cell: ({ row }) => {
      const size = row.original.fileSize;
      return (
        <div className="text-right text-[10px] font-mono tabular-nums text-muted-foreground">
          {(size / 1024).toFixed(1)} KB
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const file = row.original;
      const handleDownload = async () => {
        try {
          const response = await downloadFile({
            path: { file_id: file.id },
            parseAs: "blob",
            throwOnError: true,
          });

          if (response.data) {
            const url = window.URL.createObjectURL(response.data as Blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = file.originalFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }
        } catch {
          toast.error("下载失败");
        }
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuItem onClick={() => onPreview(file)}>
              <Eye className="size-4 mr-2" /> 快速预览
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(file)}>
              <Edit2 className="size-4 mr-2" /> 重命名
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="size-4 mr-2" /> 下载资源
            </DropdownMenuItem>
            {onRegenerate && file.mediaType === "image" && (
              <DropdownMenuItem onClick={() => onRegenerate(file.id)}>
                <RefreshCw className="size-4 mr-2" /> 重绘缩略图
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(file)}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="size-4 mr-2" /> 彻底删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
