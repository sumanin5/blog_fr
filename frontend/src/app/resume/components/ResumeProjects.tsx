"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

/* ── 全栈项目数据 ── */

const webProjects = [
  {
    id: "blog-fr",
    name: "Blog FR",
    fullName: "全栈内容管理系统",
    url: "https://github.com/sumanin5/blog_fr",
    stack: ["FastAPI", "Next.js 16", "React 19", "PostgreSQL 17", "Docker", "CI/CD"],
    summary: "从零架构并独立交付的生产级全栈博客平台",
    highlights: [
      { title: "🏗️ DI 容器", desc: "两层依赖注入容器（即时初始化 + 懒加载单例），管理 10+ 组件，一行代码替换 Mock" },
      { title: "🔄 Git 同步引擎", desc: "Pipeline 模式 + 智能匹配 + 并发 hash 增量同步，数百篇文章秒级双向同步" },
      { title: "🔒 全链路类型安全", desc: "OpenAPI → hey-api 自动生成 TypeScript SDK，编译期捕获接口变更" },
      { title: "⚡ SSR/CSR 混合", desc: "内容页 SSR 优化 SEO，管理后台 CSR 保障交互体验" },
      { title: "📊 自研分析系统", desc: "ip2region + user-agents，零第三方依赖，覆盖 PV/UV/地域/设备" },
      { title: "🚀 DevOps 流水线", desc: "多阶段 Docker → Actions → ACR → ECS 全自动，覆盖率 70%+" },
    ],
  },
  {
    id: "blog-root",
    name: "Blog Root",
    fullName: "高内聚业务平台",
    url: "https://github.com/sumanin5/blog_root",
    stack: ["Django", "Vue", "PostgreSQL", "Nginx", "Linux"],
    summary: "重后端轻前端的业务管理平台，强调数据安全与查询性能",
    highlights: [
      { title: "🖥️ 全栈部署", desc: "Nginx + Gunicorn 多 Worker 进程模型" },
      { title: "🔐 定制化鉴权", desc: "Session ID 细粒度权限控制，替代通用 JWT" },
      { title: "⚡ 查询优化", desc: "select_related / prefetch_related 消除 N+1" },
    ],
  },
];

/* ── C++ 项目数据（详细展开） ── */

const cppProjects = [
  {
    id: "ministl",
    name: "Ministl",
    fullName: "Ministl 标准库扩展",
    stack: ["C++11/17", "模板元编程", "RAII", "智能指针"],
    summary: "从零实现 STL 核心组件，深入理解标准库底层设计",
    sections: [
      {
        title: "Allocator 内存分配器",
        points: [
          "实现 std::allocator 接口：allocate / deallocate / construct / destroy 四个核心方法",
          "allocate 底层调用 ::operator new 分配原始内存，不调用构造函数",
          "construct 使用 placement new 在已分配内存上调用构造函数，实现内存分配与对象构造的分离",
          "rebind 机制：容器内部节点类型与用户类型不同（如 list<int> 内部需要分配 Node<int>），通过 rebind<U>::other 获取新类型的分配器",
          "有状态 vs 无状态分配器：默认 std::allocator 是无状态的，自定义分配器可以持有内存池引用",
        ],
      },
      {
        title: "Iterator 迭代器体系",
        points: [
          "五种迭代器类别：InputIterator → ForwardIterator → BidirectionalIterator → RandomAccessIterator → ContiguousIterator",
          "iterator_traits 萃取机制：通过模板特化提取 value_type / difference_type / pointer / reference / iterator_category",
          "对原生指针的偏特化：T* 和 const T* 也能被 iterator_traits 正确识别",
          "advance / distance 根据迭代器类别自动选择 O(1) 或 O(n) 实现（tag dispatch）",
        ],
      },
      {
        title: "智能指针 shared_ptr / weak_ptr",
        points: [
          "shared_ptr 核心：控制块（control block）持有强引用计数 + 弱引用计数 + 原始指针 + deleter",
          "引用计数的线程安全：计数器使用 std::atomic<int>，保证多线程下 ++ / -- 的原子性",
          "weak_ptr 解决循环引用：两个对象互相持有 shared_ptr 导致引用计数永远不为 0，weak_ptr 不增加强引用计数",
          "lock() 方法：weak_ptr.lock() 返回 shared_ptr，如果对象已销毁则返回空 shared_ptr（线程安全的提升操作）",
          "make_shared 优化：一次分配同时创建对象和控制块，减少内存碎片，提升 cache 局部性",
          "enable_shared_from_this：对象内部获取自身的 shared_ptr，避免从 this 构造导致双重释放",
        ],
      },
    ],
  },
  {
    id: "mempool",
    name: "内存池",
    fullName: "高性能内存池",
    stack: ["C++11", "RAII", "mutex", "condition_variable"],
    summary: "基于现代 C++ 实现线程安全的内存池，优化高频分配/回收场景",
    sections: [
      {
        title: "核心设计",
        points: [
          "预分配大块内存（chunk），切分为固定大小的 block，维护空闲链表（free list）",
          "分配 O(1)：从空闲链表头部取出一个 block；回收 O(1)：归还到链表头部",
          "对比 malloc：malloc 每次调用涉及系统调用（brk/mmap），内存池避免频繁系统调用开销",
          "chunk 扩容策略：当空闲链表耗尽时，分配新的 chunk 并链接到 chunk 链表",
        ],
      },
      {
        title: "RAII 资源管理",
        points: [
          "RAII 核心思想：资源的生命周期绑定到对象的生命周期，构造时获取，析构时释放",
          "内存池析构函数负责释放所有 chunk，即使用户忘记归还 block 也不会泄漏底层内存",
          "使用 std::unique_ptr<char[]> 管理 chunk 内存，确保异常安全",
          "禁用拷贝构造和拷贝赋值（= delete），防止浅拷贝导致 double free",
        ],
      },
      {
        title: "线程安全",
        points: [
          "std::mutex 保护空闲链表的并发访问，allocate 和 deallocate 都需要加锁",
          "std::lock_guard<std::mutex> 自动管理锁的生命周期（也是 RAII）",
          "std::condition_variable 实现等待/通知：当空闲链表为空时，分配线程阻塞等待；回收线程归还后 notify_one 唤醒",
          "避免虚假唤醒（spurious wakeup）：wait 使用 lambda 谓词 while 循环检查条件",
        ],
      },
    ],
  },
  {
    id: "threadpool",
    name: "线程池",
    fullName: "高效线程池管理系统",
    stack: ["C++11", "std::thread", "std::future", "任务队列"],
    summary: "消除线程频繁创建/销毁开销，提升多线程任务处理能力",
    sections: [
      {
        title: "架构设计",
        points: [
          "核心组件：任务队列（thread-safe queue）+ 工作线程数组（worker threads）+ 停止标志（atomic<bool>）",
          "工作线程启动后进入无限循环：从队列取任务 → 执行 → 继续取，直到收到停止信号",
          "线程数量通常设为 std::thread::hardware_concurrency()，匹配 CPU 核心数",
          "对比每次 new thread：线程创建涉及内核调度、栈空间分配（默认 1-8MB），开销远大于从队列取任务",
        ],
      },
      {
        title: "任务队列与同步",
        points: [
          "std::queue + std::mutex + std::condition_variable 组成线程安全队列",
          "生产者（提交任务）：加锁 → push → unlock → notify_one",
          "消费者（工作线程）：wait(lock, predicate) → pop → unlock → 执行任务",
          "优雅关闭：设置 stop = true → notify_all 唤醒所有等待线程 → join 等待所有线程结束",
        ],
      },
      {
        title: "任务提交与返回值",
        points: [
          "submit 方法接受任意可调用对象：使用 std::function<void()> 类型擦除 + std::bind / lambda 包装",
          "std::packaged_task<R()> 包装任务，关联 std::future<R> 获取异步返回值",
          "std::future::get() 阻塞等待结果，实现「提交任务 → 继续做其他事 → 需要时取结果」的异步模式",
          "完美转发：submit 使用 template + std::forward 保持参数的左值/右值属性",
        ],
      },
    ],
  },
];

