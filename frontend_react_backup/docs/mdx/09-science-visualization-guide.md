# 科普内容可视化指南

## 为什么科普内容推荐 Plotly？

对于物理、数学、生物、化学等科普内容，**Plotly 是最佳选择**。

### 核心原因

| 需求         | Plotly      | Recharts  | 说明                   |
| ------------ | ----------- | --------- | ---------------------- |
| **3D 图表**  | ✅ 原生支持 | ❌ 不支持 | 分子结构、电场、波函数 |
| **科学图表** | ✅ 专业     | ⚠️ 基础   | 等高线、热力图、极坐标 |
| **动画**     | ✅ 强大     | ⚠️ 有限   | 物理过程、化学反应     |
| **数学函数** | ✅ 原生     | ❌ 需手动 | 直接绘制函数曲线       |
| **交互性**   | ✅ 最强     | ⚠️ 中等   | 旋转、缩放、切片       |

---

## 科普场景示例

### 1. 物理学：波动演示

**场景**：展示正弦波、驻波、干涉等现象

```python
# Python 端
import plotly.graph_objects as go
import numpy as np
import json

# 生成波动数据
x = np.linspace(0, 4*np.pi, 100)
frames = []

for t in np.linspace(0, 2*np.pi, 30):
    y = np.sin(x - t)
    frames.append(go.Frame(
        data=[go.Scatter(x=x, y=y, mode='lines')],
        name=f'frame_{t:.2f}'
    ))

fig = go.Figure(
    data=[go.Scatter(x=x, y=np.sin(x), mode='lines')],
    layout=go.Layout(
        title="正弦波传播",
        xaxis=dict(title="位置 (m)"),
        yaxis=dict(title="振幅", range=[-1.5, 1.5]),
        updatemenus=[dict(
            type="buttons",
            buttons=[
                dict(label="播放", method="animate", args=[None]),
                dict(label="暂停", method="animate", args=[[None], {"frame": {"duration": 0}}])
            ]
        )]
    ),
    frames=frames
)

with open('wave_animation.json', 'w') as f:
    f.write(fig.to_json())
```

**MDX 使用**：

```mdx
import { PlotlyChart } from "@/components/charts/PlotlyChart";
import waveData from "./data/wave_animation.json";

# 波动现象

## 正弦波的传播

<PlotlyChart data={waveData.data} layout={waveData.layout} />

点击"播放"按钮观察波的传播过程。
```

### 2. 化学：分子结构 3D 可视化

**场景**：展示分子的三维结构

```python
import plotly.graph_objects as go
import json

# 水分子 (H2O) 的原子坐标
atoms = {
    'O': {'pos': [0, 0, 0], 'color': 'red', 'size': 15},
    'H1': {'pos': [0.96, 0, 0], 'color': 'white', 'size': 10},
    'H2': {'pos': [-0.24, 0.93, 0], 'color': 'white', 'size': 10}
}

# 创建 3D 散点图
fig = go.Figure()

for name, atom in atoms.items():
    fig.add_trace(go.Scatter3d(
        x=[atom['pos'][0]],
        y=[atom['pos'][1]],
        z=[atom['pos'][2]],
        mode='markers+text',
        marker=dict(size=atom['size'], color=atom['color']),
        text=[name],
        textposition='top center',
        name=name
    ))

# 添加化学键
bonds = [
    ([0, 0.96], [0, 0], [0, 0]),  # O-H1
    ([0, -0.24], [0, 0.93], [0, 0])  # O-H2
]

for bond in bonds:
    fig.add_trace(go.Scatter3d(
        x=bond[0], y=bond[1], z=bond[2],
        mode='lines',
        line=dict(color='gray', width=5),
        showlegend=False
    ))

fig.update_layout(
    title="水分子 (H₂O) 结构",
    scene=dict(
        xaxis_title="X (Å)",
        yaxis_title="Y (Å)",
        zaxis_title="Z (Å)",
        camera=dict(eye=dict(x=1.5, y=1.5, z=1.5))
    )
)

with open('h2o_molecule.json', 'w') as f:
    f.write(fig.to_json())
```

### 3. 数学：函数曲面

**场景**：展示多元函数的图像

