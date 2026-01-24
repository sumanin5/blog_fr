# Posts 路由重构方案

## 📋 目标

将 posts 路由按资源类型重新组织，提高代码可维护性和前端使用便利性。

---

## 🎯 新的目录结构

```
posts/routers/
├── __init__.py                 # 主路由注册
│
├── posts/                      # 文章板块 (13个接口)
│   ├── __init__.py            # 文章子路由注册
│   ├── public.py              # 公开接口 (4个)
│   ├── editor.py              # 编辑接口 (4个)
│   ├── admin.py               # 管理接口 (3个)
│   └── interactions.py        # 互动接口 (4个)
│
├── categories.py              # 分类板块 (4个接口)
│
└── tags.py                    # 标签板块 (5个接口)
```

---

## 📝 接口迁移清单

### 1️⃣ posts/public.py (4 个接口)

从 `routers/public.py` 迁移：

- [ ] `GET /types` - 获取所有板块类型

  - 函数：`get_post_types()`
  - 文档：`api_doc/public.py::GET_POST_TYPES_DOC`

- [ ] `GET /{post_type}` - 获取文章列表

  - 函数：`list_posts_by_type()`
  - 文档：`api_doc/public.py::LIST_POSTS_BY_TYPE_DOC`

- [ ] `GET /{post_type}/{post_id:uuid}` - 通过 ID 获取详情

  - 函数：`get_post_by_id()`
  - 文档：`api_doc/public.py::GET_POST_BY_ID_DOC`

- [ ] `GET /{post_type}/slug/{slug}` - 通过 Slug 获取详情
  - 函数：`get_post_by_slug()`
  - 文档：`api_doc/public.py::GET_POST_BY_SLUG_DOC`

---

### 2️⃣ posts/editor.py (4 个接口)

从 `routers/editor.py` 迁移：

- [ ] `POST /preview` - 预览文章

  - 函数：`preview_post()`
  - 文档：`api_doc/editor.py::PREVIEW_POST_DOC`

- [ ] `POST /{post_type}` - 创建文章

  - 函数：`create_post_by_type()`
  - 文档：`api_doc/editor.py::CREATE_POST_DOC`

- [ ] `PATCH /{post_type}/{post_id}` - 更新文章

  - 函数：`update_post_by_type()`
  - 文档：`api_doc/editor.py::UPDATE_POST_DOC`

- [ ] `DELETE /{post_type}/{post_id}` - 删除文章
  - 函数：`delete_post_by_type()`
  - 文档：`api_doc/editor.py::DELETE_POST_DOC`

---

### 3️⃣ posts/admin.py (3 个接口)

从 `routers/admin.py` 和 `routers/me.py` 迁移：

- [ ] `GET /me` - 获取我的文章列表

  - 函数：`get_my_posts()`
  - 来源：`routers/me.py`
  - 文档：`api_doc/me.py::GET_MY_POSTS_DOC`

- [ ] `GET /{post_type}/admin/posts` - 获取指定板块文章（管理）

  - 函数：`list_posts_by_type_admin()`
  - 来源：`routers/admin.py`
  - 文档：`api_doc/admin.py::LIST_POSTS_BY_TYPE_ADMIN_DOC`

- [ ] `GET /admin/posts` - 获取所有文章（跨板块）
  - 函数：`list_all_posts_admin()`
  - 来源：`routers/admin.py`
  - 文档：`api_doc/admin.py::LIST_ALL_POSTS_ADMIN_DOC`

---

### 4️⃣ posts/interactions.py (4 个接口)

从 `routers/interactions.py` 迁移：

- [ ] `POST /{post_type}/{post_id}/like` - 点赞

  - 函数：`like_post()`
  - 文档：`api_doc/interactions.py::LIKE_POST_DOC`

- [ ] `DELETE /{post_type}/{post_id}/like` - 取消点赞

  - 函数：`unlike_post()`
  - 文档：`api_doc/interactions.py::UNLIKE_POST_DOC`

- [ ] `POST /{post_type}/{post_id}/bookmark` - 收藏

  - 函数：`bookmark_post()`
  - 文档：`api_doc/interactions.py::BOOKMARK_POST_DOC`

