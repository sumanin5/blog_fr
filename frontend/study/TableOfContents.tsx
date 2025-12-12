/**
 * ========================================
 * 📋 目录组件（Table of Contents）
 * ========================================
 *
 * 【整体构建思路】
 * 这个组件是一个自动化的文档目录生成器，主要用于MDX/Markdown文档中。
 * 它通过以下流程工作：
 *
 * 1. 页面挂载时，自动扫描DOM中的所有标题元素（h1-h6）
 * 2. 为没有ID的标题自动生成唯一ID
 * 3. 构建标题列表，记录级别和位置
 * 4. 设置展开/折叠状态（只展开H1，其他默认折叠）
 * 5. 监听页面滚动，实时高亮当前可见的标题
 * 6. 用户点击目录项时平滑滚动到对应标题
 *
 * 【核心特性】
 * ✅ 自动识别标题：无需手动配置，自动扫描h1-h6
 * ✅ 智能展开/折叠：支持多级嵌套，递归检查父级展开状态
 * ✅ 实时高亮：显示当前滚动位置对应的标题
 * ✅ 平滑导航：点击目录项时平滑滚动到目标
 * ✅ 响应式设计：自适应移动端和桌面端
 * ✅ 无障碍支持：提供aria标签支持屏幕阅读器
 *
 * 【使用的外部组件】
 * - Sheet/SheetContent/SheetHeader/SheetTitle/SheetTrigger: Radix UI的抽屉组件
 * - ScrollArea: 可滚动区域组件（来自shadcn/ui）
 * - Button: 按钮组件（来自shadcn/ui）
 * - Menu/ChevronDown/ChevronRight: Lucide React图标库
 * - cn: 条件样式合并工具函数
 */

import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * 【HeadingItem 接口】
 * 用于表示一个标题项的数据结构
 *
 * @param id - 标题的唯一ID（自动生成或来自HTML属性）
 * @param text - 标题的文本内容
 * @param level - 标题级别（1-6，对应h1-h6）
 */
interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

/**
 * 【TableOfContentsProps 接口】
 * 组件的Props定义
 *
 * @param className - 自定义CSS类，用于覆盖默认样式
 */
interface TableOfContentsProps {
  className?: string;
}

/**
 * 【主组件】TableOfContents
 *
 * 这是一个完全自动化的目录生成组件，通过以下步骤实现：
 *
 * 【状态管理】
 * - headings: 存储所有提取的标题信息
 * - activeHeading: 当前滚动位置对应的标题ID
 * - isOpen: 侧边栏抽屉的打开/关闭状态
 * - expandedIds: 记录哪些标题的子列表已展开（Set数据结构）
 *
 * 【工作流程】
 * 1. componentDidMount → extractHeadings → 扫描DOM
 * 2. MutationObserver 监听DOM变化 → 内容更新时重新扫描
 * 3. IntersectionObserver 监听滚动 → 实时更新activeHeading
 * 4. 用户交互 → toggleExpand/handleHeadingClick
 */
