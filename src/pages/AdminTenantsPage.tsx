// AdminTenantsPage — painel do admin_saas: visão de todas as lojas (tenants)
// cadastradas na plataforma (não há escopo de tenant para este papel — lê
// state.tenants/state.users diretamente, ao contrário das telas de gestor que
// usam tenantScope). Resumo + tabela + ações de criar loja e entrar como
// gestor (impersonação, ver AppShell).

import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { TenantFormDialog } from "@/components/admin/TenantFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PLAN_LABELS } from "@/lib/constants";
import { relativeTime } from "@/lib/format";
import { useCrm } from "@/lib/store";
import type { Tenant } from "@/lib/types";

export function AdminTenantsPage() {
  const { state, dispatch } = useCrm();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);

  const { tenants, users } = state;

  const activeTenants = tenants.filter((t) => t.status === "ativo").length;
  const totalUsers = users.filter((u) => u.tenantId).length;
  const planCounts = tenants.reduce<Record<Tenant["plan"], number>>(
    (acc, t) => ({ ...acc, [t.plan]: (acc[t.plan] ?? 0) + 1 }),
    { starter: 0, pro: 0 },
  );

  function handleEnterAsGestor(tenantId: string, tenantName: string) {
    dispatch({ type: "ENTER_TENANT_AS_GESTOR", tenantId });
    toast.success(`Você entrou como gestor de ${tenantName}.`);
    navigate("/");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Lojas</h1>
          <p className="text-sm text-muted-foreground">Todas as lojas cadastradas na plataforma.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>Nova loja</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="gap-3 py-5">
          <CardHeader className="px-5">
            <p className="text-sm text-muted-foreground">Lojas ativas</p>
          </CardHeader>
          <CardContent className="px-5">
            <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{activeTenants}</p>
          </CardContent>
        </Card>

        <Card className="gap-3 py-5">
          <CardHeader className="px-5">
            <p className="text-sm text-muted-foreground">Usuários totais</p>
          </CardHeader>
          <CardContent className="px-5">
            <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">{totalUsers}</p>
          </CardContent>
        </Card>

        <Card className="gap-3 py-5">
          <CardHeader className="px-5">
            <p className="text-sm text-muted-foreground">Distribuição por plano</p>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 px-5">
            {(Object.keys(PLAN_LABELS) as Tenant["plan"][]).map((plan) => (
              <Badge key={plan} variant={plan === "pro" ? "default" : "secondary"}>
                <span className="font-mono tabular-nums">{planCounts[plan]}</span> {PLAN_LABELS[plan]}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loja</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Usuários</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => {
              const userCount = users.filter((u) => u.tenantId === tenant.id).length;
              return (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{tenant.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{tenant.slug}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tenant.plan === "pro" ? "default" : "secondary"}>
                      {PLAN_LABELS[tenant.plan]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono tabular-nums text-foreground">{userCount}</TableCell>
                  <TableCell>
                    <Badge variant={tenant.status === "ativo" ? "outline" : "destructive"}>
                      {tenant.status === "ativo" ? "Ativo" : "Suspenso"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{relativeTime(tenant.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEnterAsGestor(tenant.id, tenant.name)}
                    >
                      Entrar como gestor
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <TenantFormDialog open={formOpen} onOpenChange={setFormOpen} tenants={tenants} dispatch={dispatch} />
    </div>
  );
}
