"use client";

import * as React from "react";
import { Columns2 } from "lucide-react";

import { BeforeAfterSlider as BeuiBeforeAfterSlider } from "@/components/motion/before-after-slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MdxBeforeAfterSliderProps {
  /** 可选组件主标题 */
  title?: string;
  /** 可选副标题说明 */
  subtitle?: string;
  /** 左侧（上层裁剪图）标签 */
  beforeLabel?: string;
  /** 右侧（底层基准图）标签 */
  afterLabel?: string;
  /** 初始分隔线百分比（0–100），默认 50 */
  defaultPosition?: number;
  /** 画面宽高比，默认 "5/4" */
  aspectRatio?: "16/9" | "4/3" | "5/4" | "1/1" | "3/2";
  /** 容器内部放入两张标准 Markdown 图片 */
  children?: React.ReactNode;
}

const ASPECT_CLASS_MAP: Record<
  NonNullable<MdxBeforeAfterSliderProps["aspectRatio"]>,
  string
> = {
  "16/9": "aspect-video",
  "4/3": "aspect-[4/3]",
  "5/4": "aspect-[5/4]",
  "1/1": "aspect-square",
  "3/2": "aspect-[3/2]",
};

function clampPosition(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function isNonEmptyNode(node: React.ReactNode): boolean {
  if (node === null || node === undefined || typeof node === "boolean") {
    return false;
  }
  if (typeof node === "string") {
    return node.trim().length > 0;
  }
  return true;
}

function extractComparisonPair(
  children: React.ReactNode,
): [React.ReactNode, React.ReactNode] | null {
  const topLevel = React.Children.toArray(children).filter(isNonEmptyNode);
  if (topLevel.length >= 2) {
    return [topLevel[0], topLevel[1]];
  }

  // 若作者两张 Markdown 图片之间漏留空行，MDX 会合并进同一个 <p> 内，做兼容兜底拆解
  if (topLevel.length === 1 && React.isValidElement(topLevel[0])) {
    const element = topLevel[0] as React.ReactElement<{
      children?: React.ReactNode;
    }>;
    const nested = React.Children.toArray(element.props?.children).filter(
      isNonEmptyNode,
    );
    if (nested.length >= 2) {
      return [nested[0], nested[1]];
    }
  }

  return null;
}

const SLOT_IMAGE_CLASSES =
  "h-full w-full [&>p]:m-0 [&>p]:h-full [&>p]:w-full [&_img]:pointer-events-none [&_img]:m-0 [&_img]:block [&_img]:h-full [&_img]:w-full [&_img]:select-none [&_img]:object-cover";

/**
 * 双图视觉卷帘对比器（基于 @beui/before-after-slider 封装 MDX 容器插槽）。
 * 文章内直接放两张标准 Markdown 图片 ![...](assets/...)，完全兼容 GitOps 媒体上传与链接重写。
 */
export function MdxBeforeAfterSlider({
  title,
  subtitle,
  beforeLabel = "对照前",
  afterLabel = "对照后",
  defaultPosition = 50,
  aspectRatio = "5/4",
  children,
}: MdxBeforeAfterSliderProps) {
  const [position, setPosition] = React.useState<number>(() =>
    clampPosition(defaultPosition),
  );
  const pair = React.useMemo(() => extractComparisonPair(children), [children]);

  if (!pair) {
    return (
      <Alert variant="destructive" className="not-prose my-6">
        <AlertTitle>{title ?? "BeforeAfterSlider 图片不足"}</AlertTitle>
        <AlertDescription>
          请在 &lt;BeforeAfterSlider&gt; 标签内放入两张用空行隔开的标准
          Markdown 图片，例如 `![左图](assets/a.jpg)` 与
          `![右图](assets/b.jpg)`。
        </AlertDescription>
      </Alert>
    );
  }

  const [beforeNode, afterNode] = pair;
  const aspectClass = ASPECT_CLASS_MAP[aspectRatio] ?? ASPECT_CLASS_MAP["5/4"];

  return (
    <Card className="not-prose my-8 gap-0 overflow-hidden border-border/70 bg-card/70 py-0 shadow-sm">
      {title || subtitle ? (
        <CardHeader className="border-b border-border/60 bg-muted/30 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Columns2 aria-hidden="true" className="size-4 text-primary" />
              {title ? (
                <CardTitle className="text-base font-semibold text-foreground sm:text-lg">
                  {title}
                </CardTitle>
              ) : null}
            </div>
            <Badge variant="secondary" className="font-mono text-xs">
              {Math.round(position)}%
            </Badge>
          </div>
          {subtitle ? (
            <CardDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {subtitle}
            </CardDescription>
          ) : null}
        </CardHeader>
      ) : null}

      <CardContent className="p-3 sm:p-4">
        <BeuiBeforeAfterSlider
          value={position}
          onValueChange={setPosition}
          showLabels
          labels={{
            before: beforeLabel,
            after: afterLabel,
            label: title ?? "双图视觉卷帘对比器",
            valueText: `{value}% ${beforeLabel}`,
          }}
          className={cn(
            "min-w-0 select-none touch-pan-y rounded-lg border border-border/60",
            aspectClass,
          )}
          before={<div className={SLOT_IMAGE_CLASSES}>{beforeNode}</div>}
          after={<div className={SLOT_IMAGE_CLASSES}>{afterNode}</div>}
        />
      </CardContent>

      <CardFooter className="flex flex-col gap-2.5 border-t border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs text-foreground">
            左：{beforeLabel}
          </Badge>
          <span aria-hidden="true">⇄</span>
          <Badge variant="outline" className="text-xs text-foreground">
            右：{afterLabel}
          </Badge>
          <span className="hidden sm:inline">· 支持拖动中线或方向键微调</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={position >= 95 ? "default" : "outline"}
            className="min-h-11 px-3 text-xs sm:min-h-9"
            onClick={() => setPosition(100)}
          >
            只看左侧
          </Button>
          <Button
            type="button"
            size="sm"
            variant={position > 40 && position < 60 ? "default" : "outline"}
            className="min-h-11 px-3 text-xs sm:min-h-9"
            onClick={() => setPosition(50)}
          >
            平分 50%
          </Button>
          <Button
            type="button"
            size="sm"
            variant={position <= 5 ? "default" : "outline"}
            className="min-h-11 px-3 text-xs sm:min-h-9"
            onClick={() => setPosition(0)}
          >
            只看右侧
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
