# Router 架构设计文档

## 统一的权限分层策略

本项目采用**两层权限检查**机制，清晰分离粗粒度和细粒度权限控制。

### 权限分层

```
┌─────────────────────────────────────────────────────────┐
│                      路由层 (Router)                      │
│  - 粗粒度权限：是否登录、是否管理员                        │
│  - 使用 Depends(get_current_active_user)                 │
│  - 使用 Depends(get_current_adminuser)                   │
│  - 使用 Depends(get_current_superuser)                   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     服务层 (Service)                      │
│  - 细粒度权限：是否是作者/所有者                          │
│  - 超级管理员绕过所有细粒度检查                           │
│  - 抛出 InsufficientPermissionsError                     │
└─────────────────────────────────────────────────────────┘
```

### 权限级别

1. **公开接口** - 无需任何认证
2. **登录用户** - `Depends(get_current_active_user)`
3. **管理员** - `Depends(get_current_adminuser)`
4. **超级管理员** - `Depends(get_current_superuser)`

### 超级管理员特权

超级管理员（`is_superadmin=True`）拥有完全权限：

- 可以修改/删除任何用户的文章
- 可以修改/删除任何用户的媒体文件
- 绕过所有细粒度权限检查

## 三个模块的统一风格

### Posts Router

```python
# 公开接口
@router.get("", response_model=PostListResponse)
async def list_posts(
    filters: Annotated[PostFilterParams, Depends()],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """获取文章列表（公开）"""
    ...

# 需要登录
@router.post("", response_model=PostDetailResponse, status_code=201)
async def create_post(
    post_in: PostCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """创建文章（需要登录）"""
    return await service.create_post(session, post_in, current_user.id)

# 需要登录 + 细粒度权限检查在 service 层
@router.patch("/{post_id}", response_model=PostDetailResponse)
async def update_post(
    post_id: UUID,
    post_in: PostUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """更新文章（需要是作者或超级管理员）"""
    return await service.update_post(session, post_id, post_in, current_user)
```

### Media Router

```python
# 公开接口
@router.get("/public", response_model=list[MediaFileResponse])
async def get_public_files(
    params: PublicMediaFilesParams = Depends(),
    session: AsyncSession = Depends(get_async_session),
):
    """获取公开文件列表（无需认证）"""
    ...

# 需要登录
@router.post("/upload", response_model=MediaFileUploadResponse, status_code=201)
async def upload_file(
    file: Annotated[UploadFile, Depends(validate_file_upload())],
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    ...
):
    """上传文件（需要登录）"""
    ...

# 需要登录 + 细粒度权限检查在 service 层
@router.delete("/{file_id}", status_code=204)
async def delete_file(
    file_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """删除文件（需要是所有者或超级管理员）"""
    await service.delete_media_file(
        session, file_id, current_user.id, current_user.is_superadmin
    )
    return None

# 需要管理员权限
@router.get("/admin/all", response_model=MediaFileListResponse)
async def get_all_files_admin(
    current_user: Annotated[User, Depends(get_current_adminuser)],
    query_params: Annotated[MediaFileQuery, Depends(get_media_query_params)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    """获取所有文件（仅管理员）"""
    ...
```

### Users Router

```python
# 公开接口
@router.post("/register", response_model=UserResponse, status_code=201)
async def register_user(
    user_in: UserRegister,
    session: Annotated[AsyncSession, Depends(get_async_session)]
):
    """注册新用户（公开）"""
    ...

# 需要登录
@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """获取当前用户信息（需要登录）"""
    return current_user

# 需要超级管理员权限
@router.get("/", response_model=UserListResponse)
async def get_users_list(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(get_current_superuser)],
    ...
):
    """获取用户列表（仅超级管理员）"""
    ...
```

## Service 层权限检查示例

### Posts Service

```python
async def update_post(
    session: AsyncSession, post_id: UUID, post_in: PostUpdate, current_user: User
) -> Post:
    """更新文章（带细粒度权限检查）"""
    db_post = await crud.get_post_by_id(session, post_id)
    if not db_post:
        raise PostNotFoundError()

    # 细粒度权限检查：超级管理员可以修改任何文章，普通用户只能修改自己的
    if not current_user.is_superadmin and db_post.author_id != current_user.id:
        raise InsufficientPermissionsError("只能修改自己的文章")

    # 业务逻辑...
    ...
```

### Media Service

```python
async def delete_media_file(
    session: AsyncSession,
    file_id: UUID,
    current_user_id: UUID,
    is_superadmin: bool = False
) -> None:
    """删除媒体文件（带细粒度权限检查）"""
    media_file = await crud.get_media_file(session, file_id)
    if not media_file:
        raise MediaFileNotFoundError(f"媒体文件不存在: {file_id}")

    # 细粒度权限检查：超级管理员可以删除任何文件，普通用户只能删除自己的
    if not is_superadmin and media_file.uploader_id != current_user_id:
        raise InsufficientPermissionsError("只能删除自己上传的文件")

    # 业务逻辑...
    ...
```

## 优势

### 1. 清晰的职责分离

- **路由层**：HTTP 请求处理、参数验证、粗粒度权限
- **Service 层**：业务逻辑、细粒度权限、数据操作协调
- **CRUD 层**：纯数据库操作

### 2. 易于理解和维护

```python
# 一眼就能看出这个接口需要什么权限
@router.delete("/{post_id}")
async def delete_post(
    post_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],  # 需要登录
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    # 细粒度权限在 service 里检查
    await service.delete_post(session, post_id, current_user)
```

### 3. 灵活的权限控制

- 超级管理员自动绕过细粒度检查
- 普通用户只能操作自己的资源
- 管理员可以查看所有资源（但不能修改）

### 4. 统一的错误处理

所有权限错误都抛出 `InsufficientPermissionsError`，由全局异常处理器统一处理。

## 迁移指南

### 从旧的 Dependencies 风格迁移

**旧风格（不推荐）：**

```python
# dependencies.py
async def check_post_owner_or_admin(
    post: Annotated[Post, Depends(get_post_by_id_dep)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> Post:
    if not current_user.is_admin and post.author_id != current_user.id:
        raise InsufficientPermissionsError()
    return post

# router.py
@router.patch("/{post_id}")
async def update_post(
    db_post: Annotated[Post, Depends(check_post_owner_or_admin)],
    ...
):
```

**新风格（推荐）：**

```python
# router.py
@router.patch("/{post_id}")
async def update_post(
    post_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    ...
):
    return await service.update_post(session, post_id, post_in, current_user)

# service.py
async def update_post(
    session: AsyncSession, post_id: UUID, post_in: PostUpdate, current_user: User
) -> Post:
    db_post = await crud.get_post_by_id(session, post_id)
    if not db_post:
        raise PostNotFoundError()

    if not current_user.is_superadmin and db_post.author_id != current_user.id:
        raise InsufficientPermissionsError("只能修改自己的文章")

    # 业务逻辑...
```

## 总结

这套架构设计：

- ✅ 清晰的权限分层
- ✅ 统一的代码风格
- ✅ 易于测试和维护
- ✅ 超级管理员特权支持
- ✅ 符合 FastAPI 最佳实践
