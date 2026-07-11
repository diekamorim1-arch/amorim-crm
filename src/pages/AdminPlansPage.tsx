// AdminPlansPage — painel do admin_saas: plano e cobrança de cada loja.
// Billing manual (sem gateway de pagamento) — o admin marca "renovado"
// aqui quando recebe o pagamento por fora (ex. Pix); o backend bloqueia
// gestor/atendente de uma loja vencida (billing_status != "em_dia" E
// plan_expires_at no passado — ver require_tenant em app/deps.py).

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

import { AdminNav } from "@/components/admin/AdminNav";
import { BillingDialog } from "@/components/admin/BillingDialog";
import { EmptyState } from "@/components/EmptyState";
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
import { api, mapTenant } from "@/lib/apiClient";
import { BILLING_STATUS_LABELS, PLAN_CATALOG, PLAN_LABELS } from "@/lib/constants";
import { brl } from "@/lib/format";
import type { Tenant } from "@/lib/types";

function isReallyExpired(tenant: Tenant): boolean {
  if (tenant.billingStatus === "em_dia" || !tenant.planExpiresAt) return false;
  return new Date(tenant.planExpiresAt).getTime() < Date.now();
}

export function AdminPlansPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  function fetchTenants() {
    return api.listTenants().then((rows) => setTenants(rows.map(mapTenant)));
  }

  useEffect(() => {
    let active = true;
    fetchTenants()
      .catch(() => active && toast.error("Não foi possível carregar as lojas."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Planos</h1>
          <p className="text-sm text-muted-foreground">Plano e cobrança de cada loja da plataforma.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/conta")}>
          Minha conta
        </Button>
      </div>

      <AdminNav />

      {loading ? null : tenants.length === 0 ? (
        <EmptyState icon={CreditCard} title="Nenhuma loja encontrada" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loja</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Cobrança</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => {
                const expired = isReallyExpired(tenant);
                return (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium text-foreground">{tenant.name}</TableCell>
                    <TableCell>
                      <Badge variant={tenant.plan === "pro" ? "default" : "secondary"}>
                        {PLAN_LABELS[tenant.plan]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-muted-foreground">
                      {brl(PLAN_CATALOG[tenant.plan].price)}/mês
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {tenant.planExpiresAt ? new Date(tenant.planExpiresAt).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={expired ? "destructive" : tenant.billingStatus === "em_dia" ? "outline" : "secondary"}>
                        {expired ? "Vencido" : BILLING_STATUS_LABELS[tenant.billingStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingTenant(tenant)}>
                        Gerenciar cobrança
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <BillingDialog
        tenant={editingTenant}
        open={!!editingTenant}
        onOpenChange={(open) => !open && setEditingTenant(null)}
        onUpdated={fetchTenants}
      />
    </div>
  );
}
