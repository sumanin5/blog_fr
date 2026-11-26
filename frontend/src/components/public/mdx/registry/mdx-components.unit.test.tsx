import { render, screen } from "@testing-library/react";
import { compileMDX } from "next-mdx-remote/rsc";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createMdxCompileOptions } from "@/lib/markdown/mdx-options";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { AbstractionExtractor } from "../components/abstraction-extractor";
import { AgentHarnessDemo } from "../components/agent-harness-demo";
import { AttributionLab } from "../components/attribution-lab";
import { MdxBeforeAfterSlider } from "../components/before-after-slider";
import {
  BitInspector,
  decodeFloat64Bits,
  inspectUtf8String,
  isDecimalExactInFloat64,
} from "../components/bit-inspector";
import { BoundaryCard } from "../components/boundary-card";
import { ComplexityShift } from "../components/complexity-shift";
import { DeepDive } from "../components/deep-dive";
import { FilterLens } from "../components/filter-lens";
import { InfraFadeDemo } from "../components/infra-fade-demo";
import { LayerStepper } from "../components/layer-stepper";
import {
  evaluateSignalSample,
  sliderToSpeedFactor,
  TimeScaleDemo,
} from "../components/time-scale-demo";
import { createMdxComponents } from "./mdx-components";

describe("MDX component registry", () => {
  it("registers general shadcn/ui atomic components alongside custom MDX components", () => {
    const components = createMdxComponents();

    const expectedNames = [
      "Accordion",
      "AccordionItem",
      "AccordionTrigger",
      "AccordionContent",
      "Alert",
      "AlertTitle",
      "AlertDescription",
      "Avatar",
      "AvatarImage",
      "AvatarFallback",
      "Badge",
      "Button",
      "Card",
      "CardHeader",
      "CardTitle",
      "CardDescription",
      "CardAction",
      "CardContent",
      "CardFooter",
      "Dialog",
      "Sheet",
      "DotPattern",
      "Progress",
      "Separator",
      "Skeleton",
      "Switch",
      "Table",
      "Tabs",
      "TabsList",
      "TabsTrigger",
      "TabsContent",
      "TiltCard",
      "TooltipProvider",
      "Tooltip",
      "AbstractionExtractor",
      "AgentHarnessDemo",
      "AttributionLab",
      "BeforeAfterSlider",
      "BitInspector",
      "BoundaryCard",
      "ComplexityShift",
      "DeepDive",
      "FilterLens",
      "InfraFadeDemo",
      "InteractiveButton",
      "LayerStepper",
      "TanStackChart",
      "TimeScaleDemo",
    ];

    for (const name of expectedNames) {
      expect(components[name], `missing MDX component: ${name}`).toBeDefined();
    }
  });

  it("supports atomic composition of registered Card, Badge, Alert, and Button primitives", () => {
    const {
      Alert,
      AlertDescription,
      AlertTitle,
      Badge,
      Button,
      Card,
      CardContent,
      CardHeader,
      CardTitle,
      Separator,
    } = createMdxComponents() as Record<string, React.ComponentType<Record<string, unknown>>>;

    const html = renderToStaticMarkup(
      <Card>
        <CardHeader>
          <CardTitle>
            组合示例 <Badge variant="secondary">MDX</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>说明</AlertTitle>
            <AlertDescription>原子化组合测试</AlertDescription>
          </Alert>
          <Separator />
          <Button asChild size="sm">
            <a href="https://example.com">查看专栏</a>
          </Button>
        </CardContent>
      </Card>,
    );

    expect(html).toContain('data-slot="card"');
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain('data-slot="alert"');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain('href="https://example.com"');
  });

  it("renders LayerStepper with active layer contrast panels and highlighted sample", () => {
    const html = renderToStaticMarkup(
      <LayerStepper
        title="虚拟内存层"
        defaultIndex={1}
        layers={[
          {
            id: "app",
            name: "应用指针",
            surface: "进程觉得自己独占 48 位线性地址空间。",
            beneath: "每个地址都只是虚拟页号。",
          },
          {
            id: "mmu",
            name: "页表映射",
            badge: "MMU",
            surfaceLabel: "系统承诺",
            surface: "按虚拟地址直接读写内存。",
            beneathLabel: "硬件现实",
            beneath: "TLB 未命中时需遍历四级页表，必要时触发缺页中断换页。",
            sample: "const ptr = 0x7ffd_0010;",
            codeLang: "ts",
          },
        ]}
      />,
    );

    expect(html).toContain("虚拟内存层");
    expect(html).toContain("L2 / L2");
    expect(html).toContain("MMU");
    expect(html).toContain("系统承诺");
    expect(html).toContain("硬件现实");
    expect(html).toContain("TLB 未命中时需遍历四级页表");
    expect(html).toContain("0x7ffd_0010");
  });

  it("renders BoundaryCard in promise-hold and breached states", () => {
    const cases = [
      {
        id: "float",
        label: "浮点加法",
        promiseTitle: "十进制小数相加符合直觉",
        promiseDesc: "平时写业务数字加减时无需关心二进制位。",
        leakTitle: "幽灵尾数现形",
        leakDesc: "严格相等判断突然失败。",
        artifact: "0.1 + 0.2 === 0.30000000000000004",
        rootCause: "IEEE 754 float64 尾数位仅 52 位，1/10 在二进制下无限循环。",
      },
    ];

    const holdHtml = renderToStaticMarkup(
      <BoundaryCard title="边界测试" cases={cases} />,
    );
    expect(holdHtml).toContain("边界内 · 承诺生效");
    expect(holdHtml).toContain("十进制小数相加符合直觉");

    const breachedHtml = renderToStaticMarkup(
      <BoundaryCard title="边界测试" defaultBreached cases={cases} />,
    );
    expect(breachedHtml).toContain("越界 · 抽象泄漏");
    expect(breachedHtml).toContain("幽灵尾数现形");
    expect(breachedHtml).toContain("0.1 + 0.2 === 0.30000000000000004");
    expect(breachedHtml).toContain("IEEE 754 float64 尾数位仅 52 位");
  });

  it("inspects UTF-8 bytes and IEEE 754 float64 exactness accurately", () => {
    const utf8 = inspectUtf8String("晚安");
    expect(utf8.totalChars).toBe(2);
    expect(utf8.totalBytes).toBe(6);
    expect(utf8.hexStream).toBe("E6 99 9A E5 AE 89");
    expect(utf8.chars[0]?.codePointHex).toBe("U+665A");

    const utf8Html = renderToStaticMarkup(
      <BitInspector mode="utf8" defaultValue="晚安" />,
    );
    expect(utf8Html).toContain("U+665A");
    expect(utf8Html).toContain("0xE6");
    expect(utf8Html).toContain("E6 99 9A E5 AE 89");

    const p01 = decodeFloat64Bits(0.1);
    const p05 = decodeFloat64Bits(0.5);
    expect(p01.signBit).toBe("0");
    expect(p01.exponentBits.length).toBe(11);
    expect(p01.mantissaBits.length).toBe(52);
    expect(
      isDecimalExactInFloat64({ sign: 1, digits: BigInt(1), scale: 1 }, p01),
    ).toBe(false);
    expect(
      isDecimalExactInFloat64({ sign: 1, digits: BigInt(5), scale: 1 }, p05),
    ).toBe(true);

    const floatErrHtml = renderToStaticMarkup(
      <BitInspector mode="float64" defaultA={0.1} defaultB={0.2} />,
    );
    expect(floatErrHtml).toContain("0.30000000000000004");
    expect(floatErrHtml).toContain("存在舍入/截断误差");

    const floatExactHtml = renderToStaticMarkup(
      <BitInspector mode="float64" defaultA={0.5} defaultB={0.25} />,
    );
    expect(floatExactHtml).toContain("0.75");
    expect(floatExactHtml).toContain("精确无截断");
  });

  it("renders TimeScaleDemo in cpu-multitask and signal-threshold modes", () => {
    expect(sliderToSpeedFactor(0)).toBe(0.01);
    expect(sliderToSpeedFactor(100)).toBe(1);

    const macroHtml = renderToStaticMarkup(
      <TimeScaleDemo
        mode="cpu-multitask"
        tasks={[{ label: "渲染" }, { label: "请求" }]}
        defaultSpeedScale={100}
      />,
    );
    expect(macroHtml).toContain("1.00x");
    expect(macroHtml).toContain("宏观并发错觉");

    const microHtml = renderToStaticMarkup(
      <TimeScaleDemo
        mode="cpu-multitask"
        tasks={[{ label: "渲染" }, { label: "请求" }]}
        defaultSpeedScale={0}
      />,
    );
    expect(microHtml).toContain("0.01x");
    expect(microHtml).toContain("微观单核切片真相");

    const cleanSig = evaluateSignalSample([1, 0, 1, 1, 0, 1, 0, 0], 10);
    const noisySig = evaluateSignalSample([1, 0, 1, 1, 0, 1, 0, 0], 95);
    expect(cleanSig.errorCount).toBe(0);
    expect(noisySig.errorCount).toBeGreaterThan(0);

    const signalHtml = renderToStaticMarkup(
      <TimeScaleDemo mode="signal-threshold" defaultNoise={18} />,
    );
    expect(signalHtml).toContain("信道噪声干扰强度");
    expect(signalHtml).toContain("干净方波");
  });

  it("renders DeepDive collapsible container with summary and nested content", () => {
    const html = renderToStaticMarkup(
      <DeepDive
        title="页表为什么分成四级？"
        summary="只用两分钟看清稀疏地址空间压缩技巧"
        defaultOpen
      >
        <p>多级页表像字典目录一样按需分配页框。</p>
      </DeepDive>,
    );

    expect(html).toContain("页表为什么分成四级？");
    expect(html).toContain("只用两分钟看清稀疏地址空间压缩技巧");
    expect(html).toContain("多级页表像字典目录一样按需分配页框。");
  });

  it("renders BeforeAfterSlider with paired Markdown image wrappers and missing-image fallback", () => {
    /* eslint-disable @next/next/no-img-element */
    const validHtml = renderToStaticMarkup(
      <MdxBeforeAfterSlider
        title="地铁图 vs 卫星图"
        beforeLabel="抽象模型"
        afterLabel="物理现实"
        defaultPosition={60}
        aspectRatio="5/4"
      >
        <p>
          <img src="/media/metro.jpg" alt="地铁图" />
        </p>
        <p>
          <img src="/media/satellite.jpg" alt="卫星图" />
        </p>
      </MdxBeforeAfterSlider>,
    );
    expect(validHtml).toContain("地铁图 vs 卫星图");
    expect(validHtml).toContain("抽象模型");
    expect(validHtml).toContain("物理现实");
    expect(validHtml).toContain("/media/metro.jpg");
    expect(validHtml).toContain("/media/satellite.jpg");
    expect(validHtml).toContain("aspect-[5/4]");

    const fallbackHtml = renderToStaticMarkup(
      <MdxBeforeAfterSlider title="缺图提示">
        <p>
          <img src="/media/only-one.jpg" alt="单张图" />
        </p>
      </MdxBeforeAfterSlider>,
    );
    /* eslint-enable @next/next/no-img-element */
    expect(fallbackHtml).toContain("缺图提示");
    expect(fallbackHtml).toContain("两张用空行隔开的标准 Markdown 图片");
  });

  it("renders FilterLens in filtered and revealed states", () => {
    const props = {
      title: "报表滤镜对照",
      metrics: [{ label: "交付速度", value: "+18%", badge: "KPI" }],
      omittedItems: [
        {
          tag: "隐性成本",
          title: "核心开发者连续加班两周",
          detail: "为了赶交付节点跳过部分重构与回归核对。",
          cost: "后续故障排查翻倍",
        },
      ],
      insightWhenFiltered: "指标干净漂亮",
      insightWhenRevealed: "被省略的代价并没有消失",
    };

    const filteredHtml = renderToStaticMarkup(
      <FilterLens {...props} defaultFiltered />,
    );
    expect(filteredHtml).toContain("滤镜开启 · 抽象模型");
    expect(filteredHtml).toContain("已被模型省略");
    expect(filteredHtml).toContain("指标干净漂亮");

    const revealedHtml = renderToStaticMarkup(
      <FilterLens {...props} defaultFiltered={false} />,
    );
    expect(revealedHtml).toContain("滤镜已摘 · 真实世界");
    expect(revealedHtml).toContain("为了赶交付节点跳过部分重构与回归核对。");
    expect(revealedHtml).toContain("代价：后续故障排查翻倍");
    expect(revealedHtml).toContain("被省略的代价并没有消失");
  });

  it("renders ComplexityShift across abstraction eras", () => {
    const html = renderToStaticMarkup(
      <ComplexityShift
        title="复杂性去哪了"
        defaultIndex={1}
        stages={[
          {
            id: "asm",
            era: "1960s",
            label: "汇编",
            userCode: "MOV AX, 0x01",
            userBurden: 90,
            hiddenComplexity: 15,
            hiddenLayers: ["机器指令集"],
            takeaway: "所见即所得，但心智负担极高。",
          },
          {
            id: "cloud",
            era: "2020s",
            label: "云原生 ORM",
            userCode: "await db.posts.findMany();",
            codeLang: "ts",
            userBurden: 12,
            hiddenComplexity: 92,
            hiddenLayers: ["ORM 查询编译器", "连接池", "分布式共识"],
            takeaway: "一行代码极简，但出了问题需要穿透多层底座。",
          },
        ]}
      />,
    );

    expect(html).toContain("复杂性去哪了");
    expect(html).toContain("2020s");
    expect(html).toContain("findMany");
    expect(html).toContain("12%");
    expect(html).toContain("92%");
    expect(html).toContain("ORM 查询编译器");
    expect(html).toContain("一行代码极简");
  });

  it("compiles and renders real MDX source through createMdxComponents without missing-component or list-indent regressions", async () => {
    const mdxSource = `
<BeforeAfterSlider title="端到端编译" beforeLabel="左图" afterLabel="右图" aspectRatio="5/4">

![左](/media/a.jpg)

![右](/media/b.jpg)

</BeforeAfterSlider>

<Tabs defaultValue="list">
  <TabsList>
    <TabsTrigger value="list">列表测试</TabsTrigger>
  </TabsList>
<TabsContent value="list">

- 列表项一
- 列表项二

</TabsContent>
</Tabs>

<FilterLens
  metrics={[{ label: "指标", value: "100%" }]}
  omittedItems={[{ tag: "细节", title: "隐藏项", detail: "详述" }]}
/>

<ComplexityShift
  stages={[{
    id: "s1",
    era: "2020s",
    label: "现代",
    userCode: "ok()",
    userBurden: 20,
    hiddenComplexity: 80,
    hiddenLayers: ["层1"],
    takeaway: "结论",
  }]}
/>

<DeepDive title="深挖列表">

1. 公式 $e^2$

</DeepDive>

<AbstractionExtractor
  defaultMode="abstracted"
  scenarios={[{
    id: "num3",
    label: "3",
    targetGoal: "计数",
    instances: [{ label: "树", keptTrait: "3个对象", droppedTraits: ["叶子"] }],
    extractedModel: { name: "数字 3", contract: "独立计数模型" },
    mereLossModel: { name: "空泛多", consequence: "丧失精确相加" },
  }]}
/>

<InfraFadeDemo
  scenarios={[{
    id: "power",
    label: "供电",
    stages: [{ phase: "隐形", userFocus: "开灯", consciousnessLoad: 5, hiddenScale: 95, backgroundLayers: ["变电站"] }],
    breakdown: { triggerLabel: "断电", symptom: "黑灯", exposedLayers: ["变电站"], takeaway: "底座显形" },
  }]}
/>

<AttributionLab
  sharedDeliverable="相同 PR"
  scenarios={[{ id: "s1", label: "验收", context: "正常", kpiInsight: "盲区" }]}
  profiles={[{
    id: "a",
    name: "A",
    roleTag: "独立",
    methodSummary: "手写",
    outputScore: 100,
    understandingScore: 95,
    verificationScore: 90,
    outcomesByScenario: { s1: { status: "stable", headline: "稳态", detail: "可控" } },
  }]}
/>

<AgentHarnessDemo
  taskPrompt="执行变更"
  guardrails={[{
    id: "g1",
    label: "Schema",
    category: "Schema",
    preventsRisk: "格式正确",
    exposedRisk: "参数失真",
    stage: "parse",
  }]}
/>
`;

    const { content } = await compileMDX({
      source: mdxSource,
      components: createMdxComponents(),
      options: createMdxCompileOptions(),
    });

    const html = renderToStaticMarkup(content);
    expect(html).toContain("端到端编译");
    expect(html).toContain("/media/a.jpg");
    expect(html).toContain("列表项一");
    expect(html).toContain("滤镜开启");
    expect(html).toContain("现代");
    expect(html).toContain("深挖列表");
    expect(html).toContain("独立计数模型");
    expect(html).toContain("变电站");
    expect(html).toContain("相同 PR");
    expect(html).toContain("执行变更");
  });

  it("includes mobile responsive overflow, touch-action, and accessible modal sizing guards", () => {
    const bitHtml = renderToStaticMarkup(
      <BitInspector mode="utf8" defaultValue="A" />,
    );
    expect(bitHtml).toContain("grid-cols-4");
    expect(bitHtml).toContain("sm:grid-cols-8");
    expect(bitHtml).toContain("min-w-0");

    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>移动端弹窗</DialogTitle>
          <DialogDescription>可滚动高度限制</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    const dialogEl = screen.getByRole("dialog");
    expect(dialogEl).toHaveClass("max-h-[85dvh]");
    expect(dialogEl).toHaveClass("overflow-y-auto");

    /* eslint-disable @next/next/no-img-element */
    const sliderHtml = renderToStaticMarkup(
      <MdxBeforeAfterSlider beforeLabel="A" afterLabel="B">
        <p>
          <img src="/a.png" alt="A" />
        </p>
        <p>
          <img src="/b.png" alt="B" />
        </p>
      </MdxBeforeAfterSlider>,
    );
    /* eslint-enable @next/next/no-img-element */
    expect(sliderHtml).toContain("touch-pan-y");
    expect(sliderHtml).toContain("touch-none");
    expect(sliderHtml).toContain("min-h-11");

    const extractionHtml = renderToStaticMarkup(
      <AbstractionExtractor scenarios={[]} />,
    );
    expect(extractionHtml).toContain("未配置对比场景");

    const infraHtml = renderToStaticMarkup(
      <InfraFadeDemo scenarios={[]} />,
    );
    expect(infraHtml).toContain("未配置基础设施场景");

    const attrHtml = renderToStaticMarkup(
      <AttributionLab
        sharedDeliverable="X"
        scenarios={[]}
        profiles={[]}
      />,
    );
    expect(attrHtml).toContain("未配置完整的实验对比数据");

    const harnessHtml = renderToStaticMarkup(
      <AgentHarnessDemo taskPrompt="X" guardrails={[]} />,
    );
    expect(harnessHtml).toContain("未配置工程护栏条目");
  });

  it("renders CJK bold and strikethrough near Chinese punctuation without leaking ** or ~~", async () => {
    const mdxSource = [
      "从**“阶段性指标交付”**的逻辑去看，这种**自指（Self-Reference）**不仅是概念。",
      "",
      "把**《道德经》**变成**(模型)**测试，中文~~（已废弃）~~继续，以及 `**kwargs` 保持原样。",
      "",
      "```python",
      "def fn(**kwargs):",
      "    return kwargs",
      "```",
    ].join("\n");

    const { content } = await compileMDX({
      source: mdxSource,
      components: createMdxComponents(),
      options: createMdxCompileOptions(),
    });

    const html = renderToStaticMarkup(content);
    expect(html).toContain("<strong>“阶段性指标交付”</strong>");
    expect(html).toContain("<strong>自指（Self-Reference）</strong>");
    expect(html).toContain("<strong>《道德经》</strong>");
    expect(html).toContain("<strong>(模型)</strong>");
    expect(html).toContain("<del>（已废弃）</del>");
    expect(html).toContain("**kwargs");
    expect(html).not.toContain("**“");
    expect(html).not.toContain("**自指");
    expect(html).not.toContain("~~（");
  });
});
