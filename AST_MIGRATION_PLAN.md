# AST 渲染迁移计划 - 执行摘要

## 📋 项目概述

我已经为你制定了一个完整的 **AST 渲染迁移计划**，将当前的 HTML 字符串水合方式升级为更高效的 AST 渲染方式。

---

## 🎯 核心目标

### 代码简化

- **前端代码**：从 150 行减少到 30 行（节省 **80%**）
- **总体代码**：从 250 行减少到 180 行（节省 **28%**）

### 性能提升

- **渲染速度**：提升 **30-50%**
- **首次内容绘制**：更快的 FCP 时间

### 可维护性

- **新增组件**：从 10 行代码减少到 1 行代码
- **类型安全**：完整的 TypeScript 类型定义
- **易于扩展**：统一的渲染逻辑

---

## 📁 文档位置

所有规划文档已创建在：`.kiro/specs/ast-rendering-migration/`

```
.kiro/specs/ast-rendering-migration/
├── README.md           # 项目概述和快速开始
├── requirements.md     # 详细需求文档（用户故事、验收标准）
├── design.md          # 技术设计文档（架构、数据结构、实现细节）
└── tasks.md           # 详细任务列表（6 个阶段，100+ 个任务）
```

---

## 🚀 实施计划

### 阶段 1：后端实现（2-3 天）

**目标**：生成结构化的 AST JSON

**主要任务**：

1. 数据库 Schema 更新（添加 `content_ast` 字段）
2. 实现 Token 转 AST 算法
3. 处理所有节点类型（标题、代码、公式、自定义组件等）
4. 编写单元测试（覆盖率 > 80%）

**关键文件**：

- `backend/app/posts/utils.py` - 添加 AST 生成逻辑
- `backend/app/posts/model.py` - 添加 `content_ast` 字段
- `backend/alembic/versions/xxx_add_content_ast.py` - 数据库迁移

---

### 阶段 2：前端实现（1-2 天）

**目标**：创建 AST 渲染器组件

**主要任务**：

1. 定义 TypeScript 类型
2. 创建 `AstRenderer` 组件
3. 实现所有节点类型的渲染
4. 集成到 `PostContent` 组件
5. 编写单元测试

**关键文件**：

- `frontend/src/types/ast.ts` - AST 类型定义
- `frontend/src/components/post/content/renderers/ast-renderer.tsx` - AST 渲染器
- `frontend/src/components/post/content/post-content.tsx` - 集成降级逻辑

---

### 阶段 3：集成测试（1 天）

**目标**：确保端到端功能正常

**主要任务**：

1. 端到端测试（完整渲染流程）
2. 性能测试（对比 HTML 和 AST）
3. 兼容性测试（多浏览器）

---

### 阶段 4：迁移工具（1 天）

**目标**：批量迁移旧文章

**主要任务**：

1. 创建批量迁移脚本
2. 创建验证工具
3. 生成迁移报告

**关键文件**：

- `backend/scripts/migrate_posts_to_ast.py` - 批量迁移脚本
- `backend/scripts/validate_ast.py` - 验证工具

---

### 阶段 5：文档与部署（1 天）

**目标**：更新文档并灰度发布

**主要任务**：

1. 更新架构文档
2. 更新 API 文档
3. 配置监控
4. 灰度发布（10% → 50% → 100%）

---

### 阶段 6：清理与优化（1 天）

**目标**：优化性能并建立监控

**主要任务**：

1. 代码清理
2. 性能优化
3. 建立监控仪表板

---

## 📊 技术方案对比

### 当前方案：HTML 水合

```
后端：Markdown → HTML 字符串
前端：HTML 字符串 → 解析 → 识别特殊元素 → React 组件
```

**问题**：

- ❌ 前端代码复杂（150 行）
- ❌ 需要手动解析 HTML
- ❌ 需要递归提取文本
- ❌ 每个组件一个 if 分支
- ❌ 无类型安全

---

### 目标方案：AST 渲染

```
后端：Markdown → Token 流 → AST JSON
前端：AST JSON → 递归渲染 → React 组件
```

**优势**：

- ✅ 前端代码简洁（30 行）
- ✅ 直接遍历 JSON
- ✅ 统一的渲染逻辑
- ✅ 完整的类型定义
- ✅ 性能提升 30-50%

---

## 🔍 关键设计决策

### 1. 数据结构

**AST 节点结构**：

