"use client";

import { useState } from "react";
import { useUsers } from "@/hooks/use-users";
import { UserManagementTable } from "@/components/auth/user-management-table";
import { UserDialog } from "@/components/auth/user-dialog";
import { User } from "@/shared/api/types";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function UsersPage() {
  const { useUsersList, deleteUser } = useUsers();
  const { data: usersData, isLoading } = useUsersList();

  // State for Dialogs
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // State for Delete Confirmation
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Handlers
  const handleCreate = () => {
    setEditingUser(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setDeletingUser(user);
  };

  const handleConfirmDelete = async () => {
    if (deletingUser) {
      await deleteUser(deletingUser.id);
      setDeletingUser(null);
    }
  };

  return (
    <div className="flex h-full flex-col space-y-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">用户管理</h2>
          <p className="text-muted-foreground">
            管理系统用户，创建新账号或修改权限。
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新建用户
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <UserManagementTable
        users={usersData?.users || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      {/* Edit/Create Dialog */}
      <UserDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingUser(null);
        }}
        user={editingUser}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除用户?</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除用户 <strong>{deletingUser?.username}</strong>{" "}
              的账号。 此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
