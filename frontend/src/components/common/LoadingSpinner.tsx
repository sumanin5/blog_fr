import { Loader2 } from "lucide-react";

export function LoadingSpinner() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      <Loader2 className="text-primary h-8 w-8 animate-spin" />
      <span className="text-muted-foreground ml-3 text-lg font-medium">
        加载中...
      </span>
    </div>
  );
}
