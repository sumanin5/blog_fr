/**
 * MDX 组件注册中心 & Agent 引用说明书
 *
 * 职责：只做组件白名单映射，不包含业务逻辑；同时作为内容编写 Agent 查询可用标签与 Props 的一手清单。
 *
 * 架构原则：
 * - 注册层只负责路由（哪个标签用哪个组件）
 * - 业务逻辑在 `"use client"` 组件内部处理，不向 `.mdx` 暴露函数回调 Props
 * - 保持注册层简洁清晰
 *
 * ============================================================================
 * [AGENT USAGE GUIDE] 给 AI / 内容编写 Agent 的 MDX 组件引用规范
 * ============================================================================
 *
 * 1. 文章前置要求与写法硬规则（Frontmatter & RSC 边界）
 * ----------------------------------------------------------------------------
 * - 仅在文章真正用到 JSX 组件时，在 frontmatter 设置 `enable_jsx: true`（建议文件后缀 `.mdx`）。
 * - 禁止在 `.mdx` 中编写 `import ...` 语句：以下注册表中的所有组件均已全局注入，直接写标签即可。
 * - 禁止在 JSX 属性里传递函数/事件回调（如 `onClick={() => ...}`）：默认使用 `next-mdx-remote/rsc`
 *   服务端渲染，函数无法跨越 RSC 边界序列化；交互状态全部封装在组件内部。
 * - 禁止写 HTML 字符串样式 `style="color:red"`：请写 Tailwind CSS 语义类（`bg-card`, `text-foreground`,
 *   `border-border`, `text-muted-foreground`, `bg-muted`, `bg-primary` 等），不要硬编码颜色字面量。
 * - 块级 JSX 标签与 Markdown 段落/列表混排时，标签前后（以及闭合容器首尾内部）务必保留空行，
 *   否则内部的 `**粗体**` / 列表 / `$公式$` 不会被 MDX 解析。
 * - 导出降级（`/posts/<type>/<slug>.md` 与 `llms-full.txt`）：
 *   自闭合交互组件 `<Xxx />` 会自动替换为 `*[交互内容：Xxx，请在原文页面查看]*`；
 *   成对容器组件 `<DeepDive>...</DeepDive>` 会剥离外壳标签并保留内部 Markdown 正文。
 *
 * 2. 专题交互引擎与阅读原语（纯 Props 数据驱动，直接粘贴即用）
 * ----------------------------------------------------------------------------
 * (1) <LayerStepper /> — 多层级剥离 / 对照步进器（最核心）
 *     Props:
 *       title?: string
 *       subtitle?: string
 *       defaultIndex?: number                      // 默认 0
 *       layers: Array<{
 *         id: string;
 *         name: string;                            // 层级名称（如：应用代码 / 虚拟内存 / 页表映射）
 *         badge?: string;                          // 可选角标（如：Ring 3 / L2）
 *         surfaceLabel?: string;                   // 默认 "对外承诺 / 表象"
 *         surface: string;                         // 表层承诺描述
 *         beneathLabel?: string;                   // 默认 "底层真实运转"
 *         beneath: string;                         // 底层真实机制
 *         sample?: string;                         // 可选：同一份数据在本层的呈现形态
 *         codeLang?: string;                       // 可选：ts / python / json / sql / plaintext
 *       }>
 *     MDX 示例:
 *       <LayerStepper
 *         title="一条 write() 调用的抽象下潜"
 *         layers={[
 *           {
 *             id: "app",
 *             name: "应用层接口",
 *             badge: "User Space",
 *             surface: "像写内存字符串一样调用 write()，仿佛字节立刻落盘。",
 *             beneath: "仅触发 libc 包装并把数据拷入内核 Page Cache，函数返回时磁盘尚未动弹。",
 *             sample: 'await fs.writeFile("note.txt", "晚安");',
 *             codeLang: "ts",
 *           },
 *           {
 *             id: "kernel",
 *             name: "内核页缓存",
 *             badge: "Kernel",
 *             surface: "统一文件流与即时一致性视图。",
 *             beneath: "标记 4KB Dirty Page，等待 pdflush / fsync 真正刷入块设备。",
 *           },
 *         ]}
 *       />
 *
 * (2) <BoundaryCard /> — “承诺生效 ⇄ 边界击穿（泄漏）”双态切换卡片
 *     Props:
 *       title?: string
 *       subtitle?: string
 *       defaultBreached?: boolean                  // 默认 false（边界内）
 *       cases: Array<{
 *         id: string;
 *         label: string;                           // 多案例 Tab 标签
 *         promiseTitle: string;
 *         promiseDesc: string;
 *         leakTitle: string;
 *         leakDesc: string;
 *         artifact?: string;                       // 可选：反常输出/观测样本
 *         rootCause: string;                       // 底层物理/工程根因
 *       }>
 *     MDX 示例:
 *       <BoundaryCard
 *         title="抽象何时穿帮"
 *         cases={[
 *           {
 *             id: "float",
 *             label: "十进制小数",
 *             promiseTitle: "0.1 + 0.2 应当精确等于 0.3",
 *             promiseDesc: "高层语言用十进制字面量掩盖了二进制存储，日常金额以外的算术几乎无感。",
 *             leakTitle: "精度多出了一点幽灵尾数",
 *             leakDesc: "在浏览器或 Python 控制台执行 0.1 + 0.2，条件判断 === 0.3 直接返回 false。",
 *             artifact: "0.1 + 0.2 === 0.30000000000000004",
 *             rootCause: "IEEE 754 float64 只有 52 位尾数，二进制无法有限表示 1/10，两次舍入误差叠加显形。",
 *           },
 *         ]}
 *       />
 *
 * (3) <BitInspector /> — 数据底层比特显微镜
 *     Props:
 *       mode: "utf8" | "float64"                   // 默认 "utf8"
 *       title?: string
 *       subtitle?: string
 *       defaultValue?: string                      // utf8 模式初始文本，默认 "晚安"
 *       defaultA?: number                          // float64 模式默认操作数 A = 0.1
 *       defaultB?: number                          // float64 模式默认操作数 B = 0.2
 *       presets?: Array<[number, number]>          // float64 模式预设组合按钮
 *     MDX 示例:
 *       <BitInspector mode="utf8" defaultValue="晚安" />
 *       <BitInspector mode="float64" defaultA={0.1} defaultB={0.2} presets={[[0.1, 0.2], [0.5, 0.25]]} />
 *
 * (4) <TimeScaleDemo /> — 宏观错觉 vs 微观现实模拟器
 *     Props:
 *       mode: "cpu-multitask" | "signal-threshold" // 默认 "cpu-multitask"
 *       title?: string
 *       subtitle?: string
 *       tasks?: Array<{ label: string }>           // cpu-multitask 轨道标签，默认 3 个示例任务
 *       defaultSpeedScale?: number                 // 0..100（100 = 1.00x，0 = 0.01x）
 *       defaultNoise?: number                      // signal-threshold 初始噪声强度 0..100，默认 18
 *     MDX 示例:
 *       <TimeScaleDemo mode="cpu-multitask" tasks={[{ label: "UI 渲染" }, { label: "API 请求" }, { label: "事件循环" }]} />
 *       <TimeScaleDemo mode="signal-threshold" defaultNoise={18} />
 *
 * (5) <DeepDive>...</DeepDive> — 折叠深挖盒（支持嵌套任意 Markdown / 公式 / 代码块）
 *     Props:
 *       title: string
 *       summary?: string                           // 可选的一句话导读（收起态可见）
 *       defaultOpen?: boolean                      // 默认 false
 *       badge?: string                             // 默认 "深挖"
 *     MDX 示例（注意内容与标签之间留空行）:
 *       <DeepDive title="IEEE 754 为什么是向偶数舍入？" summary="跳过不影响主线，好奇舍入规则可展开">
 *
 *       当第 53 位尾数恰好处于 `0.5` 正中间时，总是向上进位会带来系统性正偏差；
 *       **Round-to-Nearest-Even** 通过向最近偶数舍入让统计期望误差归零。
 *
 *       </DeepDive>
 *
 * (6) <BeforeAfterSlider>...</BeforeAfterSlider> — 双图视觉卷帘对比器（GitOps 图片同步友好）
 *     Props:
 *       title?: string
 *       subtitle?: string
 *       beforeLabel?: string                       // 默认 "对照前"
 *       afterLabel?: string                        // 默认 "对照后"
 *       defaultPosition?: number                   // 0..100，默认 50
 *       aspectRatio?: "16/9" | "4/3" | "5/4" | "1/1" | "3/2" // 默认 "5/4"
 *     注意：内部直接放入两张标准 Markdown 图片（用空行隔开），以便 GitOps 媒体同步自动重写路径！
 *     MDX 示例:
 *       <BeforeAfterSlider title="模型 vs 现实" beforeLabel="地铁图" afterLabel="卫星图" aspectRatio="5/4">
 *
 *       ![左图](assets/metro.jpg)
 *
 *       ![右图](assets/satellite.jpg)
 *
 *       </BeforeAfterSlider>
 *
 * (7) <FilterLens /> — 认知滤镜 / “看见与看不见”对比器
 *     Props:
 *       title?: string; subtitle?: string; defaultFiltered?: boolean; // 默认 true
 *       filterOnLabel?: string; filterOffLabel?: string;
 *       metrics?: Array<{ label: string; value: string; badge?: string }>
 *       omittedItems?: Array<{ tag: string; title: string; detail: string; cost?: string }>
 *       insightWhenFiltered?: string; insightWhenRevealed?: string
 *       scenarios?: Array<{ id, label, metrics, omittedItems, insightWhenFiltered?, insightWhenRevealed? }>
 *
 * (8) <ComplexityShift /> — 复杂性转移天平
 *     Props:
 *       title?: string; subtitle?: string; defaultIndex?: number
 *       stages: Array<{ id, era, label, userCode, codeLang?, userBurden, hiddenComplexity, comprehensionRatio?, hiddenLayers: string[], takeaway }>
 *
 * 3. 其他已注册通用原子（shadcn/ui，推荐用于排版与局部组合）
 * ----------------------------------------------------------------------------
 * - 布局与提示：Card / CardHeader / CardTitle / CardDescription / CardAction / CardContent / CardFooter,
 *   Alert / AlertTitle / AlertDescription, Separator, TiltCard, DotPattern
 * - 交互与切换：Tabs / TabsList / TabsTrigger / TabsContent, Accordion*, Button, Badge,
 *   Progress, Switch, InteractiveButton, Dialog*, Sheet*, Tooltip*, Table*, Skeleton, Avatar*
 * - 数据图表：<TanStackChart initialDataset="pipeline" | "reading" />
 * - 内容写作 Agent 可直接按需读取内容仓库的 `.agent/skills/mdx-components/SKILL.md` 获取全部组件详表与可复制示例。
 * ============================================================================
 */

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TiltCard } from "@/components/ui/tilt-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MdxBeforeAfterSlider } from "../components/before-after-slider";
import { BitInspector } from "../components/bit-inspector";
import { BoundaryCard } from "../components/boundary-card";
import { CodeBlock } from "../components/code-block";
import { ComplexityShift } from "../components/complexity-shift";
import { DeepDive } from "../components/deep-dive";
import { FilterLens } from "../components/filter-lens";
import { InteractiveButton } from "../components/interactive-button";
import { LayerStepper } from "../components/layer-stepper";
import { TanStackChart } from "../components/tanstack-chart";
import { TimeScaleDemo } from "../components/time-scale-demo";

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement> & {
  id?: string;
  children?: React.ReactNode;
};

