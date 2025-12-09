# Python 数据可视化在 MDX 中的三种方案

## 应用场景

将 Python 数据分析结果嵌入到 MDX 博客文章中，实现交互式数据可视化。

**工作流程：**

```
Python (数据处理)
  ↓
JSON (数据桥梁)
  ↓
MDX + React (交互式渲染)
```

**优势：**

- ✅ 矢量图，无限缩放不失真
- ✅ 交互式：悬停、缩放、筛选
- ✅ 响应式：自适应屏幕大小
- ✅ 主题适配：跟随网站暗黑/浅色模式

---

## 方案一：Plotly JSON（最简单，功能最强）

### 原理

Python 的 Plotly 库可以将图表导出为 JSON 配置，前端 `react-plotly.js` 直接读取并渲染。

**数据流：**

```
Python Plotly 图表
  ↓ fig.to_json()
JSON 配置文件
  ↓ import
React 组件
  ↓
浏览器渲染
```

### Python 端实现

#### 1. 安装依赖

```bash
pip install plotly pandas
```

#### 2. 生成图表并导出 JSON

```python
import plotly.express as px
import plotly.graph_objects as go
import json

# 示例1：简单折线图
df = px.data.stocks()
fig = px.line(df, x='date', y=['GOOG', 'AAPL', 'AMZN'],
              title='科技股价格走势')

# 导出为 JSON
with open('stock_chart.json', 'w') as f:
    f.write(fig.to_json())

# 示例2：动态散点图
df = px.data.gapminder()
fig = px.scatter(df,
    x="gdpPercap",
    y="lifeExp",
    animation_frame="year",
    animation_group="country",
    size="pop",
    color="continent",
    hover_name="country",
    log_x=True,
    size_max=55,
    range_x=[100,100000],
    range_y=[25,90]
)

with open('gdp_animation.json', 'w') as f:
    f.write(fig.to_json())
```

#### 3. 只导出数据（精简版）

```python
# 如果 JSON 太大，可以只导出数据部分
chart_config = {
    "data": json.loads(fig.to_json())["data"],
    "layout": {
        "title": "自定义标题",
        "xaxis": {"title": "X轴"},
        "yaxis": {"title": "Y轴"}
    }
}

with open('chart_data.json', 'w') as f:
    json.dump(chart_config, f)
```

### 前端实现

#### 1. 安装依赖

```bash
npm install react-plotly.js plotly.js
```

#### 2. 创建 Plotly 组件

```tsx
// src/components/charts/PlotlyChart.tsx
import React from "react";
import Plot from "react-plotly.js";

interface PlotlyChartProps {
  data: any[];
  layout?: any;
  config?: any;
  className?: string;
}

export function PlotlyChart({
  data,
  layout = {},
  config = {},
  className = "",
}: PlotlyChartProps) {
  return (
    <div className={`my-4 ${className}`}>
      <Plot
        data={data}
        layout={{
          autosize: true,
          ...layout,
        }}
        config={{
          responsive: true,
          displayModeBar: true,
          ...config,
        }}
        style={{ width: "100%", height: "100%" }}
        useResizeHandler={true}
      />
    </div>
  );
}
```

#### 3. 在 MDX 中使用

```mdx
import { PlotlyChart } from "@/components/charts/PlotlyChart";
import stockData from "./data/stock_chart.json";
import gdpData from "./data/gdp_animation.json";

# 数据可视化示例

## 科技股价格走势

<PlotlyChart data={stockData.data} layout={stockData.layout} />

## 全球 GDP 动态演变

点击播放按钮查看动画：

<PlotlyChart data={gdpData.data} layout={gdpData.layout} />
```

### 优缺点

**优点：**

- ✅ Python 代码几乎不用改
- ✅ 功能极其强大（3D、地图、动画）
- ✅ 交互性最强
- ✅ 适合复杂图表

**缺点：**

- ❌ 包体积大（plotly.js ~3MB）
- ❌ JSON 文件可能很大
- ❌ 样式定制相对困难

---

## 方案二：Recharts（性能与颜值的平衡）

### 原理

Python 只负责数据清洗，输出精简的 JSON 数组，前端用轻量级图表库渲染。

**数据流：**

```
Python 数据处理
  ↓ 输出简单数组
JSON 数据文件
  ↓ import
Recharts 组件
  ↓
浏览器渲染
```

### Python 端实现

