/**
 * 示例测试文件 - React Testing Library
 *
 * 这是一个示例，展示如何使用 React Testing Library 测试组件。
 * 你可以删除这个文件，或者用它作为模板。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

// 示例：一个简单的按钮组件（实际测试中你会 import 真实的组件）
function ExampleButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return <button onClick={onClick}>{children}</button>;
}

describe("ExampleButton 组件", () => {
  it("应该正确渲染按钮文字", () => {
    render(<ExampleButton onClick={() => {}}>点击我</ExampleButton>);

    // 查找按钮元素
    const button = screen.getByRole("button", { name: "点击我" });

    // 断言按钮存在于文档中
    expect(button).toBeInTheDocument();
  });

  it("点击时应该触发 onClick 回调", async () => {
    // 创建一个 mock 函数来追踪调用
    const handleClick = vi.fn();

    // 创建 userEvent 实例（推荐方式）
    const user = userEvent.setup();

    render(<ExampleButton onClick={handleClick}>点击我</ExampleButton>);

    // 模拟用户点击
    await user.click(screen.getByRole("button"));

    // 断言回调被调用了一次
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

// 更多测试模式示例
describe("React Testing Library 常用模式", () => {
  it("使用 getByText 查找文本内容", () => {
    render(<div>Hello World</div>);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("使用 getByRole 查找可访问性角色（推荐）", () => {
    render(
      <nav>
        <a href="/home">首页</a>
      </nav>,
    );
    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute(
      "href",
      "/home",
    );
  });

  it("使用 getByTestId 作为最后手段", () => {
    render(<div data-testid="custom-element">内容</div>);
    expect(screen.getByTestId("custom-element")).toBeInTheDocument();
  });
});
