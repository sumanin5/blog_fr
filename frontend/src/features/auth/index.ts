// 认证功能模块导出
export { AuthProvider } from "./AuthContext";
export { useAuth } from "./useAuth";
export {
  useCurrentUser,
  useLogin,
  useRegister,
  useUpdateUser,
  useLogout,
} from "./useAuthQueries";
export {
  loginUser,
  registerNewUser,
  fetchCurrentUser,
  updateUserProfile,
} from "./auth-api";