```python
import pandas as pd
import json

# 读取和处理数据
df = pd.read_csv('stock_prices.csv')

# 清洗数据，只保留需要的字段
data = df[['date', 'price', 'volume']].to_dict('records')

# 导出为简单的 JSON 数组
with open('stock_data.json', 'w') as f:
    json.dump(data, f, indent=2)

# 输出示例：
# [
#   {"date": "2023-01-01", "price": 120, "volume": 1000},
#   {"date": "2023-01-02", "price": 132, "volume": 1200},
#   ...
# ]
```

### 前端实现

#### 1. 安装依赖

```bash
npm install recharts
```

#### 2. 创建图表组件

```tsx
// src/components/charts/StockChart.tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface StockChartProps {
  data: Array<{
    date: string;
    price: number;
    volume: number;
  }>;
}

export function StockChart({ data }: StockChartProps) {
  return (
    <div className="my-4 h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#8884d8"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

#### 3. 在 MDX 中使用

```mdx
import { StockChart } from "@/components/charts/StockChart";
import stockData from "./data/stock_data.json";

# 股价分析

## 价格走势

<StockChart data={stockData} />

从图中可以看到，在 3 月份出现了明显的波峰...
```

### 高级用法：多图表组合

```tsx
// src/components/charts/MultiChart.tsx
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function PriceVolumeChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        <Bar yAxisId="right" dataKey="volume" fill="#8884d8" opacity={0.3} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="price"
          stroke="#ff7300"
          strokeWidth={2}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
```

### 优缺点

**优点：**

- ✅ 包体积小（~100KB）
- ✅ 性能好，适合大数据量
- ✅ 样式完全可控，易于定制
- ✅ 完美融合 React 生态
- ✅ 支持主题切换

**缺点：**

- ❌ 功能相对简单
- ❌ 不支持 3D 图表
- ❌ 动画效果有限

---

## 方案三：ECharts（企业级方案）

### 原理

使用 Apache ECharts（百度开源），功能强大且性能优秀。

### Python 端实现

```python
# 同方案二，输出简单的 JSON 数组
import json

data = {
    "xAxis": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "series": [120, 200, 150, 80, 70, 110, 130]
}

with open('chart_data.json', 'w') as f:
    json.dump(data, f)
```

### 前端实现

#### 1. 安装依赖

```bash
npm install echarts echarts-for-react
```

#### 2. 创建组件

```tsx
// src/components/charts/EChartsWrapper.tsx
import ReactECharts from "echarts-for-react";

interface EChartsWrapperProps {
  option: any;
  style?: React.CSSProperties;
}

export function EChartsWrapper({ option, style }: EChartsWrapperProps) {
  return (
    <div className="my-4">
      <ReactECharts
        option={option}
        style={style || { height: "400px", width: "100%" }}
        notMerge={true}
        lazyUpdate={true}
      />
    </div>
  );
}
```

#### 3. 在 MDX 中使用

```mdx
import { EChartsWrapper } from "@/components/charts/EChartsWrapper";
import chartData from "./data/chart_data.json";

# ECharts 示例

<EChartsWrapper
  option={{
    title: { text: "周销售数据" },
    tooltip: {},
    xAxis: { data: chartData.xAxis },
    yAxis: {},
    series: [
      {
        name: "销量",
        type: "bar",
        data: chartData.series,
      },
    ],
  }}
/>
```

### 优缺点

**优点：**

- ✅ 功能强大，图表类型丰富
- ✅ 性能优秀
- ✅ 中文文档完善
- ✅ 企业级支持

**缺点：**

- ❌ 包体积较大（~1MB）
- ❌ 配置相对复杂
- ❌ React 集成不如 Recharts 原生

---

## 方案对比

| 特性           | Plotly             | Recharts     | ECharts  |
| -------------- | ------------------ | ------------ | -------- |
| **包体积**     | ~3MB               | ~100KB       | ~1MB     |
| **学习曲线**   | 低（Python 熟悉）  | 中           | 中高     |
| **图表类型**   | 极丰富（3D、地图） | 基础图表     | 丰富     |
| **交互性**     | 最强               | 中等         | 强       |
| **性能**       | 中                 | 优秀         | 优秀     |
| **样式定制**   | 难                 | 易           | 中       |
| **React 集成** | 中                 | 原生         | 中       |
| **适用场景**   | 科研、复杂分析     | 博客、仪表盘 | 企业应用 |

---

## 针对你的项目的推荐

### 推荐方案：Recharts（方案二）

**理由：**

1. **轻量级**：
   - 你的博客是静态部署，包体积很重要
   - Recharts 只有 100KB，不会拖慢加载速度

2. **完美融合**：
   - 原生 React 组件，写在 MDX 里非常自然
   - 支持 Tailwind CSS，样式统一
   - 自动适配暗黑模式

3. **够用**：
   - 博客场景不需要 3D 图表
   - 基础的折线图、柱状图、饼图完全够用
   - 交互性足够（悬停、缩放）

4. **易维护**：
   - 代码简洁，容易理解
   - TypeScript 支持好
   - 社区活跃

### 实施步骤

#### 1. Python 端（数据处理）

```python
# scripts/process_data.py
import pandas as pd
import json
from pathlib import Path