interface TocItem {
  id: string;
  title: string;
  level: number;
}

/**
 * 从 React 节点中提取纯文本
 */
function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement(node)) {
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    if (element.props?.children) {
      return extractText(element.props.children);
    }
  }
  return "";
}

/**
 * 转换 HTML style 字符串为 React style 对象
 */
function parseStyleString(styleStr: string): React.CSSProperties {
  const style: Record<string, string> = {};
  styleStr.split(";").forEach((rule) => {
    const [key, value] = rule.split(":").map((s) => s.trim());
    if (key && value) {
      // 转换 kebab-case 为 camelCase
      const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      style[camelKey] = value;
    }
  });
  return style as React.CSSProperties;
}

/**
 * 创建支持 HTML style 属性的 HTML 元素组件
 */
function createHtmlElement(tag: string) {
  return function HtmlElement(
    props: React.HTMLAttributes<HTMLElement> & {
      style?: string | React.CSSProperties;
    }
  ) {
    const { style, ...rest } = props;

    // 如果 style 是字符串，转换为对象
    const styleObj =
      typeof style === "string" ? parseStyleString(style) : style;

    return React.createElement(tag, { ...rest, style: styleObj });
  };
}

/**
 * 创建 MDX 组件映射
 *
 * @param toc - 后端生成的目录数组
 */
