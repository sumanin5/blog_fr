"use client";

import { useActionState, useEffect, useState } from "react";
import { useUsers, UserCreatePayload } from "@/hooks/use-users";
import { User, UserRole } from "@/shared/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, AlertCircle } from "lucide-react";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";

// Schema for validation
const userSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符"),
  email: z.string().email("邮箱格式不正确"),
  password: z.string().optional(), // Optional for edit
  fullName: z.string().optional(),
  bio: z.string().optional(),
  role: z.enum(["user", "admin", "superadmin"] as const),
  isActive: z.boolean().default(true),
});

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null; // If null, it's create mode
}

interface ActionState {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

export function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
  const { createUser, updateUser } = useUsers();
  const { user: currentUser } = useAuth();
  const isEdit = !!user;

  // Reset state when dialog opens/closes or user changes
  const [internalOpen, setInternalOpen] = useState(open);

  useEffect(() => {
    setInternalOpen(open);
  }, [open]);

  // Action Handler
  const submitAction = async (
    prevState: ActionState | null,
    formData: FormData,
  ): Promise<ActionState> => {
    const rawData = {
      username: formData.get("username") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      fullName: formData.get("fullName") as string,
      bio: formData.get("bio") as string,
      role: formData.get("role") as UserRole,
      isActive: formData.get("isActive") === "on",
    };

    // Prepare for validation
    // Password is required for create, optional for edit
    const schemaToValidate = userSchema;
    if (!isEdit && !rawData.password) {
      return { success: false, message: "创建用户必须设置密码" };
    }

    // Validate
    const result = schemaToValidate.safeParse(rawData);
    if (!result.success) {
      const errors: Record<string, string[]> = {};
      result.error.issues.forEach((err) => {
        const path = err.path[0] as string;
        if (!errors[path]) errors[path] = [];
        errors[path].push(err.message);
      });
      return { success: false, message: "请检查表单输入", errors };
    }

    const data = result.data;

    try {
      if (isEdit && user) {
        // Update
        // Only redundant fields if changed? Backend handles partial updates usually,
        // but here we send what we collected.
        // Remove password if empty
        const updatePayload = {
          ...data,
          password: data.password || undefined,
        };

        await updateUser({ id: user.id, data: updatePayload });
        return { success: true, message: "用户更新成功" };
      } else {
        // Create
        await createUser(data as UserCreatePayload);
        return { success: true, message: "用户创建成功" };
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "操作失败";
      return { success: false, message: msg };
    }
  };

  const [state, action, isPending] = useActionState(submitAction, null);

  // Close dialog on success
  useEffect(() => {
    if (state?.success) {
      const t = setTimeout(() => {
        onOpenChange(false);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [state?.success, onOpenChange]);

  // Permissions: Can only set Superadmin if current user is Superadmin
  const canAssignSuperAdmin = currentUser?.role === "superadmin";

  return (
    <Dialog open={internalOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑用户" : "创建新用户"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "修改用户信息和权限配置。"
              : "创建一个新的用户账号，默认密码建议由管理员分发。"}
          </DialogDescription>
        </DialogHeader>

        <form
          action={action}
          key={user?.id || "new"}
          className="space-y-6 py-4"
        >
          {/* Common Fields */}
          <div className="grid gap-4">
            {/* Username & Role Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  name="username"
                  defaultValue={user?.username}
                  placeholder="johndoe"
                  required
                />
                {state?.errors?.username && (
                  <p className="text-xs text-red-500">
                    {state.errors.username[0]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">角色</Label>
                <Select name="role" defaultValue={user?.role || "user"}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">普通用户 (User)</SelectItem>
                    <SelectItem value="admin">管理员 (Admin)</SelectItem>
                    {canAssignSuperAdmin && (
                      <SelectItem value="superadmin">
                        超级管理员 (Superadmin)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {state?.errors?.role && (
                  <p className="text-xs text-red-500">{state.errors.role[0]}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user?.email}
                placeholder="john@example.com"
                required
              />
              {state?.errors?.email && (
                <p className="text-xs text-red-500">{state.errors.email[0]}</p>
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">全名/昵称</Label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={user?.fullName || ""}
                placeholder="John Doe"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">个人简介</Label>
              <Input
                id="bio"
                name="bio"
                defaultValue={user?.bio || ""}
                placeholder="Something about user..."
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">
                {isEdit ? "重置密码 (留空则不修改)" : "初始密码"}
              </Label>
              <Input
                id="password"
                name="password"
                type="text" // Admin setting password visible usually fine, or 'password'
                placeholder={isEdit ? "不修改请留空" : "设置初始密码"}
              />
              {state?.errors?.password && (
                <p className="text-xs text-red-500">
                  {state.errors.password[0]}
                </p>
              )}
            </div>

            {/* Is Active */}
            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label htmlFor="isActive" className="text-base">
                  账户激活
                </Label>
                <p className="text-sm text-muted-foreground">
                  禁用后用户将无法登录
                </p>
              </div>
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={user ? user.isActive : true}
              />
            </div>

            {/* Error Box */}
            {state?.success === false && state.message && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}

            {/* Success Box */}
            {state?.success === true && state.message && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "保存更改" : "立即创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