```python
import plotly.graph_objects as go
import numpy as np

# 生成网格
x = np.linspace(-5, 5, 50)
y = np.linspace(-5, 5, 50)
X, Y = np.meshgrid(x, y)

# 计算函数值 z = sin(sqrt(x^2 + y^2))
Z = np.sin(np.sqrt(X**2 + Y**2))

fig = go.Figure(data=[go.Surface(
    x=X, y=Y, z=Z,
    colorscale='Viridis',
    contours={
        "z": {"show": True, "usecolormap": True, "project": {"z": True}}
    }
)])

fig.update_layout(
    title="函数曲面: z = sin(√(x² + y²))",
    scene=dict(
        xaxis_title="x",
        yaxis_title="y",
        zaxis_title="z"
    )
)

with open('surface_plot.json', 'w') as f:
    f.write(fig.to_json())
```

### 4. 生物学：种群增长模型

**场景**：展示 Logistic 增长曲线

```python
import plotly.graph_objects as go
import numpy as np

def logistic_growth(t, K, r, P0):
    """Logistic 增长模型"""
    return K / (1 + ((K - P0) / P0) * np.exp(-r * t))

t = np.linspace(0, 50, 200)
K = 1000  # 环境容纳量
r = 0.1   # 增长率
P0 = 10   # 初始种群

fig = go.Figure()

# 添加多条曲线（不同初始种群）
for p0 in [10, 50, 100, 500]:
    P = logistic_growth(t, K, r, p0)
    fig.add_trace(go.Scatter(
        x=t, y=P,
        mode='lines',
        name=f'P₀ = {p0}',
        line=dict(width=2)
    ))

# 添加环境容纳量参考线
fig.add_hline(y=K, line_dash="dash", line_color="red",
              annotation_text="环境容纳量 K")

fig.update_layout(
    title="Logistic 种群增长模型",
    xaxis_title="时间 (天)",
    yaxis_title="种群数量",
    hovermode='x unified'
)

with open('population_growth.json', 'w') as f:
    f.write(fig.to_json())
```

### 5. 物理学：电场线可视化

**场景**：展示点电荷的电场分布

```python
import plotly.graph_objects as go
import numpy as np

# 创建网格
x = np.linspace(-5, 5, 20)
y = np.linspace(-5, 5, 20)
X, Y = np.meshgrid(x, y)

# 两个点电荷的位置
q1_pos = np.array([-2, 0])
q2_pos = np.array([2, 0])

# 计算电场
def electric_field(X, Y, q_pos, q=1):
    dx = X - q_pos[0]
    dy = Y - q_pos[1]
    r = np.sqrt(dx**2 + dy**2)
    r = np.where(r < 0.1, 0.1, r)  # 避免除零
    Ex = q * dx / r**3
    Ey = q * dy / r**3
    return Ex, Ey

Ex1, Ey1 = electric_field(X, Y, q1_pos, q=1)
Ex2, Ey2 = electric_field(X, Y, q2_pos, q=-1)

Ex = Ex1 + Ex2
Ey = Ey1 + Ey2

fig = go.Figure()

# 绘制电场线（使用箭头）
fig.add_trace(go.Cone(
    x=X.flatten(),
    y=Y.flatten(),
    z=np.zeros_like(X.flatten()),
    u=Ex.flatten(),
    v=Ey.flatten(),
    w=np.zeros_like(Ex.flatten()),
    colorscale='Blues',
    sizemode="absolute",
    sizeref=0.5
))

# 标记电荷位置
fig.add_trace(go.Scatter(
    x=[q1_pos[0], q2_pos[0]],
    y=[q1_pos[1], q2_pos[1]],
    mode='markers+text',
    marker=dict(size=20, color=['red', 'blue']),
    text=['+', '-'],
    textfont=dict(size=20, color='white'),
    name='电荷'
))

fig.update_layout(
    title="电偶极子的电场分布",
    xaxis_title="x (m)",
    yaxis_title="y (m)"
)

with open('electric_field.json', 'w') as f:
    f.write(fig.to_json())
```

---

## 混合方案：Plotly + Recharts

**最佳实践**：根据内容类型选择合适的工具

### 使用 Plotly 的场景

✅ **3D 可视化**

- 分子结构
- 晶体结构
- 地形图
- 三维函数曲面

✅ **科学图表**

