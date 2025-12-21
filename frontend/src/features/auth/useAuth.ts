import { useContext } from "react";
import { AuthContext } from "./AuthContext";

/**
 * 使用认证上下文的 Hook
 * 必须在 AuthProvider 内部使用
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
