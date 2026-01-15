# React 组件传递模式详解

## 核心概念：渲染时机决定一切

### 关键问题：谁负责渲染？

```tsx
// 方式 1：直接调用（父组件负责渲染）
<Parent>
  <Child />  {/* Parent 调用 Child 的渲染函数 */}
</Parent>

// 方式 2：插槽传递（外部负责渲染）
<Parent children={<Child />} />  {/* 外部先渲染 Child，再传给 Parent */}
```

## 一、直接调用 vs 插槽传递

### 1.1 直接调用（Direct Call）

```tsx
// Parent.tsx
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <Child /> {/* 直接调用 */}
    </div>
  );
}

// Child.tsx
function Child() {
  console.log("Child 渲染");
  return <div>I am child</div>;
}
```

**执行流程**：

```
1. Parent 渲染
2. Parent 遇到 <Child />
3. Parent 调用 Child() 函数
4. Child 返回 JSX
5. Parent 把 Child 的结果插入到自己的 DOM 中
```

**关键特性**：

- ✅ Parent **控制** Child 的渲染时机
- ✅ Parent 状态变化时，Child **会重新渲染**
- ✅ Parent 可以传递 props 给 Child
- ❌ Child 的渲染**依赖** Parent

**示例**：点击按钮，Child 会重新渲染

```tsx
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <Child /> {/* 每次 count 变化，Child 都会重新渲染 */}
    </div>
  );
}
```

### 1.2 插槽传递（Slot Pattern / Children Prop）

```tsx
// Parent.tsx
function Parent({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      {children} {/* 只是展示，不负责渲染 */}
    </div>
  );
}

// 使用
function App() {
  return (
    <Parent>
      <Child /> {/* 在外部调用 */}
    </Parent>
  );
}
```

**执行流程**：

```
1. App 渲染
2. App 遇到 <Child />
3. App 调用 Child() 函数
4. Child 返回 JSX
5. App 把 Child 的结果作为 children prop 传给 Parent
6. Parent 渲染，把 children 放到指定位置
```

**关键特性**：

- ✅ Parent **不控制** Child 的渲染
- ✅ Parent 状态变化时，Child **不会重新渲染**
- ✅ Child 的渲染**独立于** Parent
- ✅ 性能更好（避免不必要的重渲染）

**示例**：点击按钮，Child 不会重新渲染

```tsx
function App() {
  return (
    <Parent>
      <Child /> {/* Child 只渲染一次 */}
    </Parent>
  );
}

function Parent({ children }) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      {children} {/* count 变化，children 不会重新渲染 */}
    </div>
  );
}
```

## 二、对比示例：性能差异

### 2.1 直接调用（性能差）

```tsx
function ExpensiveChild() {
  console.log("ExpensiveChild 渲染 - 很慢！");
  // 模拟昂贵的计算
  const result = Array.from({ length: 10000 }).map((_, i) => i * 2);
  return <div>Expensive Component</div>;
}

function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      <ExpensiveChild /> {/* ❌ 每次点击都重新渲染！*/}
    </div>
  );
}
```

**问题**：每次点击按钮，`ExpensiveChild` 都会重新渲染，即使它的内容没有变化。

### 2.2 插槽传递（性能好）

```tsx
function Parent({ children }) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count: {count}</button>
      {children} {/* ✅ 不会重新渲染！*/}
    </div>
  );
}

function App() {
  return (
    <Parent>
      <ExpensiveChild /> {/* 只渲染一次 */}
    </Parent>
  );
}
```

**优势**：`ExpensiveChild` 只在 `App` 渲染时执行一次，`Parent` 的状态变化不会影响它。

## 三、传递组件的所有方式

### 3.1 方式一：children prop（最常用）

```tsx
function Container({ children }: { children: React.ReactNode }) {
  return <div className="container">{children}</div>;
}

// 使用
<Container>
  <Header />
  <Content />
  <Footer />
</Container>;
```

**特点**：

- 最直观、最常用
- 支持多个子元素
- JSX 语法糖

### 3.2 方式二：具名插槽（Named Slots）

