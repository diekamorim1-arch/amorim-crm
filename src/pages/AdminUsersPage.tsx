// AdminUsersPage — painel do admin_saas: todos os usuários de todas as
// lojas, via GET /api/v1/admin/users (endpoint dedicado — as rotas normais
// de /users são tenant-scoped e não dariam essa visão sem vazar dados entre
// tenants).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { UserRoundX } from "lucide-react";
import { toast } from "sonner";

import { AdminNav } from "@/components/admin/AdminNav";
import { EmptyState } from "@/components/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, mapAdminUser, type AdminUser } from "@/lib/apiClient";
import { ROLE_LABELS } from "@/lib/constants";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const ADMIN_SAAS_GROUP_KEY = "__admin_saas__";

interface UserGroup {
  key: string;
  label: string;
  users: AdminUser[];
}

// Uma seção por loja (tenant_id) + uma seção à parte "Admin do SaaS" pros
// usuários sem tenant.
function groupByTenant(users: AdminUser[]): UserGroup[] {
  const groups = new Map<string, UserGroup>();
  for (const user of users) {
    const key = user.tenantId ?? ADMIN_SAAS_GROUP_KEY;
    const label = user.tenantId ? (user.tenantName ?? "Loja sem nome") : "Admin do SaaS";
    if (!groups.has(key)) groups.set(key, { key, label, users: [] });
    groups.get(key)!.users.push(user);
  }
  return [...groups.values()].sort((a, b) => {
    if (a.key === ADMIN_SAAS_GROUP_KEY) return 1;
    if (b.key === ADMIN_SAAS_GROUP_KEY) return -1;
    return a.label.localeCompare(b.label);
  });
}

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .listAdminUsers()
      .then((rows) => active && setUsers(rows.map(mapAdminUser)))
      .catch(() => active && toast.error("Não foi possível carregar os usuários."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">Todos os usuários de todas as lojas da plataforma.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/conta")}>
          Minha conta
        </Button>
      </div>

      <AdminNav />

      {loading ? null : users.length === 0 ? (
        <EmptyState icon={UserRoundX} title="Nenhum usuário encontrado" />
      ) : (
        <div className="flex flex-col gap-6">
          {groupByTenant(users).map((group) => (
            <div key={group.key} className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-foreground">
                {group.label} <span className="text-muted-foreground">({group.users.length})</span>
              </h2>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar size="sm">
                              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                              <AvatarFallback style={{ backgroundColor: user.avatarColor, color: "#fff" }}>
                                {initials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{user.name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "outline" : "destructive"}>
                            {user.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
