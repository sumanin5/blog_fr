# 媒体文件管理策略建议

## 📊 当前文件大小限制

### 分层限制架构

```
全局限制（中间件）: 50MB
    │
    ├─ 图片 (image): 10MB
    ├─ 视频 (video): 100MB (已超出全局限制，需调整)
    ├─ 文档 (document): 20MB
    └─ 其他 (other): 5MB
```

**问题**：视频限制100MB超过全局50MB，建议调整为一致。

### 建议调整

```python
# middleware/__init__.py - 提高全局限制
setup_file_upload_middleware(app, max_size=150 * 1024 * 1024)  # 150MB

# media/utils.py - 保持各类型限制
MAX_FILE_SIZES = {
    "image": 10 * 1024 * 1024,      # 10MB (普通图片)
    "video": 100 * 1024 * 1024,     # 100MB (短视频、demo)
    "document": 20 * 1024 * 1024,   # 20MB (PDF、文档)
    "other": 5 * 1024 * 1024,       # 5MB (杂项)
}
```

---

## 🗂️ 文件分批管理策略

### 1. 按时间周期分批 ⭐️⭐️⭐️

**推荐理由**：符合内容管理的自然规律

```python
# 在 MediaFileQuery schema 中添加
class MediaFileQuery(BaseModel):
    # ... 现有字段 ...

    # 时间筛选
    date_from: Optional[date] = None  # 起始日期
    date_to: Optional[date] = None    # 结束日期

    # 预设时间段
    time_period: Optional[Literal["today", "week", "month", "quarter", "year"]] = None
```

**前端UI**：
```
[今天] [本周] [本月] [本季度] [今年] [自定义日期范围]
```

### 2. 按存储占用分批 ⭐️⭐️

**目标**：避免单个用户占用过多存储空间

```python
# 在 config.py 添加配额配置
class Settings(BaseSettings):
    # 用户存储配额
    USER_STORAGE_QUOTA: int = Field(
        default=1024 * 1024 * 1024,  # 1GB
        description="单个用户存储配额（字节）"
    )

    # 超级管理员配额
    ADMIN_STORAGE_QUOTA: int = Field(
        default=10 * 1024 * 1024 * 1024,  # 10GB
        description="管理员存储配额"
    )
```

**实现**：
```python
# 在上传前检查配额
async def check_user_quota(user_id: UUID, file_size: int, session: AsyncSession) -> bool:
    """检查用户存储配额"""
    current_usage = await get_user_storage_usage(session, user_id)
    user_role = await get_user_role(user_id, session)

    quota = (
        settings.ADMIN_STORAGE_QUOTA
        if user_role in ["superadmin", "admin"]
        else settings.USER_STORAGE_QUOTA
    )

    return current_usage + file_size <= quota
```

### 3. 按文件用途分批 ⭐️⭐️

**目标**：方便按业务场景管理文件

```python
# 已实现的 FileUsage 枚举
class FileUsage(str, Enum):
    GENERAL = "general"     # 通用
    AVATAR = "avatar"       # 头像
    COVER = "cover"         # 封面
    ATTACHMENT = "attachment"  # 附件
    ICON = "icon"          # 图标
```

**前端UI**：
```
[全部] [封面图] [头像] [附件] [图标] [通用]
```

### 4. 按文件状态分批 ⭐️

**新增状态管理**：

```python
# 在 MediaFile model 添加
class MediaFile(SQLModel, table=True):
    # ... 现有字段 ...

    # 文件状态
    is_archived: bool = Field(default=False, description="是否已归档")
    archive_date: Optional[datetime] = Field(default=None, description="归档日期")

    # 使用情况
    reference_count: int = Field(default=0, description="被引用次数")
    last_accessed_at: Optional[datetime] = Field(default=None, description="最后访问时间")
```

**批次类型**：
- **活跃文件**：最近30天使用过的
- **闲置文件**：30-90天未使用的
- **归档文件**：90天以上未使用的
- **孤立文件**：未被任何内容引用的

---

## 💡 推荐实施顺序

### Phase 1: 基础分批（立即实施）

- [x] 按类型筛选（已实现）
- [x] 按用途筛选（已实现）
- [x] 搜索功能（已实现）
- [ ] **添加时间范围筛选**（推荐优先实施）

```python
# 实现示例
@router.get("/", response_model=MediaFileListResponse)
async def get_user_files(
    # ... 现有参数 ...
    date_from: Optional[date] = Query(None, description="起始日期"),
    date_to: Optional[date] = Query(None, description="结束日期"),
):
    # 在 CRUD 查询中添加时间过滤
    if date_from:
        stmt = stmt.where(MediaFile.created_at >= datetime.combine(date_from, time.min))
    if date_to:
        stmt = stmt.where(MediaFile.created_at <= datetime.combine(date_to, time.max))
```

### Phase 2: 配额管理（近期实施）

- [ ] 实现存储配额检查
- [ ] 显示用户存储使用率
- [ ] 配额超限提示

### Phase 3: 高级管理（长期规划）

- [ ] 文件归档功能
- [ ] 自动清理孤立文件
- [ ] 文件访问统计
- [ ] 批量归档/删除工具

---

## 📈 用户体验优化

### 前端筛选UI建议

```tsx
<MediaFilters>
  {/* 时间筛选 */}
  <TimeFilter
    presets={["today", "week", "month", "year"]}
    customRange={true}
  />

  {/* 类型筛选 */}
  <TypeFilter
    options={["image", "video", "document", "other"]}
  />

  {/* 用途筛选 */}
  <UsageFilter
    options={["cover", "avatar", "attachment", "general"]}
  />

  {/* 状态筛选 */}
  <StatusFilter
    options={["active", "idle", "archived", "orphaned"]}
  />

  {/* 存储信息 */}
  <StorageIndicator
    used={usedStorage}
    total={totalQuota}
  />
</MediaFilters>
```

---

## 🎯 总结

### 是否需要分批管理？

**答案**：**是的**，建议实施分批管理，理由如下：

1. **性能考虑**：随着文件数量增长，全量加载会变慢
2. **用户体验**：分批浏览更符合使用习惯
3. **存储管理**：需要追踪和控制存储使用
4. **维护方便**：便于清理无用文件

### 优先级排序

1. **🔥 高优先级**：时间范围筛选（立即实施）
2. **⭐ 中优先级**：存储配额管理（近期实施）
3. **💡 低优先级**：归档和自动清理（长期规划）

### 关键指标监控

- 每日上传文件数
- 存储空间增长率
- 孤立文件比例
- 平均文件大小
- 用户配额使用率

---

**建议**：先实施时间范围筛选，这是最容易实现且最实用的分批功能。