```tsx
interface LayoutProps {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  content: React.ReactNode;
  footer: React.ReactNode;
}

function Layout({ header, sidebar, content, footer }: LayoutProps) {
  return (
    <div className="layout">
      <header>{header}</header>
      <div className="main">
        <aside>{sidebar}</aside>
        <main>{content}</main>
      </div>
      <footer>{footer}</footer>
    </div>
  );
}

// 使用
<Layout
  header={<Header />}
  sidebar={<Sidebar />}
  content={<Content />}
  footer={<Footer />}
/>;
```

**特点**：

- 明确的插槽位置
- 类型安全
- 更灵活的布局控制

### 3.3 方式三：Render Props

```tsx
interface DataFetcherProps {
  render: (data: any, loading: boolean) => React.ReactNode;
}

function DataFetcher({ render }: DataFetcherProps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  return <>{render(data, loading)}</>;
}

// 使用
<DataFetcher
  render={(data, loading) =>
    loading ? <Spinner /> : <DataDisplay data={data} />
  }
/>;
```

**特点**：

- 可以传递数据给子组件
- 逻辑复用
- 更灵活的控制

### 3.4 方式四：函数作为 children（Function as Children）

```tsx
interface MouseTrackerProps {
  children: (position: { x: number; y: number }) => React.ReactNode;
}

function MouseTracker({ children }: MouseTrackerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  return (
    <div onMouseMove={(e) => setPosition({ x: e.clientX, y: e.clientY })}>
      {children(position)}
    </div>
  );
}

// 使用
<MouseTracker>
  {({ x, y }) => (
    <div>
      鼠标位置: {x}, {y}
    </div>
  )}
</MouseTracker>;
```

**特点**：

- Render Props 的变体
- 更简洁的语法
- 适合传递动态数据

### 3.5 方式五：组件作为 Props

```tsx
interface ButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

function Button({ icon: Icon, label }: ButtonProps) {
  return (
    <button>
      <Icon className="icon" />
      <span>{label}</span>
    </button>
  );
}

// 使用
<Button icon={SaveIcon} label="保存" />;
```

**特点**：

- 传递组件类型（不是实例）
- 父组件控制渲染时机
- 可以传递 props 给组件

### 3.6 方式六：React.cloneElement（高级）

```tsx
function Wrapper({ children }: { children: React.ReactElement }) {
  // 克隆子元素并注入额外的 props
  return React.cloneElement(children, {
    className: "injected-class",
    onClick: () => console.log("Clicked!"),
  });
}

// 使用
<Wrapper>
  <button>Click me</button> {/* 会被注入 className 和 onClick */}
</Wrapper>;
```

**特点**：

- 可以修改子组件的 props
- 适合包装器组件
- 需要谨慎使用

## 四、Next.js 中的应用

### 4.1 Layout 和 Page 的关系

```tsx
// app/layout.tsx (服务端组件)
export default function Layout({ children }) {
  return (
    <html>
      <body>
        <Header />
        <main>{children}</main> {/* 插槽 */}
        <Footer />
      </body>
    </html>
  );
}

// app/page.tsx (服务端组件)
export default async function Page() {
  const data = await fetchData(); // 在服务器获取数据
  return <div>{data}</div>;
}
```

**执行流程**：

```
服务器端：
1. Next.js 渲染 Page → 生成 HTML
2. 把 HTML 作为 children 传给 Layout
3. Layout 把 children 插入到 <main> 中
4. 返回完整的 HTML 给浏览器

浏览器端：
5. 接收 HTML，直接显示（快速首屏）
6. 加载 JavaScript，激活交互
```

### 4.2 Client Component 包裹 Server Component

```tsx
// Provider.tsx (客户端组件)
"use client";

export function Provider({ children }) {
  const [state, setState] = useState();

  return (
    <Context.Provider value={{ state, setState }}>
      {children} {/* children 可以是服务端组件！*/}
    </Context.Provider>
  );
}

// layout.tsx (服务端组件)
export default function Layout({ children }) {
  return (
    <Provider>
      {children} {/* 服务端渲染的页面 */}
    </Provider>
  );
}
```

**关键**：`Provider` 是客户端组件，但 `children` 依然是服务端渲染的！

## 五、实战对比

### 5.1 场景：主题切换器

#### ❌ 错误方式（直接调用）

