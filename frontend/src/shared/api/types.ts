import * as Raw from "./generated/types.gen";
import { type ApiData } from "./transformers";

/**
 * 👑 全量前端高保真模型体系 (Exhaustive Domain Model System)
 *
 * 核心目标：
 * 1. 彻底隔离后端 snake_case 命名法。
 * 2. 这里的每一个类型进入 UI 或 Hook 时都是 100% 的驼峰。
 * 3. 命名语义化：遵循 [业务实体][动作/属性] 模式。
 */

// ============================================
// 1. 身份认证与用户 (Auth & Users)
// ============================================

// 基础实体
export type User = ApiData<Raw.UserResponse>;
export type Token = ApiData<Raw.TokenResponse>;
export type UserProfile = User; // 直接使用 User 模型

// 请求载荷 (Payloads)
export type UserLogin = ApiData<Raw.BodyLogin>;
export type UserRegister = ApiData<Raw.UserRegister>;
export type UserUpdate = ApiData<Raw.UserUpdate>;
export type UserAdminUpdate = ApiData<Raw.UserUpdate>; // 管理员更新用户使用相同结构

// 列表与过滤
export type UserList = ApiData<Raw.UserListResponse>;
export type UserFilters = ApiData<Raw.GetUsersListData["query"]>;

// ============================================
// 2. 媒体中心 (Media Inventory)
// ============================================

// 基础实体
export type MediaFile = ApiData<Raw.MediaFileResponse>;

interface RawMediaStats {
  totalFiles: number;
  totalSize: number;
  byType: Record<string, number>;
  byUsage: Record<string, number>;
  publicFiles: number;
  privateFiles: number;
}

export type MediaStats = RawMediaStats; // 由于 useMediaStats 已经做了转换，这里直接用 CamelCase 后的类型

// 请求载荷 (Payloads)
export type MediaUploadPayload = ApiData<Raw.BodyUploadFile>;
export type MediaUpdatePayload = ApiData<Raw.MediaFileUpdate>;
export type MediaBatchDelete = ApiData<Raw.BatchDeleteRequest>;
export type MediaTogglePublicity = ApiData<Raw.TogglePublicityRequest>;

// 响应结果
export type MediaUploadResult = ApiData<Raw.MediaFileUploadResponse>;
export type MediaBatchDeleteResult = ApiData<Raw.BatchDeleteResponse>;

// 列表与过滤 (直接使用 Page[Model] 类型，避开 200: Wrapper)
export type UserMediaList = ApiData<Raw.PageMediaFileResponse>;
export type AdminMediaList = ApiData<Raw.PageMediaFileResponse>;
export type PublicMediaList = ApiData<Raw.PageMediaFileResponse>;
export type PageMedia = ApiData<Raw.PageMediaFileResponse>;

export type MediaFilters = ApiData<Raw.GetUserFilesData["query"]> & {
  mimeType?: string;
};
export type AdminMediaFilters = ApiData<Raw.GetAllFilesAdminData["query"]>;
export type MediaSearchFilters = ApiData<Raw.SearchFilesData["query"]>;

// Path 参数类型（用于路径参数的 camelCase 版本）
export type ViewFilePath = ApiData<Raw.ViewFileData["path"]>;
export type ViewThumbnailPath = ApiData<Raw.ViewThumbnailData["path"]>;
export type GetFileDetailPath = ApiData<Raw.GetFileDetailData["path"]>;
export type UpdateFilePath = ApiData<Raw.UpdateFileData["path"]>;
export type DeleteFilePath = ApiData<Raw.DeleteFileData["path"]>;
export type RegenerateThumbnailsPath = ApiData<
  Raw.RegenerateThumbnailsData["path"]
>;

// ============================================
// 3. 文章内容 (Content & Posts)
// ============================================

// 基础实体
export type Post = ApiData<Raw.PostDetailResponse>;
export type PostDetail = Post;
export type PostShort = ApiData<Raw.PostShortResponse>;
export type PostVersion = ApiData<Raw.PostVersionResponse>;
export type PostTypeInfo = ApiData<Raw.PostTypeResponse>;

// 请求载荷 (Payloads)
export type PostCreate = ApiData<Raw.PostCreate>;
export type PostUpdate = ApiData<Raw.PostUpdate>;
export type PostPreviewRequest = ApiData<Raw.PostPreviewRequest>;

// 响应结果
export type PostLikeResult = ApiData<Raw.PostLikeResponse>;
export type PostBookmarkResult = ApiData<Raw.PostBookmarkResponse>;
export type PostPreviewResult = ApiData<Raw.PostPreviewResponse>;

// 列表与过滤
export type PostList = ApiData<Raw.PagePostShortResponse>;
export type AdminPostList = ApiData<Raw.PagePostShortResponse>;
export type MyPostList = ApiData<Raw.PagePostShortResponse>;

