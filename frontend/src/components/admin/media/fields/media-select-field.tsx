import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Loader2, Pencil, FolderOpen } from "lucide-react";
import { AdminActionButton } from "@/components/admin/common/admin-action-button";
import { cn } from "@/lib/utils";
import { useUploadFile } from "@/hooks/admin/use-media";
import { MediaImage } from "../ui/media-image";
import { toast } from "sonner";
import type { MediaFile, MediaFilters } from "@/shared/api/types";
import { MediaLibraryDialog } from "../dialogs/media-library-dialog";
import { cva, type VariantProps } from "class-variance-authority";

const containerVariants = cva(
  "relative group overflow-hidden transition-all duration-300 border-2 border-dashed rounded-xl bg-muted/5",
  {
    variants: {
      isHovering: {
        true: "border-primary bg-primary/5",
        false: "",
      },
      hasValue: {
        true: "border-transparent bg-black/5 shadow-sm",
        false: "",
      },
      variant: {
        cover: "w-full aspect-video",
        icon: "size-24 rounded-2xl",
        basic: "size-40",
      },
    },
    defaultVariants: {
      variant: "cover",
      isHovering: false,
      hasValue: false,
    },
  },
);

interface MediaSelectFieldProps {
  value?: MediaFile | null;
  onChange: (file: MediaFile | null) => void;
  label?: string;
  variant?: "cover" | "icon" | "basic";
  accept?: string;
  libraryFilter?: MediaFilters;
  className?: string;
}

export function MediaSelectField({
  value,
  onChange,
  label,
  variant = "cover",
  accept = "image/*",
  libraryFilter,
  className,
}: MediaSelectFieldProps) {
  const [showLibrary, setShowLibrary] = useState(false);
  const { mutateAsync: uploadFile, isPending } = useUploadFile();

  const handleUpload = useCallback(
    async (file: File) => {
      if (accept.includes("svg") && !file.type.includes("svg")) {
        return toast.error("Only SVG files allowed");
      }
      try {
        const res = await uploadFile({
          file,
          usage: variant === "cover" ? "cover" : "icon",
          isPublic: true,
        });
        const uploaded = (res as any).file || res;
        onChange(uploaded);
        toast.success("Uploaded successfully");
      } catch {}
    },
    [accept, onChange, uploadFile, variant],
  );

  // Implement react-dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) handleUpload(file);
    },
    noClick: true, // We handle interactions via the library dialog
    accept: accept ? { [accept]: [] } : undefined, // basic support
  });

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
          {label}
        </p>
      )}

      <div
        {...getRootProps()}
        className={cn(
          containerVariants({
            variant,
            isHovering: isDragActive,
            hasValue: !!value,
          }),
          className,
        )}
      >
        <input {...getInputProps()} />

        {isPending && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}

        {value ? (
          <PreviewState
            file={value}
            variant={variant}
            onRemove={() => onChange(null)}
            onReplace={() => setShowLibrary(true)}
          />
        ) : (
          <EmptyState
            variant={variant}
            onLibrary={() => setShowLibrary(true)}
          />
        )}
      </div>

      <MediaLibraryDialog
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={(file) => {
          onChange(file);
          setShowLibrary(false);
        }}
        // @ts-expect-error - Manual type extension
        filter={libraryFilter}
      />
    </div>
  );
}

// --- Sub Components ---

interface PreviewStateProps {
  file: MediaFile;
  variant: "cover" | "icon" | "basic";
  onRemove: () => void;
  onReplace: () => void;
}

function PreviewState({
  file,
  variant,
  onRemove,
  onReplace,
}: PreviewStateProps) {
  return (
    <>
      <div
        className="w-full h-full cursor-pointer transition-opacity group-hover:opacity-80"
        onClick={(e) => {
          e.stopPropagation();
          onReplace();
        }}
        title="Click to replace"
      >
        {variant === "icon" ? (
          <div className="w-full h-full p-4 flex items-center justify-center bg-muted/20">
            <MediaImage
              file={file}
              size="small"
              className="w-full h-full object-contain drop-shadow-sm"
            />
          </div>
        ) : (
          <MediaImage
            file={file}
            size="large"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Floating Action Menu */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
        <div className="flex bg-background/95 backdrop-blur-sm rounded-full shadow-xl p-1.5 gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform pointer-events-auto border border-border/50">
          <AdminActionButton
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onReplace();
            }}
            title="Replace Media"
          >
            <Pencil className="size-4" />
          </AdminActionButton>
          <div className="w-px h-4 bg-border my-auto" />
          <AdminActionButton
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 text-destructive hover:bg-destructive/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove Media"
          >
            <X className="size-4" />
          </AdminActionButton>
        </div>
      </div>
    </>
  );
}

function EmptyState({ variant, onLibrary }: any) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/10 transition-colors"
      onClick={onLibrary}
    >
      <div
        className={cn(
          "rounded-full bg-muted/50 p-3 group-hover:scale-110 transition-transform",
          variant === "icon" && "p-2",
        )}
      >
        <FolderOpen
          className={cn("opacity-50", variant === "icon" ? "size-4" : "size-6")}
        />
      </div>
      {variant !== "icon" && (
        <p className="text-[9px] font-bold uppercase tracking-widest opacity-50">
          Select Media
        </p>
      )}
    </div>
  );
}