```typescript
interface AstNode {
  type: string; // 节点类型
  children?: AstNode[]; // 子节点（递归）
  [key: string]: unknown; // 其他属性
}
```

**示例**：

```json
{
  "type": "heading",
  "level": 1,
  "id": "hello-world",
  "children": [{ "type": "text", "value": "Hello World" }]
}
```

---

### 2. 降级策略

**优先级顺序**：

1. MDX 服务端渲染（如果启用 JSX）
2. MDX 客户端渲染（如果启用 JSX）
3. **AST 渲染**（新增，优先使用）
4. HTML 渲染（降级方案）

**代码**：

```typescript
if (enableJsx && mdx) {
  return <MdxRenderer mdx={mdx} />;
}
if (ast) {
  return <AstRenderer ast={ast} />; // 新增
}
if (html) {
  return <HtmlRenderer html={html} />; // 降级
}
```

---

### 3. 迁移策略

**阶段式迁移**：

1. **双写模式**：同时生成 HTML 和 AST
2. **灰度发布**：10% → 50% → 100%
3. **全量切换**：所有用户使用 AST
4. **清理**：可选移除 HTML 生成逻辑

---

## ⚠️ 风险与缓解

| 风险           | 影响 | 概率 | 缓解措施                 |
| -------------- | ---- | ---- | ------------------------ |
| AST 结构不完整 | 高   | 中   | 充分测试，保留 HTML 降级 |
| 性能不达预期   | 中   | 低   | 性能测试，必要时优化     |
| 迁移脚本失败   | 高   | 低   | 充分测试，提供回滚       |
| 生产事故       | 高   | 低   | 灰度发布，监控告警       |

---

## 📝 验收标准

### 功能验收

- [ ] 所有节点类型都能正确渲染
- [ ] 旧文章（HTML）和新文章（AST）都能正常显示
- [ ] 自定义组件正常工作
- [ ] 数学公式、Mermaid 图表正常显示

### 性能验收

- [ ] AST 渲染比 HTML 水合快 30% 以上
- [ ] 无性能回归

### 质量验收

- [ ] 所有测试通过
- [ ] 测试覆盖率 > 80%
- [ ] 无 TypeScript 错误
- [ ] 代码审查通过

---

## 📅 时间估算

| 阶段               | 预计时间   |
| ------------------ | ---------- |
| 阶段 1：后端实现   | 2-3 天     |
| 阶段 2：前端实现   | 1-2 天     |
| 阶段 3：集成测试   | 1 天       |
| 阶段 4：迁移工具   | 1 天       |
| 阶段 5：文档与部署 | 1 天       |
| 阶段 6：清理与优化 | 1 天       |
| **总计**           | **7-9 天** |

---

## 🎓 学习资源

### 业界实践

- **Notion**：使用 Block API（结构化数据）
- **Contentful**：使用 Rich Text JSON
- **Sanity**：使用 Portable Text

### 技术文档

- [markdown-it Token 文档](https://markdown-it.github.io/markdown-it/#Token)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [React 递归组件](https://react.dev/learn/rendering-lists)

---

## 🚦 下一步行动

### 立即开始

1. **阅读详细文档**：

   - `.kiro/specs/ast-rendering-migration/requirements.md`
   - `.kiro/specs/ast-rendering-migration/design.md`
   - `.kiro/specs/ast-rendering-migration/tasks.md`

2. **准备环境**：

   ```bash
   # 后端
   cd backend
   source .venv/bin/activate

   # 前端
   cd frontend
   npm install
   ```

3. **开始实施**：
   - 从阶段 1 的第一个任务开始
   - 按照 `tasks.md` 逐步实施
   - 每完成一个任务，勾选对应的复选框

---

## 💡 关键提示

1. **保持向后兼容**：旧文章必须能正常显示
2. **充分测试**：测试覆盖率 > 80%
3. **灰度发布**：不要一次性全量发布
4. **监控指标**：密切关注性能和错误率
5. **准备回滚**：如果出现问题，能快速回滚

---

## 📞 需要帮助？

如果在实施过程中遇到问题：

1. 查看详细设计文档（`design.md`）
2. 查看任务列表（`tasks.md`）
3. 参考业界实践（Notion、Contentful）
4. 随时向我提问

---

**准备好开始了吗？让我们一起把这个项目做好！** 🚀

---

**文档创建时间**：2025-01-16
**预计完成时间**：7-9 天后
**当前状态**：✅ 规划完成，等待实施