export function ResumeProjects() {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">项目经历</h2>

      {/* ── 全栈项目 ── */}
      <Tabs defaultValue="blog-fr">
        <TabsList className="w-full justify-start">
          {webProjects.map((p) => (
            <TabsTrigger key={p.id} value={p.id}>
              {p.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {webProjects.map((p) => (
          <TabsContent key={p.id} value={p.id}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-lg">
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline underline-offset-4 inline-flex items-center gap-1.5"
                        >
                          {p.fullName}
                          <span className="text-muted-foreground text-sm">↗</span>
                        </a>
                      </CardTitle>
                      <CardDescription className="mt-1">{p.summary}</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {p.stack.map((t) => (
                      <Badge key={t} variant="outline" className="text-xs font-normal">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {p.highlights.map((h) => (
                      <div
                        key={h.title}
                        className="group rounded-lg border p-3 transition-colors hover:border-primary/30 hover:bg-muted/50"
                      >
                        <p className="text-sm font-medium">{h.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                          {h.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>

      {/* ── C++ 底层项目（详细展开） ── */}
      <div className="space-y-4 pt-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">C++ 底层项目系列</h3>
          <p className="text-sm text-muted-foreground mt-1">
            从零实现 STL 核心组件、内存池与线程池，深入理解 C++ 底层机制
          </p>
        </div>

        <Tabs defaultValue="ministl">
          <TabsList className="w-full justify-start">
            {cppProjects.map((p) => (
              <TabsTrigger key={p.id} value={p.id}>
                {p.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {cppProjects.map((p) => (
            <TabsContent key={p.id} value={p.id}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <div>
                      <CardTitle className="text-lg">{p.fullName}</CardTitle>
                      <CardDescription className="mt-1">{p.summary}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {p.stack.map((t) => (
                        <Badge key={t} variant="outline" className="text-xs font-normal">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {p.sections.map((sec, si) => (
                      <motion.div
                        key={sec.title}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: si * 0.08 }}
                      >
                        {si > 0 && <Separator className="mb-5" />}
                        <div className="space-y-3">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/60" />
                            {sec.title}
                          </p>
                          <ul className="space-y-2 pl-4">
                            {sec.points.map((pt) => (
                              <li
                                key={pt}
                                className="text-xs text-muted-foreground leading-relaxed flex gap-2"
                              >
                                <span className="text-primary/40 shrink-0 mt-0.5">›</span>
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
