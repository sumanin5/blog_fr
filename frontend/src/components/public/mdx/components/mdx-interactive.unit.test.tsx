import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { AbstractionExtractor } from "./abstraction-extractor";
import { AgentHarnessDemo } from "./agent-harness-demo";
import { AttributionLab } from "./attribution-lab";
import { InfraFadeDemo } from "./infra-fade-demo";
import { ResilienceDemo } from "./resilience-demo";

beforeAll(() => {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe("New MDX interactive components", () => {
  it("AbstractionExtractor toggles raw, abstracted, and loss modes accurately", () => {
    render(
      <AbstractionExtractor
        scenarios={[
          {
            id: "stack",
            label: "Stack 抽象",
            targetGoal: "保证 LIFO 操作契约",
            instances: [
              {
                label: "数组栈",
                keptTrait: "push / pop 遵守 LIFO",
                droppedTraits: ["连续物理内存"],
              },
              {
                label: "链表栈",
                keptTrait: "push / pop 遵守 LIFO",
                droppedTraits: ["next 指针域"],
              },
            ],
            extractedModel: {
              name: "Stack<T>",
              contract: "可替换存储实现而不改变上层逻辑。",
              example: "interface Stack<T> { push(x: T): void; }",
            },
            mereLossModel: {
              name: "无序集合",
              consequence: "丧失后进先出顺序能力，无法执行括号匹配。",
            },
          },
        ]}
      />,
    );

    expect(screen.getByText(/原始观察结论/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "2. 结构抽象" }));
    expect(screen.getByText("Stack<T>")).toBeInTheDocument();
    expect(screen.getByText(/可替换存储实现/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "3. 单纯信息丢失" }));
    expect(screen.getByText("无序集合")).toBeInTheDocument();
    expect(screen.getByText(/丧失后进先出顺序能力/)).toBeInTheDocument();
  });

  it("InfraFadeDemo moves between maturity stages and exposes hidden layers on fault", () => {
    render(
      <InfraFadeDemo
        defaultStageIndex={2}
        scenarios={[
          {
            id: "http",
            label: "HTTP 请求",
            stages: [
              {
                phase: "早期手摇配置",
                userFocus: "手动填写 IP 与端口",
                consciousnessLoad: 85,
                hiddenScale: 15,
                backgroundLayers: ["双绞线"],
              },
              {
                phase: "协议栈普及",
                userFocus: "填写域名发起请求",
                consciousnessLoad: 40,
                hiddenScale: 65,
                backgroundLayers: ["OS TCP/IP 栈", "本地 DNS 缓存"],
              },
              {
                phase: "日常隐形基础设施",
                userFocus: "只关心网页内容是否打开",
                consciousnessLoad: 8,
                hiddenScale: 96,
                backgroundLayers: ["根域名 DNS", "TLS 证书链"],
              },
            ],
            breakdown: {
              triggerLabel: "上游 DNS 失效",
              symptom: "页面中断并弹出 ERR_NAME_NOT_RESOLVED 报错。",
              exposedLayers: ["根域名 DNS"],
              takeaway: "一旦故障发生，隐入背景的设施立刻弹回意识焦点。",
            },
          },
        ]}
      />,
    );

    expect(screen.getByText("只关心网页内容是否打开")).toBeInTheDocument();
    expect(screen.getByText(/阶段 3\/3/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "1. 早期手摇配置" }));
    expect(screen.getByText("手动填写 IP 与端口")).toBeInTheDocument();

    const faultSwitch = screen.getByRole("switch", { name: /模拟底层故障/ });
    fireEvent.click(faultSwitch);

    expect(screen.getByText(/意识焦点区 · 故障显形/)).toBeInTheDocument();
    expect(screen.getByText(/ERR_NAME_NOT_RESOLVED/)).toBeInTheDocument();
    expect(screen.getByText(/隐入背景的设施立刻弹回意识焦点/)).toBeInTheDocument();
  });

  it("AttributionLab switches stress scenarios and renders pure qualitative comparison without scores", () => {
    render(
      <AttributionLab
        sharedDeliverable="支持限流的订单导出接口"
        scenarios={[
          {
            id: "release",
            label: "正常上线验收",
            context: "低并发测试环境一切绿色通过。",
            kpiInsight: "仅看表观产出无法区分可靠性依据与接管边界。",
          },
          {
            id: "incident",
            label: "深夜生产事故",
            context: "流量洪峰导致连接池耗尽。",
            kpiInsight: "事故瞬间暴露可接管边界差异。",
          },
        ]}
        profiles={[
          {
            id: "a",
            name: "方式 A",
            roleTag: "独立实现",
            methodSummary: "手写完整状态机。",
            reliabilityBasis: "逐行推演与边界自测",
            handoverBoundary: "对自写链路熟悉，跨模块对齐偏慢",
            fitScenario: "范围明确的核心模块",
            outputScore: 100,
            understandingScore: 95,
            verificationScore: 92,
            outcomesByScenario: {
              release: { status: "stable", headline: "A-稳态上线", detail: "按期发布" },
              incident: { status: "stable", headline: "A-5分钟止血", detail: "定位连接池" },
            },
          },
          {
            id: "b",
            name: "方式 B",
            roleTag: "AI 深度掌控",
            methodSummary: "先定契约再审验证。",
            reliabilityBasis: "接口契约与回归测试护栏",
            handoverBoundary: "整体可控，隐蔽分支仍需核对",
            fitScenario: "主力迭代业务",
            outputScore: 100,
            understandingScore: 90,
            verificationScore: 95,
            outcomesByScenario: {
              release: { status: "stable", headline: "B-高效上线", detail: "单测齐全" },
              incident: { status: "warn", headline: "B-核对链路后定位", detail: "借助监控接管" },
            },
          },
          {
            id: "c",
            name: "方式 C",
            roleTag: "黑盒交付",
            methodSummary: "直接复制整段生成代码。",
            reliabilityBasis: "仅依赖表层演示跑通",
            handoverBoundary: "异常时缺乏独立排障依据",
            fitScenario: "一次性低风险原型",
            outputScore: 100,
            understandingScore: 20,
            verificationScore: 15,
            outcomesByScenario: {
              release: { status: "stable", headline: "C-看似无异", detail: "最先提交 PR" },
              incident: { status: "risk", headline: "C-现场失控", detail: "无法解释并发锁语义" },
            },
          },
        ]}
      />,
    );

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
    expect(screen.queryByText("95%")).not.toBeInTheDocument();
    expect(screen.queryByText("20%")).not.toBeInTheDocument();
    expect(screen.queryByText("15%")).not.toBeInTheDocument();
    expect(screen.queryByText("当前场景的 KPI 评估盲区")).not.toBeInTheDocument();

    expect(screen.getAllByText("可靠性依据")).toHaveLength(3);
    expect(screen.getAllByText("接管边界")).toHaveLength(3);
    expect(screen.getAllByText("适用风险等级")).toHaveLength(3);
    expect(screen.getByText("逐行推演与边界自测")).toBeInTheDocument();
    expect(screen.getByText("整体可控，隐蔽分支仍需核对")).toBeInTheDocument();
    expect(screen.getByText("一次性低风险原型")).toBeInTheDocument();
    expect(screen.getByText("这一场景揭示了什么")).toBeInTheDocument();
    expect(screen.getByText("思想实验示意")).toBeInTheDocument();
    expect(screen.getByText("A-稳态上线")).toBeInTheDocument();
    expect(screen.getByText(/仅看表观产出无法区分可靠性依据与接管边界/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "深夜生产事故" }));

    expect(screen.getByText("需人工补位")).toBeInTheDocument();
    expect(screen.getByText("风险失控")).toBeInTheDocument();
    expect(screen.getByText("C-现场失控")).toBeInTheDocument();
    expect(screen.getByText(/无法解释并发锁语义/)).toBeInTheDocument();
    expect(screen.getByText(/事故瞬间暴露可接管边界差异/)).toBeInTheDocument();
  });

  it("AgentHarnessDemo toggles individual guardrails and bare/full presets cleanly", () => {
    render(
      <AgentHarnessDemo
        taskPrompt="自动修改生产库配置"
        guardrails={[
          {
            id: "schema",
            label: "Schema 校验",
            category: "Schema",
            defaultEnabled: true,
            stage: "parse",
            preventsRisk: "拦截畸形 JSON 参数",
            exposedRisk: "畸形字段导致解析错乱",
          },
          {
            id: "sandbox",
            label: "Sandbox 隔离",
            category: "Sandbox",
            defaultEnabled: false,
            stage: "execute",
            preventsRisk: "禁止直接读写宿主文件",
            exposedRisk: "幻觉 Shell 直接破坏宿主机",
          },
        ]}
      />,
    );

    expect(screen.getByText("已启用 1/2")).toBeInTheDocument();
    expect(screen.getByText(/幻觉 Shell 直接破坏宿主机/)).toBeInTheDocument();
    expect(screen.getByText(/拦截畸形 JSON 参数/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "全关（裸奔）" }));
    expect(screen.getByText("已启用 0/2")).toBeInTheDocument();
    expect(screen.getByText(/完全裸奔态/)).toBeInTheDocument();
    expect(screen.getByText(/畸形字段导致解析错乱/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "全开（生产护栏）" }));
    expect(screen.getByText("已启用 2/2")).toBeInTheDocument();
    expect(screen.getByText("0 处暴露缺口")).toBeInTheDocument();
    expect(screen.getByText(/禁止直接读写宿主文件/)).toBeInTheDocument();
  });

  it("ResilienceDemo toggles primary failure, reroutes multi-path backups, and supports keyboard recovery", () => {
    render(<ResilienceDemo />);

    const singlePanel = screen.getByTestId("single-path-panel");
    const multiPanel = screen.getByTestId("multi-path-panel");

    expect(singlePanel).toHaveAttribute("data-state", "healthy");
    expect(multiPanel).toHaveAttribute("data-active-route", "primary");
    expect(screen.getByText("正常通信")).toBeInTheDocument();
    expect(screen.getByText("正常通信（备用路径待命）")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "模拟主节点失效" }));
    expect(singlePanel).toHaveAttribute("data-state", "failed");
    expect(multiPanel).toHaveAttribute("data-active-route", "upper");
    expect(screen.getByText("关键节点失效，通信中断")).toBeInTheDocument();
    expect(screen.getByText("绕过故障节点，恢复通信")).toBeInTheDocument();

    const upperNode = screen.getByRole("button", { name: /多路径上备用节点/ });
    const lowerNode = screen.getByRole("button", { name: /多路径下备用节点/ });

    // 上备用也损坏后，主中继已坏 -> 自动切到下备用
    fireEvent.keyDown(upperNode, { key: "Enter" });
    expect(upperNode).toHaveAttribute("aria-pressed", "true");
    expect(multiPanel).toHaveAttribute("data-active-route", "lower");
    expect(screen.getByText("绕过故障节点，恢复通信")).toBeInTheDocument();

    // 下备用也损坏后，三条中继全部耗尽
    fireEvent.keyDown(lowerNode, { key: " " });
    expect(lowerNode).toHaveAttribute("aria-pressed", "true");
    expect(multiPanel).toHaveAttribute("data-active-route", "none");
    expect(screen.getByText("备用路径耗尽，通信中断")).toBeInTheDocument();

    // 一键恢复全部节点
    fireEvent.click(screen.getByRole("button", { name: "恢复全部节点" }));
    expect(singlePanel).toHaveAttribute("data-state", "healthy");
    expect(multiPanel).toHaveAttribute("data-active-route", "primary");
    expect(screen.getByRole("button", { name: "模拟主节点失效" })).toBeInTheDocument();
  });

  it("ResilienceDemo respects defaultFailed prop on initial render", () => {
    render(<ResilienceDemo defaultFailed />);

    expect(screen.getByTestId("single-path-panel")).toHaveAttribute(
      "data-state",
      "failed",
    );
    expect(screen.getByTestId("multi-path-panel")).toHaveAttribute(
      "data-active-route",
      "upper",
    );
    expect(screen.getByText("关键节点失效，通信中断")).toBeInTheDocument();
    expect(screen.getByText("绕过故障节点，恢复通信")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "恢复全部节点" })).toBeInTheDocument();
  });
});
