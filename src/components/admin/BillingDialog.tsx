// BillingDialog — gerenciar cobrança de uma loja: status (em dia/vencido/
// cancelado) e data de vencimento do plano. Billing manual (sem gateway de
// pagamento) — o admin marca "renovado" à mão quando recebe o pagamento por
// fora (ex. Pix). Os botões "+30 dias"/"+365 dias" só preenchem o campo de
// data a partir de hoje; a confirmação em "Salvar" é sempre explícita.

import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError, api } from "@/lib/apiClient";
import { BILLING_STATUS_LABELS, PLAN_CATALOG } from "@/lib/constants";
import type { BillingStatus, Tenant } from "@/lib/types";

const BILLING_STATUSES: BillingStatus[] = ["em_dia", "vencido", "cancelado"];

interface BillingDialogProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

function toDateInputValue(iso: string | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function BillingDialog({ tenant, open, onOpenChange, onUpdated }: BillingDialogProps) {
  const [billingStatus, setBillingStatus] = useState<BillingStatus>("em_dia");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setBillingStatus(tenant.billingStatus);
      setExpiresAt(toDateInputValue(tenant.planExpiresAt));
    }
  }, [tenant]);

  function renewFor(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setExpiresAt(date.toISOString().slice(0, 10));
    setBillingStatus("em_dia");
  }

  async function handleSubmit() {
    if (!tenant) return;
    setSaving(true);
    try {
      const isoExpiresAt = expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null;
      await api.updateTenantBilling(tenant.id, billingStatus, isoExpiresAt);
      toast.success(`Cobrança de ${tenant.name} atualizada.`);
      onUpdated();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível atualizar a cobrança.");
    } finally {
      setSaving(false);
    }
  }

  if (!tenant) return null;
  const cycleDays = PLAN_CATALOG[tenant.plan].cycleDays;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cobrança — {tenant.name}</DialogTitle>
          <DialogDescription>
            Plano {tenant.plan === "pro" ? "Pro" : "Starter"} · R$ {PLAN_CATALOG[tenant.plan].price}/mês
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Status da cobrança</Label>
            <Select value={billingStatus} onValueChange={(value) => setBillingStatus(value as BillingStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILLING_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {BILLING_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="billing-expires-at">Vencimento do plano</Label>
            <Input
              id="billing-expires-at"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => renewFor(cycleDays)}>
              Renovar +{cycleDays} dias
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => renewFor(365)}>
              Renovar +365 dias
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={saving} onClick={handleSubmit}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
