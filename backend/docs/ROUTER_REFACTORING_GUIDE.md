# 路由重构指南

## 目标

将大型 router 文件拆分成小模块，提高代码可维护性。

## 新的文件结构

```
backend/app/
├── media/
│   ├── router.py (旧文件，待删除)
│   └── routers/
│       ├── __init__.py (主路由，组装所有子路由)
│       ├── public.py (公开接口)
│       ├── upload.py (上传接口)
│       ├── query.py (查询接口)
│       ├── manage.py (管理接口)
│       ├── access.py (访问接口)
│       ├── admin.py (管理员接口)
│       └── api_doc/
│           ├── __init__.py
│           ├── public.py
│           ├── upload.py
│           ├── query.py
│           ├── manage.py
│           ├── access.py
│           └── admin.py
│
├── posts/
│   └── routers/
│       └── api_doc/ (新增)
│           ├── __init__.py
│           ├── public.py
│           ├── admin.py
│           ├── me.py
│           ├── editor.py
│           └── interactions.py
│
└── git_ops/
    ├── router.py (旧文件，待删除)
    └── routers/
        ├── __init__.py (主路由)
        ├── sync.py (同步接口)
        ├── webhook.py (Webhook 接口)
        └── api_doc/
            ├── __init__.py
            ├── sync.py
            └── webhook.py
```

## 迁移步骤

### 1. Media 模块

#### 1.1 迁移路由

从 `backend/app/media/router.py` 迁移到对应的子路由文件：

**public.py** (1 个接口):

- `@router.get("/public")` → `routers/public.py`

**upload.py** (1 个接口):

- `@router.post("/upload")` → `routers/upload.py`

**query.py** (4 个接口):

- `@router.get("/")` → `routers/query.py`
- `@router.get("/{file_id}")` → `routers/query.py`
- `@router.get("/search")` → `routers/query.py`
- `@router.get("/stats/overview")` → `routers/query.py`

**manage.py** (5 个接口):

- `@router.patch("/{file_id}")` → `routers/manage.py`
- `@router.patch("/{file_id}/publicity")` → `routers/manage.py`
- `@router.delete("/{file_id}")` → `routers/manage.py`
- `@router.post("/batch-delete")` → `routers/manage.py`
- `@router.post("/{file_id}/regenerate-thumbnails")` → `routers/manage.py`

**access.py** (3 个接口):

- `@router.get("/{file_id}/view")` → `routers/access.py`
- `@router.get("/{file_id}/thumbnail/{size}")` → `routers/access.py`
- `@router.get("/{file_id}/download")` → `routers/access.py`

**admin.py** (1 个接口):

- `@router.get("/admin/all")` → `routers/admin.py`

#### 1.2 迁移文档

从 `backend/app/media/router.py` 的 docstring 迁移到 `routers/api_doc/` 对应文件。

#### 1.3 更新主 router.py

```python
# backend/app/media/router.py
from .routers import router

__all__ = ["router"]
```

### 2. Posts 模块

#### 2.1 迁移文档

从各个 router 文件的 docstring 迁移到 `routers/api_doc/` 对应文件：

**public.py**:

- 从 `routers/public.py` 的 docstring → `routers/api_doc/public.py`

**admin.py**:

- 从 `routers/admin.py` 的 docstring → `routers/api_doc/admin.py`

**me.py**:

- 从 `routers/me.py` 的 docstring → `routers/api_doc/me.py`

**editor.py**:

- 从 `routers/editor.py` 的 docstring → `routers/api_doc/editor.py`

**interactions.py**:

- 从 `routers/interactions.py` 的 docstring → `routers/api_doc/interactions.py`

#### 2.2 更新路由文件

在每个 router 文件中：

1. 导入对应的文档：`from .api_doc import xxx`
2. 在装饰器中使用：`description=xxx.XXX_DOC`
3. 删除函数中的 docstring

### 3. Git Ops 模块

#### 3.1 迁移路由

从 `backend/app/git_ops/router.py` 迁移到对应的子路由文件：

**sync.py** (3 个接口):

- `@router.post("/sync")` → `routers/sync.py`
- `@router.get("/preview")` → `routers/sync.py`
- `@router.post("/posts/{post_id}/resync-metadata")` → `routers/sync.py`

**webhook.py** (1 个接口):

- `@router.post("/webhook")` → `routers/webhook.py`

#### 3.2 迁移文档

从 `backend/app/git_ops/router.py` 的 docstring 迁移到 `routers/api_doc/` 对应文件。

#### 3.3 更新主 router.py

```python
# backend/app/git_ops/router.py
from .routers import router

__all__ = ["router"]
```

## 迁移检查清单

### Media 模块

- [ ] 迁移 public.py 路由和文档
- [ ] 迁移 upload.py 路由和文档
- [ ] 迁移 query.py 路由和文档
- [ ] 迁移 manage.py 路由和文档
- [ ] 迁移 access.py 路由和文档
- [ ] 迁移 admin.py 路由和文档
- [ ] 更新主 router.py
- [ ] 删除旧的 router.py
- [ ] 测试所有接口

### Posts 模块

- [ ] 迁移 public.py 文档
- [ ] 迁移 admin.py 文档
- [ ] 迁移 me.py 文档
- [ ] 迁移 editor.py 文档
- [ ] 迁移 interactions.py 文档
- [ ] 更新所有路由文件使用外部文档
- [ ] 测试所有接口

### Git Ops 模块

- [ ] 迁移 sync.py 路由和文档
- [ ] 迁移 webhook.py 路由和文档
- [ ] 更新主 router.py
- [ ] 删除旧的 router.py
- [ ] 测试所有接口

## 注意事项

1. **保持导入路径一致**：确保所有依赖的模块都正确导入
2. **测试每个接口**：迁移后测试所有接口是否正常工作
3. **保留旧文件**：在确认新结构工作正常后再删除旧文件
4. **更新 main.py**：如果需要，更新 main.py 中的路由导入

## 迁移示例

### 迁移前

```python
# backend/app/media/router.py
@router.post("/upload")
async def upload_file(...):
    """
    上传媒体文件

    ## 权限
    - 需要登录
    ...
    """
    pass
```

### 迁移后

```python
# backend/app/media/routers/upload.py
from .api_doc import upload

@router.post("/upload", description=upload.UPLOAD_FILE_DOC)
async def upload_file(...):
    pass

# backend/app/media/routers/api_doc/upload.py
UPLOAD_FILE_DOC = """
上传媒体文件

## 权限
- 需要登录
...
"""
```

## 完成后的效果

- ✅ 每个文件只有 50-150 行
- ✅ 功能分类清晰
- ✅ 查找接口快速
- ✅ 文档和代码分离
- ✅ 易于维护和扩展