```tsx
"use client";

function ThemeProvider() {
  const [theme, setTheme] = useState("light");

  return (
    <div data-theme={theme}>
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        切换主题
      </button>
      <BlogPost /> {/* ❌ 每次切换主题，BlogPost 都会重新渲染 */}
    </div>
  );
}
```

**问题**：

- `BlogPost` 可能很复杂（Markdown 渲染、代码高亮）
- 每次切换主题都重新渲染，性能差
- 如果 `BlogPost` 是服务端组件，会报错

#### ✅ 正确方式（插槽传递）

```tsx
"use client";

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  return (
    <div data-theme={theme}>
      <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        切换主题
      </button>
      {children} {/* ✅ 切换主题时，children 不会重新渲染 */}
    </div>
  );
}

// 使用
<ThemeProvider>
  <BlogPost /> {/* 可以是服务端组件，只渲染一次 */}
</ThemeProvider>;
```

**优势**：

- `BlogPost` 只渲染一次
- 性能好
- 支持服务端组件

### 5.2 场景：侧边栏布局

#### ❌ 错误方式

```tsx
"use client";

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div>
      <Sidebar isOpen={sidebarOpen} />
      <MainContent /> {/* ❌ 每次开关侧边栏，MainContent 都重新渲染 */}
    </div>
  );
}
```

#### ✅ 正确方式

```tsx
"use client";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div>
      <Sidebar isOpen={sidebarOpen} />
      {children} {/* ✅ 开关侧边栏不影响 children */}
    </div>
  );
}

// 使用
<Layout>
  <MainContent /> {/* 独立渲染 */}
</Layout>;
```

## 六、选择指南

### 何时使用直接调用？

```tsx
function Card() {
  return (
    <div className="card">
      <CardHeader /> {/* ✅ 简单的子组件 */}
      <CardBody /> {/* ✅ 不需要独立渲染 */}
      <CardFooter /> {/* ✅ 紧密耦合 */}
    </div>
  );
}
```

**适用场景**：

- 子组件很简单
- 子组件和父组件紧密耦合
- 不需要性能优化
- 不需要服务端渲染

### 何时使用插槽传递？

```tsx
function Layout({ children }) {
  return (
    <div className="layout">
      <Header />
      <main>{children}</main> {/* ✅ 复杂的页面内容 */}
      <Footer />
    </div>
  );
}
```

**适用场景**：

- 子组件很复杂（需要性能优化）
- 子组件需要独立渲染
- 需要支持服务端组件
- 布局和内容分离
- 需要组合不同的内容

## 七、总结表格

| 特性           | 直接调用           | 插槽传递       |
| -------------- | ------------------ | -------------- |
| **渲染控制**   | 父组件控制         | 外部控制       |
| **重渲染**     | 父组件变化时重渲染 | 不受父组件影响 |
| **性能**       | 可能有性能问题     | 性能更好       |
| **服务端组件** | 不支持混合         | 支持混合       |
| **灵活性**     | 较低               | 较高           |
| **适用场景**   | 简单子组件         | 复杂内容       |

## 八、记忆口诀

```
直接调用 = 父组件说了算
插槽传递 = 外部说了算

直接调用 = 一起渲染
插槽传递 = 各自渲染

直接调用 = 紧密耦合
插槽传递 = 松散耦合

直接调用 = 简单场景
插槽传递 = 复杂场景
```

## 九、实际项目中的应用

### 你的项目中的例子

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          {" "}
          {/* 客户端组件 */}
          <Header />
          <main>{children}</main> {/* 服务端组件可以穿透 */}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

// app/(admin)/admin/layout.tsx
export default function AdminLayout({ children }) {
  return (
    <SidebarProvider>
      {" "}
      {/* 客户端组件 */}
      <AdminSidebar />
      <main>{children}</main> {/* 页面内容 */}
    </SidebarProvider>
  );
}
```

**为什么这样设计？**

- `Providers` 和 `SidebarProvider` 是客户端组件（需要状态）
- `children`（页面内容）可以是服务端组件（SEO、性能）
- 通过插槽传递，实现了客户端和服务端的完美结合

这就是 Next.js App Router 的核心架构！
