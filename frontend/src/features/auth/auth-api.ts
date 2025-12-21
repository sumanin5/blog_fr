import {
  login as apiLogin,
  registerUser,
  getCurrentUserInfo,
  updateCurrentUserInfo,
} from "@/shared/api";

import type {
  UserResponse,
  UserRegister,
  UserUpdate,
  BodyLogin,
} from "@/shared/api";

/**
 * 认证相关 API 调用封装
 *
 * 将原始 API 调用封装成更符合业务逻辑的函数
 */

/**
 * 用户登录
 */
export const loginUser = async (
  credentials: BodyLogin,
): Promise<{ access_token: string }> => {
  const response = await apiLogin({ body: credentials, throwOnError: true });

  if (!response.data?.access_token) {
    throw new Error("登录失败：未收到访问令牌");
  }

  return {
    access_token: response.data.access_token,
  };
};

/**
 * 用户注册
 */
export const registerNewUser = async (
  userData: UserRegister,
): Promise<void> => {
  await registerUser({ body: userData, throwOnError: true });
};

/**
 * 获取当前用户信息
 */
export const fetchCurrentUser = async (): Promise<UserResponse | null> => {
  const token = localStorage.getItem("access_token");
  if (!token) {
    return null;
  }

  try {
    const response = await getCurrentUserInfo({ throwOnError: true });
    return response.data ?? null;
  } catch (error) {
    // Token 无效，清除本地存储
    localStorage.removeItem("access_token");
    throw error;
  }
};

/**
 * 更新当前用户信息
 */
export const updateUserProfile = async (
  userData: UserUpdate,
): Promise<void> => {
  await updateCurrentUserInfo({ body: userData, throwOnError: true });
};
