// StoreTab — dados básicos da loja (tenant): nome, horário e plano. Slug é
// somente leitura (identidade fixa da loja, definida na criação do tenant).
// Salvar despacha UPDATE_TENANT preservando tags/motivos de perda já configurados.

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLAN_LABELS } from "@/lib/constants";
import type { CrmAction, Dispatch } from "@/lib/store";
import type { Tenant } from "@/lib/types";

interface StoreTabProps {
  tenant: Tenant;
  dispatch: Dispatch<CrmAction>;
}

export function StoreTab({ tenant, dispatch }: StoreTabProps) {
  const [name, setName] = useState(tenant.name);
  const [businessHours, setBusinessHours] = useState(tenant.settings.businessHours);

  useEffect(() => {
    setName(tenant.name);
    setBusinessHours(tenant.settings.businessHours);
  }, [tenant.id]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    dispatch({
      type: "UPDATE_TENANT",
      tenant: {
        ...tenant,
        name: name.trim() || tenant.name,
        settings: { ...tenant.settings, businessHours: businessHours.trim() },
      },
    });
    toast.success("Alterações salvas.");
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
        <Button type="submit">Salvar alterações</Button>
      </div>
    </form>
  );
}