- 等高线图
- 热力图
- 极坐标图
- 三元图

✅ **复杂动画**

- 物理过程演示
- 化学反应过程
- 生物过程模拟

✅ **数学函数**

- 参数方程
- 隐函数
- 向量场

### 使用 Recharts 的场景

✅ **简单数据展示**

- 统计数据
- 趋势分析
- 对比图表

✅ **性能要求高**

- 大量数据点
- 实时更新

✅ **样式定制**

- 需要完美匹配网站主题
- 需要自定义交互

---

## 实施建议

### 1. 项目结构

```
frontend/
├── src/
│   ├── components/
│   │   └── charts/
│   │       ├── PlotlyChart.tsx      # Plotly 通用组件
│   │       ├── RechartsWrapper.tsx  # Recharts 通用组件
│   │       ├── MoleculeViewer.tsx   # 分子结构专用
│   │       └── WaveAnimation.tsx    # 波动动画专用
│   ├── data/
│   │   ├── physics/
│   │   ├── chemistry/
│   │   ├── biology/
│   │   └── math/
│   └── content/
│       └── science/
│           ├── wave-motion.mdx
│           ├── molecular-structure.mdx
│           └── population-dynamics.mdx
```

### 2. 组件封装

```tsx
// src/components/charts/ScienceChart.tsx
import { PlotlyChart } from "./PlotlyChart";
import { RechartsWrapper } from "./RechartsWrapper";

interface ScienceChartProps {
  type: "plotly" | "recharts";
  data: any;
  layout?: any;
}

export function ScienceChart({ type, data, layout }: ScienceChartProps) {
  if (type === "plotly") {
    return <PlotlyChart data={data.data} layout={data.layout || layout} />;
  }
  return <RechartsWrapper data={data} />;
}
```

### 3. MDX 使用

```mdx
import { ScienceChart } from "@/components/charts/ScienceChart";
import waveData from "@/data/physics/wave_animation.json";
import statsData from "@/data/biology/population_stats.json";

# 波动与统计

## 波动现象（3D 动画）

<ScienceChart type="plotly" data={waveData} />

## 种群统计（简单图表）

<ScienceChart type="recharts" data={statsData} />
```

---

## 性能优化

### 1. 按需加载

```tsx
// 使用动态 import 减少初始包体积
import dynamic from "next/dynamic";

const PlotlyChart = dynamic(() => import("./PlotlyChart"), {
  loading: () => <div>加载中...</div>,
  ssr: false,
});
```

### 2. 数据压缩

```python
# Python 端：压缩 JSON
import json
import gzip

data = fig.to_json()

# 保存压缩版本
with gzip.open('chart_data.json.gz', 'wt') as f:
    f.write(data)

# 保存精简版本（移除不必要的字段）
config = {
    'data': json.loads(data)['data'],
    'layout': {
        'title': 'Title',
        'xaxis': {'title': 'X'},
        'yaxis': {'title': 'Y'}
    }
}
```

### 3. 懒加载

```tsx
// 只在滚动到可视区域时加载
import { useInView } from "react-intersection-observer";

export function LazyChart({ data }) {
  const { ref, inView } = useInView({ triggerOnce: true });

  return (
    <div ref={ref}>
      {inView ? <PlotlyChart data={data} /> : <div>滚动加载...</div>}
    </div>
  );
}
```

---

## 总结

### 科普内容推荐方案

**主力工具：Plotly**

- 用于所有 3D 可视化
- 用于科学专业图表
- 用于复杂动画演示

**辅助工具：Recharts**

- 用于简单统计图表
- 用于性能敏感场景
- 用于需要深度定制的场景

### 包体积管理

```json
{
  "dependencies": {
    "plotly.js": "^2.x", // ~3MB (科学可视化必需)
    "react-plotly.js": "^2.x", // ~50KB
    "recharts": "^2.x" // ~100KB (轻量补充)
  }
}
```

**总包体积**：~3.15MB（对于科普内容来说完全值得）

### 最终建议

对于你的科普博客：

1. **安装 Plotly**：作为主力可视化工具
2. **保留 Recharts**：用于简单图表
3. **按需使用**：根据内容类型选择合适的工具
4. **优化加载**：使用懒加载和代码分割

这样既能展示复杂的科学现象，又不会过度影响性能！
