# API 文档管理方案对比

## 方案 A：Docstring 方式（当前使用）

### 代码示例

```python
@router.post("/upload")
async def upload_file(...):
    """
    上传媒体文件

    ## 权限
    - 需要登录

    ## 参数
    - file: 文件（必填）
    ...
    """
    pass
```

### 优点

✅ **代码和文档在一起**：易于维护同步
✅ **IDE 支持好**：鼠标悬停即可查看文档
✅ **FastAPI 原生支持**：自动生成 Swagger UI
✅ **Python 惯例**：符合 PEP 257 docstring 规范
✅ **无需额外导入**：直接写在函数中

### 缺点

❌ **代码文件较长**：文档和逻辑混在一起
❌ **难以复用**：相似的文档需要重复编写
❌ **格式化限制**：受 Python 字符串格式限制

---

## 方案 B：外部文档 + description 参数（推荐）

### 代码示例

```python
# api_docs.py
UPLOAD_FILE_DOC = """
上传媒体文件

## 权限
- 需要登录

## 参数
- file: 文件（必填）
...
"""

# router.py
from .api_docs import UPLOAD_FILE_DOC

@router.post(
    "/upload",
    summary="上传文件",
    description=UPLOAD_FILE_DOC,  # 👈 引用外部文档
)
async def upload_file(...):
    pass  # 函数体保持简洁
```

### 优点

✅ **代码简洁**：router 文件只关注路由逻辑
✅ **文档集中管理**：所有文档在一个文件中
✅ **易于复用**：可以组合文档片段
✅ **FastAPI 完全支持**：description 参数会显示在 Swagger UI
✅ **易于维护**：修改文档不影响代码逻辑
✅ **更好的组织**：可以按模块、功能分类文档

### 缺点

❌ **需要额外导入**：需要 import 文档变量
❌ **IDE 提示较弱**：鼠标悬停看不到完整文档（但可以跳转）

---

## 方案 C：混合方案（最佳实践）

结合两种方案的优点：

### 1. 简单接口使用 docstring

```python
@router.get("/health")
async def health_check():
    """健康检查接口，返回服务状态"""
    return {"status": "ok"}
```

### 2. 复杂接口使用外部文档

```python
from .api_docs import UPLOAD_FILE_DOC

@router.post(
    "/upload",
    summary="上传文件",
    description=UPLOAD_FILE_DOC,
)
async def upload_file(...):
    pass
```

### 3. 提取公共文档片段

```python
# api_docs.py
PERMISSION_LOGGED_IN = """
## 权限
- 需要登录
- 所有登录用户都可以访问
"""

COMMON_ERRORS = """
## 错误码
- `401 UNAUTHORIZED`: 未登录
- `403 FORBIDDEN`: 无权访问
- `404 NOT_FOUND`: 资源不存在
"""

# 组合使用
UPLOAD_FILE_DOC = f"""
上传媒体文件

{PERMISSION_LOGGED_IN}

## 参数
- file: 文件（必填）

{COMMON_ERRORS}
"""
```

---

## FastAPI 路由装饰器参数说明

```python
@router.post(
    "/upload",

    # 基本信息
    summary="上传文件",              # 简短标题（必填，显示在接口列表）
    description=UPLOAD_FILE_DOC,     # 详细文档（可选，支持 Markdown）

    # 响应配置
    response_model=UploadResponse,   # 响应模型
    status_code=201,                 # 默认状态码

    # 文档配置
    tags=["media"],                  # 标签分类
    deprecated=False,                # 是否废弃
    include_in_schema=True,          # 是否包含在 OpenAPI schema

    # 高级配置
    response_description="上传成功", # 响应描述
    responses={                      # 额外的响应定义
        400: {"description": "文件类型不支持"},
        401: {"description": "未登录"},
    },
)
async def upload_file(...):
    pass
```

### 参数优先级

1. **summary** > 函数名：显示在接口列表
2. **description** > docstring：显示在详细文档
3. 如果 description 为空，则使用 docstring

---

## 推荐方案

### 对于你的项目

**建议采用方案 B（外部文档 + description）**，原因：

1. ✅ **已有详细文档**：你已经写了很好的文档，只需要移动位置
2. ✅ **代码更简洁**：router 文件会更易读
3. ✅ **易于维护**：文档集中管理，修改更方便
4. ✅ **完全兼容**：FastAPI 完全支持，Swagger UI 显示效果一样

### 迁移步骤

#### 1. 创建文档文件

```bash
backend/app/
├── users/
│   ├── router.py
│   └── api_docs.py      # 👈 新建
├── posts/
│   ├── routers/
│   │   ├── public.py
│   │   ├── admin.py
│   │   └── api_docs.py  # 👈 新建
├── media/
│   ├── router.py
│   └── api_docs.py      # 👈 新建
└── git_ops/
    ├── router.py
    └── api_docs.py      # 👈 新建
```

#### 2. 移动文档内容

将 router.py 中的 docstring 移动到 api_docs.py：

```python
# api_docs.py
REGISTER_USER_DOC = """
注册新用户

## 权限
- 无需认证
...
"""

LOGIN_USER_DOC = """
用户登录

## 权限
- 无需认证
...
"""
```

#### 3. 更新 router.py

```python
# router.py
from .api_docs import REGISTER_USER_DOC, LOGIN_USER_DOC

@router.post(
    "/register",
    summary="注册新用户",
    description=REGISTER_USER_DOC,  # 👈 引用外部文档
)
async def register_user(...):
    pass  # 函数体保持简洁
```

#### 4. 验证效果

启动服务后访问 `http://localhost:8000/docs`，确认文档显示正常。

---

## 文档组织建议

### 文件结构

```python
# api_docs.py
"""
模块 API 文档

集中管理所有接口的详细文档。
"""

# ============================================================
# 公共文档片段
# ============================================================

PERMISSION_LOGGED_IN = """..."""
PERMISSION_ADMIN = """..."""
COMMON_ERRORS = """..."""

# ============================================================
# 用户认证接口
# ============================================================

REGISTER_USER_DOC = f"""
注册新用户

{PERMISSION_LOGGED_IN}
...
{COMMON_ERRORS}
"""

LOGIN_USER_DOC = """..."""

# ============================================================
# 用户管理接口
# ============================================================

GET_USER_DOC = """..."""
UPDATE_USER_DOC = """..."""
DELETE_USER_DOC = """..."""
```

### 命名规范

- 文档变量使用 `大写_下划线` 命名
- 变量名 = `接口功能_DOC`
- 例如：`UPLOAD_FILE_DOC`, `DELETE_USER_DOC`

---

## 总结

| 方案      | 适用场景           | 推荐度     |
| --------- | ------------------ | ---------- |
| Docstring | 简单接口、快速原型 | ⭐⭐⭐     |
| 外部文档  | 复杂接口、大型项目 | ⭐⭐⭐⭐⭐ |
| 混合方案  | 生产项目           | ⭐⭐⭐⭐⭐ |

**对于你的项目，建议采用外部文档方案**，可以让代码更简洁、文档更易维护。