- [ ] `DELETE /{post_type}/{post_id}/bookmark` - 取消收藏
  - 函数：`unbookmark_post()`
  - 文档：`api_doc/interactions.py::UNBOOKMARK_POST_DOC`

---

### 5️⃣ categories.py (4 个接口)

从 `routers/public.py` 和 `routers/admin.py` 迁移：

- [ ] `GET /{post_type}/categories` - 获取分类列表

  - 函数：`list_categories_by_type()`
  - 来源：`routers/public.py`
  - 文档：`api_doc/public.py::LIST_CATEGORIES_BY_TYPE_DOC`

- [ ] `POST /{post_type}/categories` - 创建分类

  - 函数：`create_category_by_type()`
  - 来源：`routers/admin.py`
  - 文档：`api_doc/admin.py::CREATE_CATEGORY_DOC`

- [ ] `PATCH /{post_type}/categories/{category_id}` - 更新分类

  - 函数：`update_category_by_type()`
  - 来源：`routers/admin.py`
  - 文档：`api_doc/admin.py::UPDATE_CATEGORY_DOC`

- [ ] `DELETE /{post_type}/categories/{category_id}` - 删除分类
  - 函数：`delete_category_by_type()`
  - 来源：`routers/admin.py`
  - 文档：`api_doc/admin.py::DELETE_CATEGORY_DOC`

---

### 6️⃣ tags.py (5 个接口)

从 `routers/public.py` 和 `routers/admin.py` 迁移：

- [ ] `GET /{post_type}/tags` - 获取标签列表

  - 函数：`list_tags_by_type()`
  - 来源：`routers/public.py`
  - 文档：`api_doc/public.py::LIST_TAGS_BY_TYPE_DOC`

- [ ] `GET /admin/tags` - 获取所有标签

  - 函数：`list_tags()`
  - 来源：`routers/admin.py`
  - 文档：`api_doc/admin.py::LIST_TAGS_DOC`

- [ ] `DELETE /admin/tags/orphaned` - 清理孤立标签

  - 函数：`delete_orphaned_tags()`
  - 来源：`routers/admin.py`
  - 文档：`api_doc/admin.py::DELETE_ORPHANED_TAGS_DOC`

- [ ] `POST /admin/tags/merge` - 合并标签

  - 函数：`merge_tags()`
  - 来源：`routers/admin.py`
  - 文档：`api_doc/admin.py::MERGE_TAGS_DOC`

- [ ] `PATCH /admin/tags/{tag_id}` - 更新标签
  - 函数：`update_tag()`
  - 来源：`routers/admin.py`
  - 文档：`api_doc/admin.py::UPDATE_TAG_DOC`

---

## 📦 路由注册代码

### posts/routers/**init**.py

```python
"""
Posts 路由模块

按资源类型组织：
- posts/      文章相关接口
- categories  分类相关接口
- tags        标签相关接口
"""

from fastapi import APIRouter

from . import categories, posts, tags

# 创建主路由
router = APIRouter()

# 注册子路由
router.include_router(posts.router, tags=["Posts"])
router.include_router(categories.router, tags=["Categories"])
router.include_router(tags.router, tags=["Tags"])

__all__ = ["router"]
```

### posts/routers/posts/**init**.py

```python
"""文章路由模块"""

from fastapi import APIRouter

from . import admin, editor, interactions, public

router = APIRouter()

# 按功能注册路由
router.include_router(public.router)
router.include_router(editor.router)
router.include_router(admin.router)
router.include_router(interactions.router)

__all__ = ["router"]
```

---

## 🔄 迁移步骤

### 步骤 1：创建目录结构

```bash
cd backend/app/posts/routers

# 创建 posts 子目录
mkdir posts

# 创建 __init__.py 文件
touch posts/__init__.py
touch posts/public.py
touch posts/editor.py
touch posts/admin.py
touch posts/interactions.py

# 创建 categories 和 tags 文件
touch categories.py
touch tags.py
```

### 步骤 2：迁移文件内容

1. **复制函数和导入**

   - 从旧文件复制对应的函数到新文件
   - 复制必要的导入语句

2. **更新文档引用**

   - 在每个路由文件顶部导入对应的 api_doc
   - 例如：`from app.posts.routers.api_doc import public as doc`
   - 在路由装饰器中使用：`description=doc.XXX_DOC`

3. **移除函数内的 docstring**
   - 因为文档已经在 api_doc 中了

