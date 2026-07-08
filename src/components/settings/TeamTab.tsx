// TeamTab — lista a equipe do tenant com edição inline de papel via select;
// "Convidar" abre o InviteUserDialog, que despacha ADD_USER.

import { useState } from "react";
import { toast } from "sonner";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_LABELS } from "@/lib/constants";
import type { CrmAction, Dispatch } from "@/lib/store";
import type { Role, Tenant, User } from "@/lib/types";

interface TeamTabProps {
  tenant: Tenant;
  users: User[];
  dispatch: Dispatch<CrmAction>;
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

export function TeamTab({ tenant, users, dispatch }: TeamTabProps) {
  const [inviteOpen, setInviteOpen] = useState(false);

  function handleRoleChange(user: User, role: Role) {
    if (role === user.role) return;
    dispatch({ type: "UPDATE_USER", user: { ...user, role } });
    toast.success(`Papel de ${user.name} atualizado.`);
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
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
                  <Badge variant="outline">Ativo</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} tenantId={tenant.id} dispatch={dispatch} />
    </div>
  );
}
