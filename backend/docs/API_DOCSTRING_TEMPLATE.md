# API 文档注释模板

## 📝 标准模板

````python
@router.{method}(
    "/{path}",
    response_model=ResponseModel,
    summary="【动词】+【对象】+【补充说明】",  # 例如：获取文章列表、创建新文章
    status_code=status.HTTP_200_OK,  # 可选，默认200
)
async def function_name(
    # 路径参数
    param_id: Annotated[UUID, Path(description="参数ID")],

    # 查询参数
    query_param: Annotated[str, Query(description="查询参数")] = None,

    # 请求体
    body: RequestModel,

    # 依赖注入
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """【功能的详细描述】

    权限：
    - 【权限要求1】
    - 【权限要求2】

    参数：
    - param_id: 【参数说明】
    - query_param: 【参数说明】

    请求体：
    ```json
    {
        "field1": "value1",
        "field2": "value2"
    }
    ```

    返回：
    ```json
    {
        "id": "uuid",
        "field1": "value1"
    }
    ```

    示例：
    - {METHOD} /path/{id} - 【示例说明】
    - {METHOD} /path/{id}?query=value - 【示例说明】

    错误码：
    - 400: 【错误说明】
    - 401: 【错误说明】
    - 403: 【错误说明】
    - 404: 【错误说明】

    注意：
    - 【注意事项1】
    - 【注意事项2】
    """
    pass
````

## 🎯 不同类型接口的模板

### 1. GET 列表接口

```python
@router.get(
    "/items",
    response_model=Page[ItemResponse],
    summary="获取项目列表",
)
async def list_items(
    params: Annotated[Params, Depends()],
    filters: Annotated[FilterParams, Depends()],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """获取项目列表（支持分页和筛选）

    权限：
    - 公开接口，无需登录

    支持筛选：
    - status: 状态筛选
    - category_id: 分类筛选
    - search: 关键词搜索

    分页参数：
    - page: 页码（默认1）
    - size: 每页数量（默认20，最大100）

    示例：
    - GET /items?page=1&size=20
    - GET /items?status=active&search=keyword

    返回：
    - items: 项目列表
    - total: 总数
    - page: 当前页
    - pages: 总页数
    """
    pass
```

### 2. GET 详情接口

```python
@router.get(
    "/items/{item_id}",
    response_model=ItemDetailResponse,
    summary="获取项目详情",
)
async def get_item(
    item_id: Annotated[UUID, Path(description="项目ID")],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[Optional[User], Depends(get_optional_current_user)],
):
    """获取项目详情

    权限：
    - 公开项目：任何人可访问
    - 私有项目：只有所有者可访问

    参数：
    - item_id: 项目的唯一标识符（UUID格式）

    示例：
    - GET /items/550e8400-e29b-41d4-a716-446655440000

    错误码：
    - 404: 项目不存在
    - 403: 无权访问私有项目
    """
    pass
```

### 3. POST 创建接口

````python
@router.post(
    "/items",
    response_model=ItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建新项目",
)
async def create_item(
    item_in: ItemCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """创建新项目

    权限：
    - 需要登录

    请求体：
    ```json
    {
        "title": "项目标题",
        "description": "项目描述",
        "category_id": "分类ID（可选）"
    }
    ```

    返回：
    - 创建成功的项目对象（包含生成的ID）

    示例：
    - POST /items

    错误码：
    - 400: 请求参数错误
    - 401: 未登录
    - 422: 数据验证失败
    """
    pass
````

### 4. PATCH 更新接口

````python
@router.patch(
    "/items/{item_id}",
    response_model=ItemResponse,
    summary="更新项目",
)
async def update_item(
    item_id: Annotated[UUID, Path(description="项目ID")],
    item_in: ItemUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """更新项目信息

    权限：
    - 需要登录
    - 只有所有者或管理员可以更新

    请求体：
    ```json
    {
        "title": "新标题（可选）",
        "description": "新描述（可选）"
    }
    ```

    示例：
    - PATCH /items/550e8400-e29b-41d4-a716-446655440000

    错误码：
    - 400: 请求参数错误
    - 401: 未登录
    - 403: 无权更新
    - 404: 项目不存在
    - 422: 数据验证失败

    注意：
    - 只更新提供的字段，未提供的字段保持不变
    """
    pass
````

### 5. DELETE 删除接口

```python
@router.delete(
    "/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除项目",
)
async def delete_item(
    item_id: Annotated[UUID, Path(description="项目ID")],
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """删除项目

    权限：
    - 需要登录
    - 只有所有者或管理员可以删除

    示例：
    - DELETE /items/550e8400-e29b-41d4-a716-446655440000

    错误码：
    - 401: 未登录
    - 403: 无权删除
    - 404: 项目不存在

    注意：
    - 删除操作不可恢复
    - 删除成功返回 204 No Content（无响应体）
    """
    pass
```

## 📋 快速检查清单

为每个接口添加注释时，确保包含：

- [ ] `summary`: 简短的一句话描述
- [ ] 权限说明（谁可以访问）
- [ ] 参数说明（路径参数、查询参数、请求体）
- [ ] 返回值说明
- [ ] 使用示例（至少 1 个）
- [ ] 常见错误码
- [ ] 注意事项（如果有）

## 🎨 Markdown 格式技巧

在 docstring 中可以使用 Markdown 格式：

````python
"""
# 一级标题

## 二级标题

**粗体文本**

*斜体文本*

- 列表项1
- 列表项2

1. 有序列表1
2. 有序列表2

`代码`

```json
{
    "key": "value"
}
\```

[链接文本](https://example.com)
"""
````

## 🔗 参考已完成的文件

查看这些文件作为参考：

- `backend/app/posts/routers/admin.py` - 管理接口示例
- `backend/app/posts/routers/public.py` - 公开接口示例
- `backend/app/posts/routers/me.py` - 个人中心接口示例