### 步骤 3：更新路由注册

1. 创建 `posts/__init__.py` 注册文章子路由
2. 更新 `routers/__init__.py` 注册所有路由

### 步骤 4：测试

```bash
# 运行测试
cd backend
uv run pytest tests/api/posts/ -v

# 检查 OpenAPI 文档
uv run python scripts/export_openapi.py
```

### 步骤 5：清理旧文件

确认一切正常后，删除旧文件：

- `routers/public.py`
- `routers/me.py`
- `routers/editor.py`
- `routers/admin.py`
- `routers/interactions.py`

---

## 📋 示例：迁移一个接口

### 旧代码 (routers/public.py)

```python
@router.get(
    "/{post_type}",
    response_model=Page[PostShortResponse],
    summary="获取指定板块的文章列表",
)
async def list_posts_by_type(
    post_type: Annotated[PostType, Path(description="文章类型")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    filters: Annotated[PostFilterParams, Depends()],
    params: Annotated[Params, Depends()],
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    """获取指定板块的文章列表

    权限：
    - 公开接口，无需登录
    ...
    """
    query = utils.build_posts_query(...)
    return await crud.paginate_query(session, query, params)
```

### 新代码 (routers/posts/public.py)

```python
from app.posts.routers.api_doc import public as doc

@router.get(
    "/{post_type}",
    response_model=Page[PostShortResponse],
    summary="获取指定板块的文章列表",
    description=doc.LIST_POSTS_BY_TYPE_DOC,  # 使用文档
)
async def list_posts_by_type(
    post_type: Annotated[PostType, Path(description="文章类型")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    filters: Annotated[PostFilterParams, Depends()],
    params: Annotated[Params, Depends()],
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    # 移除 docstring，因为已经在 doc.LIST_POSTS_BY_TYPE_DOC 中
    query = utils.build_posts_query(...)
    return await crud.paginate_query(session, query, params)
```

---

## ✅ 验证清单

迁移完成后，检查以下项目：

- [ ] 所有 24 个接口都已迁移
- [ ] 每个接口都使用了 api_doc 中的文档
- [ ] 路由注册正确（**init**.py）
- [ ] 所有测试通过
- [ ] OpenAPI 文档生成正常
- [ ] Swagger UI 中接口按资源分组显示
- [ ] 旧文件已删除

---

## 🎯 预期效果

### OpenAPI 标签分组

```
Posts
  ├── GET /types
  ├── GET /{post_type}
  ├── GET /{post_type}/{post_id}
  ├── GET /{post_type}/slug/{slug}
  ├── GET /me
  ├── GET /{post_type}/admin/posts
  ├── GET /admin/posts
  ├── POST /preview
  ├── POST /{post_type}
  ├── PATCH /{post_type}/{post_id}
  ├── DELETE /{post_type}/{post_id}
  ├── POST /{post_type}/{post_id}/like
  ├── DELETE /{post_type}/{post_id}/like
  ├── POST /{post_type}/{post_id}/bookmark
  └── DELETE /{post_type}/{post_id}/bookmark

Categories
  ├── GET /{post_type}/categories
  ├── POST /{post_type}/categories
  ├── PATCH /{post_type}/categories/{category_id}
  └── DELETE /{post_type}/categories/{category_id}

Tags
  ├── GET /{post_type}/tags
  ├── GET /admin/tags
  ├── DELETE /admin/tags/orphaned
  ├── POST /admin/tags/merge
  └── PATCH /admin/tags/{tag_id}
```

---

## 📚 参考

- Media 模块重构：`backend/app/media/routers/`
- API 文档模式：`backend/app/media/routers/api_doc/`
- 路由注册示例：`backend/app/media/routers/__init__.py`

---

## 💡 注意事项

1. **保持 URL 不变**

   - 只改变内部组织，不改变对外的 URL
   - 确保前端不需要修改

2. **文档引用**

   - 使用 `description=doc.XXX_DOC` 而不是内联 docstring
   - 保持与 media 模块一致的风格

3. **测试覆盖**

   - 迁移后运行所有测试
   - 确保没有遗漏的接口

4. **渐进式迁移**
   - 可以一个文件一个文件地迁移
   - 每迁移一个文件就测试一次

祝重构顺利！🚀
