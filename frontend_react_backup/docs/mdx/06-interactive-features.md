# MDX 交互式功能与酷炫效果

MDX 的强大之处在于可以在文档中嵌入任何 React 组件，实现丰富的交互效果。

## 基础交互

### 1. 状态管理

在 MDX 中使用 React Hooks：

```mdx
export const Counter = () => {
  const [count, setCount] = useState(0);
  return (
    <div className="flex items-center gap-4">
      <Button onClick={() => setCount((c) => c - 1)}>-</Button>
      <span className="text-2xl font-bold">{count}</span>
      <Button onClick={() => setCount((c) => c + 1)}>+</Button>
    </div>
  );
};

# 计数器示例

<Counter />
```

### 2. 表单交互

```tsx
// 预置组件
export function ContactForm() {
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <Alert>感谢 {name}，表单已提交！</Alert>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="你的名字"
        className="rounded border p-2"
      />
      <Button type="submit">提交</Button>
    </form>
  );
}
```

MDX 中使用：

```mdx
## 联系我们

<ContactForm />
```

### 3. 切换/折叠

```tsx
export function Collapsible({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-4 rounded-lg border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full justify-between p-4 text-left font-bold"
      >
        {title}
        <span>{open ? "▼" : "▶"}</span>
      </button>
      {open && <div className="border-t p-4">{children}</div>}
    </div>
  );
}
```

```mdx
<Collapsible title="点击展开详情">
  这里是隐藏的内容，点击标题可以展开/折叠。
</Collapsible>
```

## 数据可视化

### 1. 图表组件

使用 Recharts 或 Chart.js：

```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

export function StockChart({ data }) {
  return (
    <LineChart width={600} height={300} data={data}>
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="price" stroke="#8884d8" />
    </LineChart>
  );
}
```

```mdx
## 股票走势

<StockChart
  data={[
    { date: "1月", price: 100 },
    { date: "2月", price: 120 },
    { date: "3月", price: 115 },
  ]}
/>
```

### 2. 进度指示器

```tsx
export function Progress({ value, max = 100 }) {
  const percentage = (value / max) * 100;

  return (
    <div className="my-4 h-4 w-full rounded-full bg-gray-200">
      <div
        className="bg-primary h-4 rounded-full transition-all duration-500"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
```

```mdx
## 项目进度

<Progress value={75} />

已完成 75%！
```

## 代码演示

### 1. 可运行的代码块

```tsx
export function CodePlayground({ code: initialCode }) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState("");

  const runCode = () => {
    try {
      // 使用 Function 构造器执行代码（注意安全性）
      const result = new Function(code)();
      setOutput(String(result));
    } catch (err) {
      setOutput(`Error: ${err.message}`);
    }
  };

  return (
    <div className="my-4 rounded-lg border">
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="w-full bg-gray-900 p-4 font-mono text-white"
        rows={5}
      />
      <div className="flex justify-between bg-gray-100 p-2">
        <Button onClick={runCode}>运行</Button>
        <pre className="text-sm">{output}</pre>
      </div>
    </div>
  );
}
```

```mdx
## 试试 JavaScript

<CodePlayground code="return 1 + 1" />
```

### 2. 实时预览组件

```tsx
export function LivePreview({ code: initialCode }) {
  const [code, setCode] = useState(initialCode);

  return (
    <div className="my-4 grid grid-cols-2 gap-4">
      <div>
        <div className="mb-2 text-sm font-bold">代码</div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="h-40 w-full rounded border p-2 font-mono"
        />
      </div>
      <div>
        <div className="mb-2 text-sm font-bold">预览</div>
        <div
          className="h-40 rounded border p-2"
          dangerouslySetInnerHTML={{ __html: code }}
        />
      </div>
    </div>
  );
}
```

## 动画效果

### 1. 使用 Framer Motion

```tsx
import { motion } from "framer-motion";

export function AnimatedCard({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className="rounded-lg border p-6 shadow-lg"
    >
      {children}
    </motion.div>
  );
}
```

```mdx
<AnimatedCard>这个卡片会有淡入动画，悬停时会放大！</AnimatedCard>
```

### 2. 打字机效果

```tsx
export function Typewriter({ text, speed = 50 }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span className="font-mono">
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  );
}
```

```mdx
<Typewriter text="Hello, I'm a typewriter effect!" />
```

### 3. 滚动动画

```tsx
export function FadeInOnScroll({ children }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
```

## 媒体嵌入

### 1. 视频播放器

```tsx
export function VideoPlayer({ src, poster }) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);

  const togglePlay = () => {
    if (playing) {
      videoRef.current?.pause();
    } else {
      videoRef.current?.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="relative my-4 overflow-hidden rounded-lg">
      <video ref={videoRef} src={src} poster={poster} className="w-full" />
      <button
        onClick={togglePlay}
        className="absolute inset-0 flex items-center justify-center bg-black/30"
      >
        {playing ? "⏸️" : "▶️"}
      </button>
    </div>
  );
}
```

### 2. 图片画廊

```tsx
export function Gallery({ images }) {
  const [selected, setSelected] = useState(0);

  return (
    <div className="my-4">
      <img
        src={images[selected]}
        className="h-64 w-full rounded-lg object-cover"
      />
      <div className="mt-2 flex gap-2">
        {images.map((img, i) => (
          <img
            key={i}
            src={img}
            onClick={() => setSelected(i)}
            className={`h-16 w-16 cursor-pointer rounded object-cover ${
              i === selected ? "ring-primary ring-2" : ""
            }`}
          />
        ))}
      </div>
    </div>
  );
}
```

## 实用工具

### 1. 复制按钮

```tsx
export function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button onClick={copy} size="sm">
      {copied ? "✓ 已复制" : "📋 复制"}
    </Button>
  );
}
```

### 2. 主题切换演示

```tsx
export function ThemeDemo() {
  const [dark, setDark] = useState(false);

  return (
    <div
      className={`rounded-lg p-6 ${dark ? "bg-gray-900 text-white" : "bg-white text-black"}`}
    >
      <Button onClick={() => setDark(!dark)}>
        切换到 {dark ? "浅色" : "深色"} 模式
      </Button>
      <p className="mt-4">这是一个主题切换演示</p>
    </div>
  );
}
```

### 3. 步骤引导

```tsx
export function Steps({ steps }) {
  const [current, setCurrent] = useState(0);

  return (
    <div className="my-4">
      <div className="mb-4 flex gap-2">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              i <= current ? "bg-primary text-white" : "bg-gray-200"
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <div className="rounded border p-4">{steps[current]}</div>
      <div className="mt-4 flex gap-2">
        <Button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
        >
          上一步
        </Button>
        <Button
          onClick={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))}
          disabled={current === steps.length - 1}
        >
          下一步
        </Button>
      </div>
    </div>
  );
}
```

```mdx
<Steps steps={["第一步：安装依赖", "第二步：配置项目", "第三步：开始使用"]} />
```

## 最佳实践

1. **保持组件简单**：MDX 中的组件应该专注于展示，复杂逻辑放在外部
2. **提供默认值**：让组件在没有 props 时也能正常显示
3. **响应式设计**：确保组件在不同屏幕尺寸下都能正常工作
4. **无障碍访问**：添加适当的 ARIA 属性
5. **性能优化**：避免在 MDX 中使用过重的组件
