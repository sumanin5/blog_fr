import { Metadata } from "next";
import { ResumeHeader } from "./_components/ResumeHeader";
import { ResumeSection } from "./_components/ResumeSection";
import { SkillBadgeGroup } from "./_components/SkillBadgeGroup";
import { ProjectCard } from "./_components/ProjectCard";
import { TocNav } from "./_components/TocNav";
import { Separator } from "@/components/ui/separator";
import {
  BrainCircuit,
  Code,
  Briefcase,
  GraduationCap,
  Flame,
} from "lucide-react";

export const metadata: Metadata = {
  title: "田毅的在线简历 | Full-Stack Engineer",
  description:
    "全栈开发工程师的个人在线简历。擅长 AI Agent 工具链、前后端工程化落地与大模型演化理论。",
};

export default function ResumePage() {
  return (
    <div className="container max-w-6xl py-12 md:py-20 lg:grid lg:grid-cols-[200px_1fr] lg:gap-12 xl:gap-20 print:block print:max-w-full print:p-0 print:m-0 print:bg-white print:text-black">
      {/* PC 端侧边栏锚点导航 */}
      <TocNav />

      {/* 简历正文区 */}
      <main className="min-w-0 print:min-w-[1024px] space-y-10 print:space-y-6">
        <ResumeHeader />

        {/* SECTION 2: 核心竞争力 */}
        <ResumeSection
          id="core-competence"
          title="核心竞争力"
          icon={<BrainCircuit className="w-5 h-5" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
            {[
              {
                title: "强大的自驱学习与技术探索欲",
                desc: "具备极其强大的自学能力和强烈的探索欲，十分热衷于对新技术的学习，以及对其底层运转原理和事物本质的深度研究。",
              },
              {
                title: "AI Agent 工具链与人机协同编程",
                desc: "十分熟练掌握各类 AI Agent 工具及其丰富的开发技巧。具备极强的代码审美与人机交互范式认知，对复杂问题拥有深刻的理解能力，能够熟练且精准地结合当前项目上下文，提出最合适、最核心的问题，从而引导 AI 生成健壮的生产级代码。",
              },
              {
                title: "机器学习与深度学习算法原理积淀",
                desc: "对各类算法模型十分熟悉。从最基础的感知机、支持向量机 (SVM) 以及各种集成学习算法，再到深度学习领域的 MLP、CNN、RNN 以及 Transformer 架构，均对其底层数学原理、推导逻辑和具体的适用场景有着极其深刻的认识。",
              },
              {
                title: "业务工程化能力与务实架构决策",
                desc: "拥有极强的业务工程化落地能力。深知软件开发领域“没有银弹”的理论规律，在系统设计时能够跳脱出单纯的工具使用主义，根据具体的业务场景、团队现状与项目瓶颈来灵活选择最合适的工具与架构方案。",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="group relative flex gap-4 rounded-lg border bg-background p-5 hover:border-primary/50 hover:bg-muted/20 transition-all print:border-gray-300 print:shadow-none print:break-inside-avoid"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  <Flame className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold tracking-tight">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ResumeSection>

        {/* SECTION 3: 技术栈 */}
        <ResumeSection
          id="tech-stack"
          title="技术栈"
          icon={<Code className="w-5 h-5" />}
        >
          <SkillBadgeGroup
            groups={[
              {
                category: "编程语言",
                skills: [
                  { name: "Python", level: "master" },
                  { name: "TypeScript", level: "master" },
                  { name: "现代 C++", level: "master" },
                  { name: "Rust", level: "proficient" },
                  { name: "Java", level: "proficient" },
                  { name: "Go", level: "proficient" },
                ],
              },
              {
                category: "后端框架",
                skills: [
                  { name: "FastAPI", level: "master" },
                  { name: "Django", level: "master" },
                ],
                description:
                  "熟练掌握 Python Web 生态中 FastAPI 与 Django 的基本原理，熟悉后端开发中的工程化范式与基本流程。",
              },
              {
                category: "前端框架",
                skills: [
                  { name: "React", level: "master" },
                  { name: "Next.js", level: "master" },
                  { name: "Vue", level: "master" },
                ],
                description:
                  "熟悉 React、Vue 的渲染原理与性能优化手段；熟悉服务端渲染 (SSR) 的基本原理和使用场景，熟练掌握 Next.js App Router 的开发模式。",
              },
              {
                category: "部署与基建",
                skills: [
                  { name: "Docker", level: "expert" },
                  { name: "GitHub Actions", level: "expert" },
                  { name: "Nginx", level: "expert" },
                  { name: "Caddy", level: "expert" },
                ],
                description:
                  "深入理解 Docker 的多阶段构建原理；熟练使用 GitHub Actions 构建 CI/CD 流水线；熟悉 Nginx 和 Caddy 的核心原理与服务配置。",
              },
              {
                category: "编程范式",
                skills: [
                  { name: "FP (函数式编程)", level: "master" },
                  { name: "OOP (面向对象)", level: "master" },
                ],
                description:
                  "精通函数式编程与面向对象编程理念，能够在复杂的业务开发中合理抽象与解耦。",
              },
            ]}
          />
        </ResumeSection>

        {/* SECTION 4: 项目经历 */}
        <ResumeSection
          id="project-experience"
          title="项目经历"
          icon={<Briefcase className="w-5 h-5" />}
        >
          <div className="space-y-12">
            <ProjectCard
              title="全栈内容管理系统 — Blog FR"
              subtitle="基于 vibe coding 独立开发"
              githubUrl="https://github.com/sumanin5/blog_fr"
              techStack={[
                "FastAPI",
                "Next.js",
                "React 19",
                "PostgreSQL 17",
                "Docker",
                "GitHub Actions",
              ]}
              quote="通过该项目深刻体悟到，状态管理是软件开发之魂，良好的状态控制是优秀项目最重要的前提；坚守单向数据流动是避免业务耦合与循环导入的先决条件；而合理的系统模块划分则是编写高质量单元测试的必备基础。"
              highlights={[
                {
                  title: "整洁架构与测试驱动 (TDD)",
                  description:
                    "严格遵循整洁架构，保证数据单向流动，坚决杜绝“面条代码”。采用测试驱动思想，编写大量模块化单元与集成测试（核心覆盖率 80%+），为系统级别的无痛重构提供绝对信心。",
                },
                {
                  title: "端到端类型安全与全局异常处理",
                  description:
                    "构建极其规范的 OpenAPI 接口文档，配合前端 hey-api 自动生成全链路 Client SDK，彻底杜绝前端 interface any；后端积极采用 Pydantic 进行全量数据校验，并设计了全局标准化的错误响应格式，基本杜绝非预期 500 报错，向前端稳定输出友好的业务异常。",
                },
                {
                  title: "现代前端状态与渲染架构",
                  description:
                    "拥抱 Next.js App Router 实现服务端渲染 (SSR) 以优化 SEO 与首屏加载。实施精细化数据获取：服务端组件走 fetch 与 Next.js Cache，客户端组件直连 TanStack Query，均通过 SDK 解耦硬编码，架构灵活性拉满。",
                },
                {
                  title: "极致的 UI 渲染与表单交互",
                  description:
                    "采用 Tailwind CSS + shadcn-ui 构建高定制化视觉体系，结合 next-theme 实现丝滑主题切换；表单交互引入 React 19 最新 Server Actions 机制；对于庞大的数据表格采用 TanStack Table + shadcn 方案，实现媲美 Ant Design 的高速长列表渲染与交互。",
                },
                {
                  title: "多引擎 MD/MDX 渲染支持",
                  description:
                    "深度集成 Markdown 与 MDX 格式渲染底层，原生适配代码高亮、KaTeX 数学公式与 Mermaid 流程图；巧妙利用 YML 元数据实现后端预渲染与前端 SSR/CSR 混合解析引擎的多重调配体验。",
                },
                {
                  title: "GitOps 工作流与自动化 DevOps",
                  description:
                    "以 GitHub Webhooks 为核心研发了 GitOps 同步模块，完美支持本地 VSCode 沉浸创作、一键同步云端；全程采用 Docker 容器化管理，打通 GitHub Actions 自动化 CI/CD 流水线，构建镜像直推阿里云 ACR（优化网络加速），并自动部署至阿里云轻量服务器 (ECS)，极致提效研发闭环。",
                },
              ]}
            />

            <Separator className="print:hidden" />

            <ProjectCard
              title="AI 演化体系与底层哲学深度拆解 — 基于《The Bitter Lesson》"
              demoUrl="https://ty1547.com/posts/ideas/grand-narrative-of-ai-bitter-lesson-p29jer"
              tags={[
                "AI 演化史",
                "Scaling Law",
                "第一性原理",
                "跨学科技术哲学",
              ]}
              techStack={[]}
              quote="算力时代最大的教训，是不再试图将“人类自以为的思考方式”硬编码给机器；当褪去人为设计的“归纳偏置”（如 CNN 的局部性、GAN 的博弈），彻底拥抱“通用搜索与学习”，智能才会在算力洪流中涌现。正如《庄子》所言——“无以人灭天”。"
              highlights={[
                {
                  title: "打破“拟人认知”的思维重塑",
                  description:
                    "通过深度研释 Richard Sutton 的名篇，摒弃了以“人类经验微操”为主导的传统开发执念；深刻领悟了“通用算力终将战胜先验知识”的规律，洞穿了 Scaling Law 驱动模型跃迁的第一性原理。",
                },
                {
                  title: "大模型架构演化史的降维透视",
                  description:
                    "独立撰写数万字研究长文，全景解构 AI 七十年演进的技术宿命。透彻解析了从特征工程到深度学习，再到大模型架构变迁背后“不断戒断人工干预、向算力彻底放权”的核心脉络。",
                },
                {
                  title: "跨学科的极简工程哲学",
                  description:
                    "系统性地将传统东方哲思与前沿的 AI 演化基准深度架构融合；这种极客探索不仅重塑了认知，更在工程实践上培养了摒弃过度设计、坚持“通用与可扩展性至上”的大局观。",
                },
              ]}
            />

            <Separator className="print:hidden" />

            <ProjectCard
              title="高内聚业务平台 — Blog Root"
              subtitle="重后端轻前端的业务管理平台，强调数据安全与查询性能"
              githubUrl="https://github.com/sumanin5/blog_root"
              techStack={["Django", "Vue", "PostgreSQL", "Nginx", "Linux"]}
              highlights={[
                {
                  title: "架构设计与部署",
                  description:
                    "在 Linux 环境下主导全栈部署，Nginx 反向代理 + Gunicorn 多 Worker 进程模型，Django 后端承载核心业务逻辑。部署了稳定运行的生产环境，实现了前后端职责的清晰分离。",
                },
                {
                  title: "定制化安全鉴权",
                  description:
                    "基于 Session ID 设计定制化鉴权机制，实现细粒度权限控制与会话管理，替代通用 JWT 方案以适配业务安全需求。满足了高安全等级要求，且会话生命周期严格可控。",
                },
                {
                  title: "数据库查询优化",
                  description:
                    "针对复杂业务查询进行 SQL 分析与索引优化，利用 Django ORM 的 select_related / prefetch_related 彻底消除 N+1 问题。核心查询响应时间显著降低，服务器数据库负载大幅下降。",
                },
              ]}
            />
          </div>
        </ResumeSection>

        {/* SECTION 5: 工作经历 */}
        <ResumeSection
          id="work-experience"
          title="工作经历"
          icon={<Briefcase className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between md:items-center">
              <div>
                <h3 className="text-xl font-bold">华南物资集团 · 券商</h3>
                <p className="text-muted-foreground font-medium text-sm mt-1">
                  数据分析师 / 量化研究员
                </p>
              </div>
            </div>
            <ul className="list-disc list-inside space-y-2 text-sm text-foreground/90 pl-1 marker:text-muted-foreground leading-relaxed">
              <li>
                运用数理统计与 Python 编程构建预测模型，为业务决策提供数据支撑
              </li>
              <li>
                设计并回测量化交易策略，涉及时间序列分析、因子建模与风险控制
              </li>
              <li>
                跨学科背景（金融 + 工程）使其能快速理解业务场景并转化为技术方案
              </li>
            </ul>
          </div>
        </ResumeSection>

        {/* SECTION 6: 教育背景 */}
        <ResumeSection
          id="education"
          title="教育背景"
          icon={<GraduationCap className="w-5 h-5" />}
        >
          <div className="rounded-md border overflow-hidden print:border-black">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b print:bg-transparent print:border-black">
                <tr>
                  <th className="px-4 py-3 font-semibold text-left">学历</th>
                  <th className="px-4 py-3 font-semibold text-left">院校</th>
                  <th className="px-4 py-3 font-semibold text-left hidden sm:table-cell">
                    专业
                  </th>
                  <th className="px-4 py-3 font-semibold text-left hidden md:table-cell">
                    时间
                  </th>
                  <th className="px-4 py-3 font-semibold text-left">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y print:divide-black">
                <tr className="bg-background hover:bg-muted/20 transition-colors print:bg-transparent">
                  <td className="px-4 py-3 font-medium">硕士</td>
                  <td className="px-4 py-3 font-medium text-primary">
                    浙江工商大学
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">金融学</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                    2020.9 — 2023.6
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    数理统计、量化建模、风险管理
                  </td>
                </tr>
                <tr className="bg-background hover:bg-muted/20 transition-colors print:bg-transparent">
                  <td className="px-4 py-3 font-medium">本科</td>
                  <td className="px-4 py-3 font-medium text-primary">
                    武汉理工大学
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    化学工程与工艺
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell whitespace-nowrap">
                    2015.9 — 2019.6
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    工程思维、数理基础、实验方法论
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ResumeSection>
      </main>
    </div>
  );
}
