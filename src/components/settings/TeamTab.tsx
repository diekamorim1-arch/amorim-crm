// TeamTab — lista a equipe do tenant com edição inline de papel via select,
// status ativo/inativo (Switch), editar nome/e-mail e excluir. Chama a API
// (com refresh da lista depois).

import { useState } from "react";
import { toast } from "sonner";

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
import { EditUserDialog } from "@/components/settings/EditUserDialog";
import { InviteUserDialog } from "@/components/settings/InviteUserDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, api, mapUser } from "@/lib/apiClient";
import { ROLE_LABELS } from "@/lib/constants";
import { useCrm } from "@/lib/store";
import type { Role, User } from "@/lib/types";

interface TeamTabProps {
  users: User[];
}

const ASSIGNABLE_ROLES: Role[] = ["atendente", "gestor"];

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function TeamTab({ users }: TeamTabProps) {
  const { state, dispatch } = useCrm();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const currentUserId = state.session?.userId;

  async function handleRoleChange(user: User, role: Role) {
    if (role === user.role) return;

    try {
      const updated = await api.updateUserRole(user.id, role);
      dispatch({ type: "UPDATE_USER", user: mapUser(updated) });
      toast.success(`Papel de ${user.name} atualizado.`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao atualizar papel.");
    }
  }

  async function handleToggleActive(user: User) {
    const nextActive = !user.isActive;

    try {
      const updated = await api.updateUserStatus(user.id, nextActive);
      dispatch({ type: "UPDATE_USER", user: mapUser(updated) });
      toast.success(nextActive ? `${user.name} reativado.` : `${user.name} desativado.`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao atualizar status.");
    }
  }

  async function handleConfirmDelete() {
    const user = deletingUser;
    if (!user) return;

    try {
      await api.deleteUser(user.id);
      dispatch({ type: "REMOVE_USER", userId: user.id });
      toast.success(`${user.name} removido da equipe.`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao excluir usuário.");
    } finally {
      setDeletingUser(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        <Button onClick={() => setInviteOpen(true)}>Convidar</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarFallback style={{ backgroundColor: user.avatarColor, color: "#fff" }}>
                          {initials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Select value={user.role} onValueChange={(value) => handleRoleChange(user, value as Role)}>
                      <SelectTrigger size="sm" className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.isActive}
                        disabled={isSelf}
                        onCheckedChange={() => handleToggleActive(user)}
                        aria-label={user.isActive ? "Desativar" : "Reativar"}
                      />
                      <Badge variant={user.isActive ? "outline" : "secondary"}>
                        {user.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isSelf}
                        onClick={() => setDeletingUser(user)}
                        className="text-destructive hover:text-destructive"
                      >
                        Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <EditUserDialog
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
      />

      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deletingUser?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Se este usuário tiver clientes ou negócios atribuídos, a exclusão será
              bloqueada — desative a conta nesse caso, em vez de excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
