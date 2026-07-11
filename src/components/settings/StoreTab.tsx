// StoreTab — dados básicos da loja (tenant): nome, horário e plano. Slug é
// somente leitura (identidade fixa da loja, definida na criação do tenant).
// Salvar chama api.updateTenant (nome) + api.updateTenantSettings (horário)
// de verdade e repassa a resposta via onTenantUpdated.

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api, mapTenant } from "@/lib/apiClient";
import { PLAN_LABELS } from "@/lib/constants";
import type { Tenant } from "@/lib/types";

interface StoreTabProps {
  tenant: Tenant;
  onTenantUpdated: (tenant: Tenant) => void;
}

export function StoreTab({ tenant, onTenantUpdated }: StoreTabProps) {
  const [name, setName] = useState(tenant.name);
  const [businessHours, setBusinessHours] = useState(tenant.settings.businessHours);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(tenant.name);
    setBusinessHours(tenant.settings.businessHours);
  }, [tenant.id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.updateTenant(tenant.id, { name: name.trim() || tenant.name });
      const updatedRow = await api.updateTenantSettings(tenant.id, { business_hours: businessHours.trim() });
      onTenantUpdated(mapTenant(updatedRow));
      toast.success("Alterações salvas.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao salvar alterações da loja.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-lg flex-col gap-4 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="store-name">Nome da loja</Label>
        <Input
          id="store-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome da loja"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="store-slug">Identificador (slug)</Label>
        <Input id="store-slug" value={tenant.slug} readOnly disabled className="font-mono tabular-nums" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="store-hours">Horário de funcionamento</Label>
        <Input
          id="store-hours"
          value={businessHours}
          onChange={(event) => setBusinessHours(event.target.value)}
          placeholder="Seg a Sex 09h-19h"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Plano atual</span>
        <Badge variant={tenant.plan === "pro" ? "default" : "secondary"}>{PLAN_LABELS[tenant.plan]}</Badge>
      </div>

      <div>
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
