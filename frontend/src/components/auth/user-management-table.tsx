"use client";

import { User, UserRole } from "@/shared/api/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  ShieldAlert,
  User as UserIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface UserManagementTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  isLoading?: boolean;
}

const RoleBadge = ({ role }: { role: UserRole }) => {
  const styles = {
    superadmin: "bg-red-500 hover:bg-red-600 border-transparent text-white",
    admin: "bg-blue-500 hover:bg-blue-600 border-transparent text-white",
    user: "bg-slate-500 hover:bg-slate-600 border-transparent text-white",
  };

  const labels = {
    superadmin: "超级管理员",
    admin: "管理员",
    user: "用户",
  };

  const icons = {
    superadmin: <ShieldAlert className="mr-1 h-3 w-3" />,
    admin: <Shield className="mr-1 h-3 w-3" />,
    user: <UserIcon className="mr-1 h-3 w-3" />,
  };

  return (
    <Badge
      className={cn("inline-flex items-center", styles[role] || styles.user)}
    >
      {icons[role] || icons.user}
      {labels[role] || role}
    </Badge>
  );
};

export function UserManagementTable({
  users,
  onEdit,
  onDelete,
  isLoading,
}: UserManagementTableProps) {
  const { user: currentUser } = useAuth();

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        加载用户数据中...
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border rounded-lg border-dashed">
        <UserIcon className="h-10 w-10 mb-2 opacity-20" />
        <p>暂无用户</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">头像</TableHead>
            <TableHead>用户</TableHead>
            <TableHead>角色</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            // Permission Logic for displaying Delete button
            // 1. Cannot delete self
            // 2. Admin cannot delete Superadmin
            // 3. User cannot delete anyone (but user won't see this table)
            const isSelf = currentUser?.id === user.id;
            const isTargetSuper = user.role === "superadmin";
            const isCurrentSuper = currentUser?.role === "superadmin";

            // Can delete if: Not self AND (Current is Super OR Target is NOT Super)
            const canDelete = !isSelf && (isCurrentSuper || !isTargetSuper);

            return (
              <TableRow key={user.id}>
                <TableCell>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar || ""} alt={user.username} />
                    <AvatarFallback>
                      {user.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <RoleBadge role={user.role || "user"} />
                </TableCell>
                <TableCell>
                  {user.isActive ? (
                    <Badge
                      variant="outline"
                      className="text-green-600 border-green-200 bg-green-50"
                    >
                      正常
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-destructive border-destructive/20 bg-destructive/10"
                    >
                      禁用
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">打开菜单</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>操作</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(user)}>
                        <Edit className="mr-2 h-4 w-4" />
                        编辑资料
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        disabled={!canDelete}
                        onClick={() => onDelete(user)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除账号
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