export function createMdxComponents(
  toc: TocItem[] = []
): Record<string, React.ComponentType> {
  // 创建标题组件工厂
  const createHeading = (tag: string, level: number) => {
    return function Heading(props: HeadingProps) {
      // 提取标题文本
      const text = extractText(props.children);

      // 从 toc 中查找匹配的 ID
      const tocItem = toc.find(
        (item) => item.level === level && item.title === text
      );
      const id = props.id || tocItem?.id || "";

      return React.createElement(
        tag,
        {
          ...props,
          id,
          className: ["scroll-mt-24", props.className]
            .filter(Boolean)
            .join(" "),
        },
        props.children
      );
    };
  };

  return {
    // 代码块：直接映射到 CodeBlock（内部处理 Mermaid 判断）
    pre: CodeBlock,

    // 标题：从 toc 中匹配 ID
    h1: createHeading("h1", 1),
    h2: createHeading("h2", 2),
    h3: createHeading("h3", 3),
    h4: createHeading("h4", 4),
    h5: createHeading("h5", 5),
    h6: createHeading("h6", 6),

    // HTML 元素：支持字符串格式的 style 属性
    div: createHtmlElement("div"),
    span: createHtmlElement("span"),
    p: createHtmlElement("p"),
    section: createHtmlElement("section"),
    article: createHtmlElement("article"),

    // 通用 shadcn/ui 原子与组合组件
    Accordion: Accordion as React.ComponentType,
    AccordionItem: AccordionItem as React.ComponentType,
    AccordionTrigger: AccordionTrigger as React.ComponentType,
    AccordionContent: AccordionContent as React.ComponentType,
    Alert: Alert as React.ComponentType,
    AlertTitle: AlertTitle as React.ComponentType,
    AlertDescription: AlertDescription as React.ComponentType,
    Avatar: Avatar as React.ComponentType,
    AvatarImage: AvatarImage as React.ComponentType,
    AvatarFallback: AvatarFallback as React.ComponentType,
    Badge: Badge as React.ComponentType,
    Button: Button as React.ComponentType,
    Card: Card as React.ComponentType,
    CardHeader: CardHeader as React.ComponentType,
    CardTitle: CardTitle as React.ComponentType,
    CardDescription: CardDescription as React.ComponentType,
    CardAction: CardAction as React.ComponentType,
    CardContent: CardContent as React.ComponentType,
    CardFooter: CardFooter as React.ComponentType,
    Dialog: Dialog as React.ComponentType,
    DialogTrigger: DialogTrigger as React.ComponentType,
    DialogContent: DialogContent as React.ComponentType,
    DialogHeader: DialogHeader as React.ComponentType,
    DialogTitle: DialogTitle as React.ComponentType,
    DialogDescription: DialogDescription as React.ComponentType,
    DialogFooter: DialogFooter as React.ComponentType,
    DialogClose: DialogClose as React.ComponentType,
    DotPattern: DotPattern as React.ComponentType,
    Progress: Progress as React.ComponentType,
    Separator: Separator as React.ComponentType,
    Sheet: Sheet as React.ComponentType,
    SheetTrigger: SheetTrigger as React.ComponentType,
    SheetContent: SheetContent as React.ComponentType,
    SheetHeader: SheetHeader as React.ComponentType,
    SheetTitle: SheetTitle as React.ComponentType,
    SheetDescription: SheetDescription as React.ComponentType,
    SheetFooter: SheetFooter as React.ComponentType,
    SheetClose: SheetClose as React.ComponentType,
    Skeleton: Skeleton as React.ComponentType,
    Switch: Switch as React.ComponentType,
    Table: Table as React.ComponentType,
    TableHeader: TableHeader as React.ComponentType,
    TableBody: TableBody as React.ComponentType,
    TableFooter: TableFooter as React.ComponentType,
    TableHead: TableHead as React.ComponentType,
    TableRow: TableRow as React.ComponentType,
    TableCell: TableCell as React.ComponentType,
    TableCaption: TableCaption as React.ComponentType,
    Tabs: Tabs as React.ComponentType,
    TabsList: TabsList as React.ComponentType,
    TabsTrigger: TabsTrigger as React.ComponentType,
    TabsContent: TabsContent as React.ComponentType,
    TiltCard: TiltCard as React.ComponentType,
    TooltipProvider: TooltipProvider as React.ComponentType,
    Tooltip: Tooltip as React.ComponentType,
    TooltipTrigger: TooltipTrigger as React.ComponentType,
    TooltipContent: TooltipContent as React.ComponentType,

    // 自定义交互组件 & 专题通用阅读原语
    BeforeAfterSlider: MdxBeforeAfterSlider as React.ComponentType,
    BitInspector: BitInspector as React.ComponentType,
    BoundaryCard: BoundaryCard as React.ComponentType,
    ComplexityShift: ComplexityShift as React.ComponentType,
    DeepDive: DeepDive as React.ComponentType,
    FilterLens: FilterLens as React.ComponentType,
    InteractiveButton: InteractiveButton as React.ComponentType,
    LayerStepper: LayerStepper as React.ComponentType,
    TanStackChart: TanStackChart as React.ComponentType,
    TimeScaleDemo: TimeScaleDemo as React.ComponentType,
  };
}