def process_stock_data():
    # 读取数据
    df = pd.read_csv('raw_data/stocks.csv')

    # 清洗数据
    df['date'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')

    # 只保留需要的字段
    data = df[['date', 'price', 'volume']].to_dict('records')

    # 保存到前端目录
    output_path = Path('../frontend/src/data/stock_data.json')
    output_path.parent.mkdir(exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"✅ 数据已导出到 {output_path}")

if __name__ == '__main__':
    process_stock_data()
```

#### 2. 前端组件库

```tsx
// src/components/charts/index.ts
export { StockChart } from "./StockChart";
export { PriceVolumeChart } from "./PriceVolumeChart";
export { PieChart } from "./PieChart";
```

#### 3. MDX 文章

```mdx
---
title: 股票分析报告
date: 2024-01-01
---

import { StockChart, PriceVolumeChart } from "@/components/charts";
import stockData from "@/data/stock_data.json";

# 股票分析报告

## 价格走势

<StockChart data={stockData} />

从图中可以看到...

## 价格与成交量关系

<PriceVolumeChart data={stockData} />

成交量在价格上涨时明显增加...
```

### 何时使用其他方案

**使用 Plotly（方案一）的场景：**

- 需要 3D 图表（如分子结构、地形图）
- 需要复杂动画（如时间序列动画）
- 科研论文、学术报告
- 不在意包体积

**使用 ECharts（方案三）的场景：**

- 企业级项目
- 需要中文文档和支持
- 图表类型非常丰富（如关系图、树图）
- 已有 ECharts 使用经验

---

## 完整示例

### Python 数据处理脚本

```python
# backend/scripts/generate_chart_data.py
import pandas as pd
import numpy as np
import json
from datetime import datetime, timedelta

def generate_sample_data():
    """生成示例数据"""
    dates = pd.date_range(start='2023-01-01', end='2023-12-31', freq='D')

    data = {
        'date': dates.strftime('%Y-%m-%d').tolist(),
        'price': (100 + np.cumsum(np.random.randn(len(dates)) * 2)).tolist(),
        'volume': (np.random.randint(1000, 5000, len(dates))).tolist(),
    }

    return data

def save_to_frontend(data, filename):
    """保存到前端数据目录"""
    output_path = f'../../frontend/src/data/{filename}'
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"✅ {filename} 已生成")

if __name__ == '__main__':
    data = generate_sample_data()
    save_to_frontend(data, 'stock_data.json')
```

### 前端图表组件

```tsx
// src/components/charts/StockChart.tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/contexts/ThemeContext";

interface DataPoint {
  date: string;
  price: number;
  volume: number;
}

export function StockChart({ data }: { data: DataPoint[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="bg-card my-6 h-96 w-full rounded-lg border p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "#374151" : "#e5e7eb"}
          />
          <XAxis dataKey="date" stroke={isDark ? "#9ca3af" : "#6b7280"} />
          <YAxis stroke={isDark ? "#9ca3af" : "#6b7280"} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1f2937" : "#ffffff",
              border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### MDX 文章

```mdx
---
title: 2023年股市分析
author: 张三
date: 2024-01-15
tags: [数据分析, 股票, Python]
---

import { StockChart } from "@/components/charts/StockChart";
import stockData from "@/data/stock_data.json";

# 2023年股市分析

## 概述

本文使用 Python 处理了全年的股票数据，并通过交互式图表展示关键趋势。

## 价格走势

<StockChart data={stockData} />

从图表中可以看到：

1. **Q1**：价格稳步上升
2. **Q2**：出现回调
3. **Q3**：震荡整理
4. **Q4**：强势反弹

## 结论

通过数据分析，我们发现...
```

---

## 总结

**最佳实践：**

1. **数据处理**：Python（pandas, numpy）
2. **数据格式**：简单的 JSON 数组
3. **图表渲染**：Recharts（轻量、原生 React）
4. **部署方式**：静态文件（Nginx）

**工作流程：**

```bash
# 1. Python 处理数据
python backend/scripts/generate_chart_data.py

# 2. 前端构建
cd frontend && npm run build

# 3. 部署到 Nginx
# 所有图表都是客户端渲染，无需服务器
```

这种方案完美结合了 Python 的数据处理能力和 React 的交互性，是博客项目的最佳选择！
