import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUsersList,
  getUserById,
  updateUserById,
  deleteUserById,
  client,
} from "@/shared/api";
import { toSnakeCase } from "@/shared/api/helpers";
import type {
  User,
  UserList,
  UserUpdate,
  UserFilters,
  UserRole,
} from "@/shared/api/types";
import type {
  GetUsersListData,
  UpdateUserByIdData,
  DeleteUserByIdData,
} from "@/shared/api/generated/types.gen";
import { toast } from "sonner";

/**
 * User Create Payload (Manually defined as SDK might not be updated)
 */
export interface UserCreatePayload {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
  fullName?: string;
  bio?: string;
  avatar?: string;
  isActive?: boolean;
}

/**
 * Users Query Keys
 */
export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (filters: UserFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

/**
 * Hook for managing users (Admin only)
 */
export function useUsers() {
  const queryClient = useQueryClient();

  // 1. Fetch Users List
  const useUsersList = (filters: UserFilters = {}) => {
    return useQuery({
      queryKey: userKeys.list(filters),
      queryFn: async () => {
        const response = await getUsersList({
          query: filters as unknown as GetUsersListData["query"],
          throwOnError: true,
        });
        return response.data as unknown as UserList;
      },
      // Keep previous data when fetching new pages for smoother transition
      placeholderData: (previousData) => previousData,
    });
  };

  // 2. Fetch Single User
  const useUserDetail = (userId: string) => {
    return useQuery({
      queryKey: userKeys.detail(userId),
      queryFn: async () => {
        // Warning: This endpoint was previously Superuser only, now Admin.
        // Ensure backend is updated.
        const response = await getUserById({
          path: { user_id: userId } as unknown as any,
          throwOnError: true,
        });
        return response.data as unknown as User;
      },
      enabled: !!userId,
    });
  };

  // 3. Create User (Admin)
  // Using direct client request since SDK might be outdated
  const createUserMutation = useMutation({
    mutationFn: async (data: UserCreatePayload) => {
      // Manual request to POST /users/
      // Use toSnakeCase helper for automatic conversion
      const body = toSnakeCase({
        ...data,
        isActive: data.isActive ?? true,
      });

      const response = await client.post({
        url: "/users/",
        body,
        throwOnError: true,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("用户创建成功");
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  // 4. Update User
  const updateUserMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UserUpdate & { role?: UserRole };
    }) => {
      // Explicitly handle role if it's not in UserUpdate type of outdated SDK
      // but payload is flexible.
      // Use toSnakeCase from helpers (standard project pattern)
      const body = toSnakeCase(data);

      return await updateUserById({
        path: { user_id: id } as unknown as UpdateUserByIdData["path"],
        body: body as unknown as UpdateUserByIdData["body"],
        throwOnError: true,
      });
    },
    onSuccess: (_, { id }) => {
      toast.success("用户更新成功");
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  // 5. Delete User
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteUserById({
        path: { user_id: id } as unknown as DeleteUserByIdData["path"],
        throwOnError: true,
      });
    },
    onSuccess: () => {
      toast.success("用户已删除");
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  return {
    useUsersList,
    useUserDetail,
    createUser: createUserMutation.mutateAsync,
    isCreating: createUserMutation.isPending,
    updateUser: updateUserMutation.mutateAsync,
    isUpdating: updateUserMutation.isPending,
    deleteUser: deleteUserMutation.mutateAsync,
    isDeleting: deleteUserMutation.isPending,
  };
}
