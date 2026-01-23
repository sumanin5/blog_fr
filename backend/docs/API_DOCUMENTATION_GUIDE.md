# API 文档注释指南

本文档说明了如何为 FastAPI 路由添加详细的文档注释，以生成友好的 Swagger UI 文档。

## 📋 注释模板

### 基础模板

```python
@router.get(
    "/path",
    response_model=ResponseModel,
    summary="简短的一句话描述",  # 显示在接口列表
    description="详细的多行描述（可选）",  # 显示在接口详情
    tags=["标签"],  # 分组标签
)
async def function_name(
    param: Annotated[Type, Path(description="参数描述")],
):
    """完整的文档字符串

    这里可以包含：
    - 功能说明
    - 权限要求
    - 参数说明
    - 返回值说明
    - 使用示例
    - 注意事项

    Args:
        param: 参数说明

    Returns:
        返回值说明

    Raises:
        异常说明

    Examples:
        使用示例
    """
    pass
```

## 📝 已添加注释的路由模块

### 1. Posts 模块 (`backend/app/posts/routers/`)

#### `public.py` - 公开接口

- ✅ `get_post_types()` - 获取所有板块类型
- ✅ `list_posts_by_type()` - 获取指定板块的文章列表
- ✅ `list_categories_by_type()` - 获取指定板块的分类列表
- ✅ `list_tags_by_type()` - 获取指定板块的标签列表
- ✅ `get_post_by_id()` - 通过 ID 获取文章详情
- ✅ `get_post_by_slug()` - 通过 Slug 获取文章详情

#### `admin.py` - 管理接口

- ✅ `list_posts_by_type_admin()` - 获取指定板块的文章列表（管理后台）
- ✅ `list_all_posts_admin()` - 获取所有文章列表（管理后台，跨板块）
- ✅ `list_tags()` - 获取所有标签
- ✅ `delete_orphaned_tags()` - 清理孤立标签
- ✅ `merge_tags()` - 合并标签
- ✅ `update_tag()` - 更新标签
- ✅ `create_category_by_type()` - 创建分类
- ✅ `update_category_by_type()` - 更新分类
- ✅ `delete_category_by_type()` - 删除分类

#### `me.py` - 个人中心接口

- ⏳ 待添加详细注释

#### `editor.py` - 编辑器接口

- ⏳ 待添加详细注释

#### `interactions.py` - 互动接口

- ⏳ 待添加详细注释

### 2. Users 模块 (`backend/app/users/router.py`)

- ⏳ 待添加详细注释

### 3. Media 模块 (`backend/app/media/router.py`)

- ⏳ 待添加详细注释

### 4. Git Ops 模块 (`backend/app/git_ops/router.py`)

- ⏳ 待添加详细注释

## 🎯 注释最佳实践

### 1. Summary（摘要）

- 简短的一句话描述
- 显示在 Swagger UI 的接口列表中
- 使用动词开头，如"获取"、"创建"、"更新"、"删除"

```python
summary="获取文章列表"
```

### 2. Docstring（文档字符串）

- 详细的功能说明
- 包含权限要求、参数说明、示例等
- 使用 Markdown 格式

```python
"""获取文章列表

权限：
- 公开接口，无需登录
- 只显示已发布的文章

参数：
- page: 页码（默认1）
- size: 每页数量（默认20）
- category_id: 分类ID（可选）

示例：
- GET /posts/article?page=1&size=20
- GET /posts/article?category_id=xxx
"""
```

### 3. 参数注解

- 使用 `Annotated` 和 `Query/Path/Body` 添加参数描述
- 描述应该简洁明了

```python
param: Annotated[str, Query(description="搜索关键词")]
```

### 4. 响应模型

- 使用 `response_model` 指定返回类型
- FastAPI 会自动生成响应示例

```python
response_model=Page[PostShortResponse]
```

## 📚 参考资源

- [FastAPI 文档 - 路径操作配置](https://fastapi.tiangolo.com/tutorial/path-operation-configuration/)
- [FastAPI 文档 - 响应模型](https://fastapi.tiangolo.com/tutorial/response-model/)
- [OpenAPI 规范](https://swagger.io/specification/)

## 🔄 更新日志

- 2026-01-23: 创建文档，添加 posts 模块的 public.py 和 admin.py 注释
- 待续...
