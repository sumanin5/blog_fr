// ============================================
// 认证功能模块统一导出
// ============================================

// Provider 和 Hook
export { AuthProvider, useAuth } from "./AuthProvider";

// Query Hooks（直接从组件使用 TanStack Query）
export {
  useCurrentUser,
  useLogin,
  useRegister,
  useUpdateUser,
  useLogout,
} from "./auth";

// API 函数（通常不需要直接导出，但保留以便特殊场景使用）
export {
  loginUser,
  registerNewUser,
  fetchCurrentUser,
  updateUserProfile,
  authQueryKeys,
} from "./auth";