export type PostFilters = ApiData<Raw.ListPostsByTypeData["query"]>;
export type AdminPostFilters = ApiData<Raw.ListPostsByTypeAdminData["query"]>;
export type MyPostFilters = ApiData<Raw.GetMyPostsData["query"]>;
export type GlobalAdminPostFilters = ApiData<
  Raw.ListAllPostsAdminData["query"]
>;

// ============================================
// 4. 分类与组织 (Taxonomy)
// ============================================

// 基础实体
export type Category = ApiData<Raw.CategoryResponse>;
export type Tag = ApiData<Raw.TagResponse>;

// 请求载荷 (Payloads)
export type CategoryCreate = ApiData<Raw.CategoryCreate>;
export type CategoryUpdate = ApiData<Raw.CategoryUpdate>;
export type TagUpdate = ApiData<Raw.TagUpdate>;
export type TagMergePayload = ApiData<Raw.TagMergeRequest>;

// 响应结果
export type TagCleanupResult = ApiData<Raw.TagCleanupResponse>;

// 列表与过滤
export type CategoryList = ApiData<Raw.PageCategoryResponse>;
export type TagList = ApiData<Raw.PageTagResponse>;

export type CategoryFilters = ApiData<Raw.ListCategoriesByTypeData["query"]>;
export type TagFilters = ApiData<Raw.ListTagsData["query"]>;
export type TagByTypeFilters = ApiData<Raw.ListTagsByTypeData["query"]>;

// ============================================
// 5. 系统与同步 (System & Sync)
// ============================================

// 基础实体
export type SyncStatus = ApiData<Raw.SyncStats>;
export type SyncPreview = ApiData<Raw.PreviewResult>;
export type SyncError = ApiData<Raw.SyncError>;
export type WebhookResult = ApiData<Raw.WebhookResponse>;
export type OperationResult = ApiData<Raw.OperationResponse>;

// 请求载荷
export type SyncTriggerFilters = ApiData<Raw.TriggerSyncData["query"]>;

// ============================================
// 🚀 系统级透传 (SDK 内置核心配置)
// ============================================
export type FileUsage = Raw.FileUsage;
export type MediaType = Raw.MediaType;
export type PostStatus = Raw.PostStatus;
export type PostType = Raw.PostType;
export type UserRole = Raw.UserRole;
export type ErrorDetail = ApiData<Raw.ErrorDetail>;

// ============================================
// 6. 流量分析 (Analytics)
// ============================================

// 基础实体 & 统计
export type AnalyticsOverview = ApiData<Raw.AnalyticsStatsOverview>;
export type AnalyticsDailyTrend = ApiData<Raw.DailyTrend>;
export type AnalyticsTopPost = ApiData<Raw.TopPostStat>;

export type AnalyticsDashboard = ApiData<Raw.DashboardStats>;

export type AnalyticsSessionList = ApiData<Raw.PageSessionListItem>;
export type AnalyticsSessionItem = ApiData<Raw.SessionListItem>;
export type AnalyticsSessionDetail = ApiData<Raw.AnalyticsSessionDetail>;
export type SessionEvent = ApiData<Raw.SessionEvent>;

export type DeviceStats = ApiData<Raw.DeviceStats>;
export type AnalyticsWebVitals = ApiData<Raw.WebVitalsSummary>;

// 请求载荷 (Payloads)
export type AnalyticsEventPayload = ApiData<Raw.AnalyticsEventCreate>;

// 响应结果
export type AnalyticsEventResult = ApiData<Raw.AnalyticsEventResponse>;

// 指令参数 (SDK Data Wrappers)
export type {
  LogAnalyticsEventData,
  GetAnalyticsOverviewData,
  GetAnalyticsTrendData,
  GetAnalyticsTopPostsData,
  GetAnalyticsDashboardData,
  GetAnalyticsSessionsData,
  GetAnalyticsSessionDetailData,
  GetAnalyticsWebVitalsData,
} from "./generated/types.gen";

// ============================================
// 🛠️ Data 类透传 (用于 SDK 路径参数校验)
// ============================================
export type {
  RegisterUserData,
  LoginData,
  UpdateCurrentUserInfoData,
  GetUsersListData,
  UpdateUserByIdData,
  UploadFileData,
  UpdateFileData,
  GetUserFilesData,
  GetAllFilesAdminData,
  SearchFilesData,
  BatchDeleteFilesData,
  ListPostsByTypeAdminData,
  ListAllPostsAdminData,
  GetMyPostsData,
  CreatePostByTypeData,
  UpdatePostByTypeData,
  TriggerSyncData,
} from "./generated/types.gen";