export function TableOfContents({ className }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  /**
   * 【关键 Effect #1】extractHeadings 和 MutationObserver
   *
   * 【作用】
   * 自动扫描页面中的所有标题，为其生成ID，并建立标题列表。
   * 同时监听DOM变化，当页面内容更新时自动重新扫描。
   *
   * 【具体过程】
   * 1. 使用 querySelectorAll("h1, h2, h3, h4, h5, h6") 选择所有标题
   * 2. 遍历每个标题，提取文本内容和级别信息
   * 3. 为缺少ID的标题生成唯一ID（基于索引+文本内容）
   * 4. 首次初始化时，只展开H1级别的标题（设置expandedIds）
   * 5. 使用MutationObserver监听DOM结构变化，重新扫描
   *
   * 【ID生成策略】
   * 使用格式：heading-{index}-{清理后的文本}
   * 例如：heading-0-mdx-完整功能展示
   * 这样既能确保唯一性，又能保持可读性
   */
  useEffect(() => {
    let isInitialized = false;

    const extractHeadings = () => {
      // 📌 步骤1：选择所有标题元素
      const elements = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
      const headingList: HeadingItem[] = [];

      // 📌 步骤2：遍历每个标题元素
      elements.forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        const text = htmlElement.textContent?.trim() || "";
        const level = parseInt(htmlElement.tagName.charAt(1), 10);

        // 📌 步骤3：生成或获取ID
        let id = htmlElement.id;
        if (!id) {
          // 生成ID的逻辑：heading-{索引}-{清理文本}
          id = `heading-${index}-${text
            .toLowerCase()
            .replace(/[^\w\u4e00-\u9fff]/g, "") // 保留单词字符和中文
            .slice(0, 20)}`; // 限制长度
          htmlElement.id = id; // 将ID写回DOM
        }

        headingList.push({ id, text, level });
      });

      // 📌 步骤4：更新组件状态
      setHeadings(headingList);

      // 📌 步骤5：初始化展开状态（只在第一次执行）
      if (!isInitialized) {
        const defaultExpanded = new Set<string>();
        // 只展开H1级别的标题，其他默认折叠
        headingList.forEach((heading) => {
          if (heading.level === 1) {
            defaultExpanded.add(heading.id);
          }
        });
        setExpandedIds(defaultExpanded);
        isInitialized = true;
      }
    };

    // 初始扫描
    extractHeadings();

    // 📌 监听DOM变化，重新扫描
    // 这样当内容动态更新时，目录会自动更新
    const observer = new MutationObserver(() => {
      setTimeout(extractHeadings, 100); // 延迟100ms避免频繁更新
    });

    observer.observe(document.body, {
      childList: true, // 监听子元素增删
      subtree: true, // 监听整个子树
      attributes: false, // 不监听属性变化（避免死循环）
    });

    return () => observer.disconnect();
  }, []);

  /**
   * 【关键 Effect #2】IntersectionObserver - 实时监听滚动位置
   *
   * 【作用】
   * 监听页面滚动，检测当前哪个标题在用户的可见区域，
   * 以此高亮目录中对应的项。
   *
   * 【实现原理】
   * 使用浏览器的 IntersectionObserver API 监听每个标题元素
   * 是否进入可见区域（viewport）。当标题进入时，更新 activeHeading。
   *
   * 【配置参数说明】
   * - threshold: 0.1 表示元素露出10%时触发
   * - rootMargin: "-10% 0px -80% 0px" 表示：
   *   上边距缩小10%（提前触发）
   *   下边距缩小80%（延迟触发）
   *   这样可以确保高亮的是用户最关注的标题
   */
  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // 筛选出进入可见区域的元素
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // 取第一个可见的标题作为当前活跃标题
          setActiveHeading(visibleEntries[0].target.id);
        }
      },
      {
        threshold: 0.1, // 10% 的元素进入视口时触发
        rootMargin: "-10% 0px -80% 0px", // 调整触发区域
      },
    );

    // 为每个标题注册观察器
    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  /**
   * 【事件处理函数1】handleHeadingClick
   *
   * 【作用】
   * 当用户点击目录中的某个标题项时，平滑滚动到页面中对应的标题。
   *
   * 【执行步骤】
   * 1. 通过ID获取目标标题元素
   * 2. 调用 scrollIntoView 进行平滑滚动
   * 3. 关闭目录侧边栏（移动端友好）
   * 4. 更新浏览器URL的hash，支持分享和回退
   */
  const handleHeadingClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // 平滑滚动到目标位置
      element.scrollIntoView({
        behavior: "smooth", // 平滑滚动动画
        block: "start", // 目标定位到视口顶部
      });
      setIsOpen(false); // 关闭侧边栏
      // 更新URL hash，允许分享和直接链接
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  /**
   * 【事件处理函数2】toggleExpand
   *
   * 【作用】
   * 切换某个标题的展开/折叠状态。
   *
   * 【工作原理】
   * 使用 Set 数据结构存储已展开的标题ID。
   * - 如果ID在Set中，则删除它（折叠）
   * - 如果ID不在Set中，则添加它（展开）
   *
   * 这样设计的好处：
   * ✅ O(1) 的时间复杂度进行查找和修改
   * ✅ 自动去重，不会有重复ID
   * ✅ 易于检查某个标题是否展开
   */
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id); // 折叠
      } else {
        newSet.add(id); // 展开
      }
      return newSet;
    });
  };

  /**
   * 【核心算法】shouldShowHeading
   *
   * 【作用】
   * 判断某个标题是否应该在目录中显示。
   * 这个函数实现了递归的展开/折叠逻辑。
   *
   * 【算法原理】
   * H1级别：总是显示（所有标题的根节点）
   * H2+级别：只有当所有的父级标题都展开时，才显示
   *
   * 【具体步骤】
   * 1. 如果是H1，直接返回true（总是显示）
   * 2. 从当前标题向前遍历，找到直接父级（level = currentLevel - 1）
   * 3. 检查父级是否在expandedIds中
   *    - 如果父级未展开，返回false（隐藏）
   *    - 如果父级已展开，继续向上查找更高级的父级
   * 4. 重复步骤2-3，直到到达H1级别
   *
   * 【例子】
   * 假设有结构：
   *   H1 "文章标题"
   *   ├─ H2 "第一章"
   *   │  ├─ H3 "1.1 小节"
   *   │  └─ H3 "1.2 小节"
   *   └─ H2 "第二章"
   *
   * 初始状态：只展开H1
   * - "文章标题" 显示（H1总是显示）
   * - "第一章" 显示（父级H1已展开）
   * - "1.1 小节" 不显示（H2"第一章"未展开）
   * - "第二章" 显示（父级H1已展开）
   *
   * 用户点击"第一章"展开后：
   * - "1.1 小节" 和 "1.2 小节" 才会显示
   */
  const shouldShowHeading = (heading: HeadingItem, index: number) => {
    // H1 总是显示
    if (heading.level === 1) return true;

    // H2+ 需要检查所有父级是否展开
    let currentLevel = heading.level;

    // 从当前标题向前查找，检查所有父级
    for (let i = index - 1; i >= 0; i--) {
      const parent = headings[i];

      // 找到直接父级（level相差1）
      if (parent.level === currentLevel - 1) {
        // 如果父级没有展开，则不显示当前标题
        if (!expandedIds.has(parent.id)) {
          return false;
        }
        // 继续向上查找更高级的父级
        currentLevel = parent.level;

        // 如果已经到H1级别，且H1展开，则可以显示
        if (currentLevel === 1) {
          return true;
        }
      }
    }

    return false;
  };

  /**
   * 【辅助函数】hasChildren
   *
   * 【作用】
   * 检查某个标题是否有子标题（下一级别更高的标题）。
   * 如果有子标题，就需要在前面显示展开/折叠按钮。
   *
   * 【实现】
   * 检查当前标题后面的下一个标题，
   * 如果下一个标题的level更大，则说明有子标题。
   */
  const hasChildren = (heading: HeadingItem, index: number) => {
    if (index === headings.length - 1) return false; // 最后一个标题没有后续元素
    return headings[index + 1] && headings[index + 1].level > heading.level;
  };

  /**
   * 【提前返回】
   * 如果没有标题，不渲染任何内容
   */
  if (headings.length === 0) {
    return null;
  }

  /**
   * 【UI结构】
   * 使用 Radix UI 的 Sheet 组件构建抽屉式导航栏
   *
   * 【组件分层】
   * 1. Sheet + SheetTrigger: 主容器和触发按钮
   * 2. SheetContent: 侧边栏容器
   *    ├─ SheetHeader: 标题栏
   *    └─ 目录列表区域
   *       ├─ 统计信息
   *       └─ ScrollArea（可滚动列表）
   *          └─ 目录项（递归渲染）
   */
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* ==================== 触发按钮区域 ==================== */}
      {/*
        【SheetTrigger】
        显示一个固定位置的按钮，点击打开目录侧边栏。

        样式特点：
        - fixed: 固定在页面左上角
        - top-20: 距顶部80px（给导航栏留空间）
        - z-50: 高层级，保证在其他内容上方
        - backdrop-blur: 毛玻璃效果
        - hover:shadow-lg: 悬停时增大阴影
      */}
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "bg-background/95 fixed top-20 left-4 z-50 shadow-md backdrop-blur",
            "transition-all duration-200 hover:shadow-lg",
            "flex items-center gap-2",
            className,
          )}
        >
          <Menu className="h-4 w-4" />
          <span className="hidden sm:inline">目录</span>
          {/* 显示总标题数 */}
          <span className="bg-primary/10 text-primary ml-1 rounded px-1.5 py-0.5 text-xs">
            {headings.length}
          </span>
        </Button>
      </SheetTrigger>

      {/* ==================== 侧边栏内容区域 ==================== */}
      {/*
        【SheetContent】
        侧边栏的主容器，包含所有目录内容。
        aria-describedby 属性用于无障碍支持，指向下面的描述文本。
      */}
      <SheetContent
        side="left"
        className="w-[350px] sm:w-[400px]"
        aria-label="文档目录"
        aria-describedby="toc-description"
      >
        {/* 目录标题栏 */}
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Menu className="h-5 w-5" />
            文档目录
          </SheetTitle>
        </SheetHeader>

        {/* 目录内容区域（包含信息和列表） */}
        <div className="mt-6">
          {/* =============== 统计信息区域 =============== */}
          {/*
            显示：
            1. 共有多少个标题
            2. 当前显示了多少个标题（考虑折叠状态）
            3. 使用说明
          */}
          <div className="mb-4 border-b pb-3">
            <div className="text-muted-foreground flex items-center justify-between text-sm">
              <span>共 {headings.length} 个标题</span>
              <span>
                显示{" "}
                {
                  // 计算当前应该显示的标题数量
                  headings.filter((heading, index) =>
                    shouldShowHeading(heading, index),
                  ).length
                }{" "}
                个
              </span>
            </div>
            <p
              id="toc-description"
              className="text-muted-foreground mt-1 text-xs"
            >
              点击标题快速跳转，只有H1默认展开
            </p>
          </div>

          {/* =============== 目录列表区域 =============== */}
          {/*
            使用 ScrollArea 组件包裹目录列表，
            提供优雅的滚动条样式。高度设置为 calc(100vh-12rem)
            以适应不同屏幕高度。
          */}
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-1">
              {/* ========== 目录项渲染循环 ========== */}
              {/*
                这是整个组件的核心渲染逻辑：

                【流程】
                1. 遍历 headings 数组
                2. 对每个标题，检查是否应该显示（shouldShowHeading）
                3. 不应该显示的标题跳过（return null）
                4. 应该显示的标题渲染为目录项

                【每个目录项包含】
                - 展开/折叠按钮（如果有子标题）
                - 标题文本（可点击，点击时跳转到页面中对应位置）
                - 样式：当前滚动位置对应的标题会高亮
              */}
              {headings.map((heading, index) => {
                // 第一步：检查是否应该显示
                if (!shouldShowHeading(heading, index)) return null;

                // 第二步：计算样式相关数据
                const isActive = activeHeading === heading.id;
                const hasChildHeadings = hasChildren(heading, index);
                const isExpanded = expandedIds.has(heading.id);
                // 根据标题级别计算左边距（每级增加16px）
                const paddingLeft = (heading.level - 1) * 16 + 8;

                // 第三步：渲染目录项
                return (
                  <div
                    key={heading.id}
                    className={cn(
                      // 基础样式：灰色背景，圆角，padding，过渡动画
                      "group hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      // 当前活跃标题的样式：强调背景色和加粗文字
                      isActive &&
                        "bg-accent text-accent-foreground font-medium",
                    )}
                    style={{ paddingLeft: `${paddingLeft}px` }} // 动态缩进
                  >
                    {/* ========== 展开/折叠按钮 ========== */}
                    {/*
                      只有在标题有子标题时才显示此按钮。

                      【功能】
                      - 点击时调用 toggleExpand 切换展开状态
                      - 向下箭头表示"已展开"
                      - 向右箭头表示"已折叠"

                      【事件处理】
                      - e.preventDefault(): 防止事件冒泡到文本按钮
                      - e.stopPropagation(): 停止事件传播
                      - aria-label: 为屏幕阅读器提供语义信息
                    */}
                    {hasChildHeadings && (
                      <button
                        type="button"
                        className="hover:bg-accent flex h-4 w-4 flex-shrink-0 items-center justify-center rounded p-0 opacity-60 transition-opacity hover:opacity-100"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleExpand(heading.id);
                        }}
                        aria-label={isExpanded ? "折叠" : "展开"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </button>
                    )}

                    {/* ========== 标题文本按钮 ========== */}
                    {/*
                      可点击的标题文本。

                      【功能】
                      - 点击时调用 handleHeadingClick，平滑滚动到页面对应位置
                      - 文本长度过长时显示省略号（truncate）
                      - title 属性显示完整文本（悬停时）

                      【样式】
                      - flex-1: 占据剩余空间
                      - text-left: 左对齐
                      - hover:text-foreground: 悬停时改变文字颜色
                    */}
                    <button
                      type="button"
                      onClick={() => handleHeadingClick(heading.id)}
                      className="hover:text-foreground flex-1 truncate text-left transition-colors"
                      title={heading.text}
                    >
                      {heading.text}
                    </button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
