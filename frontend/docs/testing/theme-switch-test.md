# 主题切换功能测试指南

## ✅ 测试清单

### 1. 基础功能测试

#### 桌面端测试

1. **打开应用**
   - 访问 `http://localhost:5173`
   - 检查页面是否正常加载

2. **找到主题切换按钮**
   - 位置：页眉右侧，搜索框旁边
   - 图标：月亮（深色）/ 太阳（浅色）/ 显示器（系统）

3. **点击切换**
   - 点击按钮，主题应该循环切换：
     - `dark` → `light` → `system` → `dark`
   - 每次切换应该有平滑的过渡动画（0.3秒）

4. **视觉检查**
   - **深色模式**：背景深色，文字浅色
   - **浅色模式**：背景浅色，文字深色
   - **系统模式**：跟随操作系统设置

#### 移动端测试

1. **打开侧边栏**
   - 点击左上角的汉堡菜单图标
   - 侧边栏从左侧滑出

2. **主题设置区域**
   - 滚动到侧边栏底部
   - 看到"主题设置"标题
   - 三个按钮：浅色、深色、系统

3. **点击切换**
   - 点击任意按钮
   - 主题立即切换
   - 当前选中的按钮高亮显示

---

## 🔍 调试步骤

### 如果主题切换不工作

#### 步骤 1：检查控制台

打开浏览器开发者工具（F12），查看 Console 标签：

**正常情况：** 无错误

**异常情况：** 如果看到以下错误：

```
Error: useTheme must be used within a ThemeProvider
```

**原因：** `App.tsx` 中没有包裹 `ThemeProvider`

**解决：** 确认 `App.tsx` 结构如下：

```tsx
<ThemeProvider>
  <AuthProvider>
    <BrowserRouter>{/* ... */}</BrowserRouter>
  </AuthProvider>
</ThemeProvider>
```

#### 步骤 2：检查 localStorage

在控制台运行：

```javascript
localStorage.getItem("my-blog-theme");
```

**正常情况：** 返回 `"dark"`, `"light"`, 或 `"system"`

**异常情况：** 返回 `null`

**解决：** 主题没有保存，检查 ThemeContext 的 `setTheme` 方法

#### 步骤 3：检查 HTML 类名

在控制台运行：

```javascript
document.documentElement.classList;
```

**正常情况：** 包含 `"dark"` 或 `"light"`

**异常情况：** 没有这些类名

**解决：** ThemeContext 的 `useEffect` 没有执行，检查依赖数组

#### 步骤 4：检查 CSS 变量

在控制台运行：

```javascript
getComputedStyle(document.documentElement).getPropertyValue("--background");
```

**正常情况：** 返回颜色值（如 `"0 0% 3.9%"`）

**异常情况：** 返回空字符串

**解决：** `index.css` 中的 CSS 变量没有定义

---

## 🧪 手动测试脚本

在浏览器控制台运行以下脚本进行快速测试：

```javascript
// 测试主题切换
function testThemeSwitch() {
  const themes = ["dark", "light", "system"];
  let index = 0;

  const interval = setInterval(() => {
    const theme = themes[index];
    localStorage.setItem("my-blog-theme", theme);
    document.documentElement.classList.remove("dark", "light");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      document.documentElement.classList.add(systemTheme);
    } else {
      document.documentElement.classList.add(theme);
    }

    console.log(`✅ 切换到: ${theme}`);
    index = (index + 1) % themes.length;

    if (index === 0) {
      clearInterval(interval);
      console.log("✅ 测试完成！");
    }
  }, 1000);
}

// 运行测试
testThemeSwitch();
```

---

## 📊 预期结果

### 深色模式 (dark)

- 背景色：深灰/黑色
- 文字颜色：白色/浅灰
- 主题色：亮色（高对比度）
- 边框：深色

### 浅色模式 (light)

- 背景色：白色/浅灰
- 文字颜色：黑色/深灰
- 主题色：深色
- 边框：浅色

### 系统模式 (system)

- 自动跟随操作系统设置
- 在 macOS/Windows 中切换系统主题，页面应该自动更新

---

## 🎨 视觉回归测试

### 检查以下组件的主题适配

- [ ] Header（页眉）
  - [ ] Logo 颜色
  - [ ] 导航链接颜色
  - [ ] 搜索框样式
  - [ ] 主题切换按钮图标

- [ ] Footer（页脚）
  - [ ] 文字颜色
  - [ ] 链接颜色
  - [ ] 背景毛玻璃效果

- [ ] 主内容区
  - [ ] 背景渐变
  - [ ] 卡片样式
  - [ ] 按钮样式

- [ ] 表单组件
  - [ ] 输入框边框
  - [ ] 按钮颜色
  - [ ] 错误提示颜色

---

## 🚀 自动化测试（可选）

### 使用 Playwright 测试

```typescript
import { test, expect } from "@playwright/test";

test("主题切换功能", async ({ page }) => {
  await page.goto("http://localhost:5173");

  // 点击主题切换按钮
  await page.click('[title*="当前"]');

  // 等待动画完成
  await page.waitForTimeout(500);

  // 检查 HTML 类名
  const htmlClass = await page.getAttribute("html", "class");
  expect(htmlClass).toMatch(/dark|light/);

  // 检查 localStorage
  const theme = await page.evaluate(() =>
    localStorage.getItem("my-blog-theme"),
  );
  expect(theme).toBeTruthy();
});
```

---

## 📝 测试报告模板

```markdown
## 主题切换测试报告

**测试日期：** 2024-XX-XX
**测试人员：** XXX
**浏览器：** Chrome 120 / Firefox 121 / Safari 17

### 测试结果

| 功能     | 桌面端 | 移动端 | 备注 |
| -------- | ------ | ------ | ---- |
| 深色模式 | ✅     | ✅     | 正常 |
| 浅色模式 | ✅     | ✅     | 正常 |
| 系统模式 | ✅     | ✅     | 正常 |
| 过渡动画 | ✅     | ✅     | 平滑 |
| 持久化   | ✅     | ✅     | 正常 |

### 发现的问题

1. 无

### 建议

1. 无
```

---

## 🔧 故障排除

### 问题：点击按钮无反应

**可能原因：**

1. ThemeProvider 未配置
2. useTheme Hook 调用位置错误
3. 按钮事件未绑定

**解决步骤：**

1. 检查 `App.tsx` 中的 Provider 配置
2. 检查 `Header.tsx` 中的 `useTheme()` 调用
3. 检查按钮的 `onClick` 事件

### 问题：主题切换后样式不变

**可能原因：**

1. CSS 变量未定义
2. Tailwind 配置错误
3. 类名未正确应用

**解决步骤：**

1. 检查 `index.css` 中的 `:root` 和 `.dark` 定义
2. 检查 `tailwind.config.js` 中的 `darkMode: "class"`
3. 检查 HTML 元素的 class 属性

### 问题：刷新页面后主题丢失

**可能原因：**
localStorage 未正确保存

**解决步骤：**

1. 检查 ThemeContext 中的 `localStorage.setItem()` 调用
2. 检查浏览器是否禁用了 localStorage
3. 检查隐私模式/无痕模式

---

## ✅ 测试通过标准

- [ ] 三种主题模式都能正常切换
- [ ] 切换有平滑的过渡动画
- [ ] 刷新页面后主题保持不变
- [ ] 移动端和桌面端都能正常工作
- [ ] 系统模式能跟随操作系统变化
- [ ] 无控制台错误
- [ ] 所有组件样式正确适配

---

**测试完成后，主题切换功能应该完全正常工作！** 🎉
