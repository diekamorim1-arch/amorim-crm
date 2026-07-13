// AdminTenantsPage — painel do admin_saas: visão de todas as lojas (tenants)
// cadastradas na plataforma. Busca as lojas de verdade via api.listTenants().
// "Entrar como gestor" permite ao admin operar dentro de uma loja (Pipeline,
// Clientes, Negócios, Fornecedores, Configurações) com permissão total de
// gestor, sem precisar sair da própria conta — ver ENTER_TENANT_AS_GESTOR em
// lib/store.tsx e o banner "Voltar ao painel" em AppShell.tsx.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { AdminNav } from "@/components/admin/AdminNav";
import { TenantFormDialog } from "@/components/admin/TenantFormDialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
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
import { ApiError, api, mapTenant, type TenantDeletionSummary } from "@/lib/apiClient";
import { PLAN_LABELS } from "@/lib/constants";
import { relativeTime } from "@/lib/format";
import { useCrm } from "@/lib/store";
import type { Tenant } from "@/lib/types";

function pt(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function AdminTenantsPage() {
  const { dispatch, dataVersion } = useCrm();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [enteringTenantId, setEnteringTenantId] = useState<string | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletionSummary, setDeletionSummary] = useState<TenantDeletionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  function fetchRemoteTenants() {
    return api.listTenants().then((rows) => setTenants(rows.map(mapTenant)));
  }

  async function handleEnterAsGestor(tenantId: string) {
    setEnteringTenantId(tenantId);
    try {
      const response = await api.impersonateTenant(tenantId);
      dispatch({ type: "ENTER_TENANT_AS_GESTOR", tenantId: response.tenant_id, tenantName: response.tenant_name });
      navigate("/");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível entrar na loja.");
    } finally {
      setEnteringTenantId(null);
    }
  }

  useEffect(() => {
    let active = true;
    fetchRemoteTenants().catch(() => active && toast.error("Não foi possível carregar as lojas."));
    return () => {
      active = false;
    };
  }, [dataVersion]);

  async function handleRequestDelete(tenant: Tenant) {
    setDeletingTenant(tenant);
    setDeletionSummary(null);
    setSummaryLoading(true);
    try {
      const summary = await api.getTenantDeletionSummary(tenant.id);
      setDeletionSummary(summary);
    } catch {
      // Sem a contagem, o AlertDialog ainda mostra o aviso genérico de risco
      // (ver description abaixo) — não bloqueia a exclusão por causa disso.
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleConfirmDelete() {
    const tenant = deletingTenant;
    if (!tenant) return;

    setDeleting(true);
    try {
      await api.deleteTenant(tenant.id);
      setTenants((prev) => prev.filter((t) => t.id !== tenant.id));
      toast.success(`Loja ${tenant.name} excluída.`);
      setDeletingTenant(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao excluir loja.");
    } finally {
      setDeleting(false);
    }
  }

  const activeTenants = tenants.filter((t) => t.status === "ativo").length;
  const planCounts = tenants.reduce<Record<Tenant["plan"], number>>(
    (acc, t) => ({ ...acc, [t.plan]: (acc[t.plan] ?? 0) + 1 }),
    { starter: 0, pro: 0 },
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Lojas</h1>
          <p className="text-sm text-muted-foreground">Todas as lojas cadastradas na plataforma.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/conta")}>
            Minha conta
          </Button>
          <Button onClick={() => setFormOpen(true)}>Nova loja</Button>
        </div>
      </div>

      <AdminNav />

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
            <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">—</p>
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
              <TableHead className="w-1" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => {
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
                  <TableCell className="font-mono tabular-nums text-foreground">—</TableCell>
                  <TableCell>
                    <Badge variant={tenant.status === "ativo" ? "outline" : "destructive"}>
                      {tenant.status === "ativo" ? "Ativo" : "Suspenso"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{relativeTime(tenant.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={enteringTenantId === tenant.id}
                        onClick={() => handleEnterAsGestor(tenant.id)}
                        className="whitespace-nowrap"
                      >
                        {enteringTenantId === tenant.id ? "Entrando…" : "Entrar como gestor"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRequestDelete(tenant)}
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

      <TenantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={fetchRemoteTenants}
      />

      <ConfirmDeleteDialog
        open={!!deletingTenant}
        onOpenChange={(open) => !open && setDeletingTenant(null)}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
        title={`Excluir ${deletingTenant?.name}?`}
        description={
          summaryLoading ? (
            "Verificando o que será apagado…"
          ) : deletionSummary ? (
            <>
              Esta loja tem <strong>{pt(deletionSummary.contacts, "cliente", "clientes")}</strong>,{" "}
              <strong>{pt(deletionSummary.deals, "negócio", "negócios")}</strong>,{" "}
              <strong>{pt(deletionSummary.suppliers, "fornecedor", "fornecedores")}</strong> e{" "}
              <strong>{pt(deletionSummary.users, "usuário", "usuários")}</strong> — excluir apaga tudo isso
              PERMANENTEMENTE (inclusive histórico de preços, anexos, agendamentos e as contas de login da equipe).
              Essa ação não pode ser desfeita.
            </>
          ) : (
            "Essa ação não pode ser desfeita — todo o dado vinculado a esta loja (clientes, negócios, fornecedores, " +
              "equipe) é apagado permanentemente."
          )
        }
      />
    </div>
  );
}
