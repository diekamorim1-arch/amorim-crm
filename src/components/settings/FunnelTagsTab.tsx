// FunnelTagsTab — tags do tenant (chips livres, add/remove) e motivos de
// perda (checkboxes sobre os 6 valores fixos de LossReason — não é uma lista
// livre, o tipo é um union fechado). Estágios do funil ficam fora do escopo
// (YAGNI — a nota abaixo aponta para o plano Pro).

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOSS_REASON_LABELS } from "@/lib/constants";
import type { CrmAction, Dispatch } from "@/lib/store";
import type { LossReason, Tenant } from "@/lib/types";

interface FunnelTagsTabProps {
  tenant: Tenant;
  dispatch: Dispatch<CrmAction>;
}

const ALL_LOSS_REASONS = Object.keys(LOSS_REASON_LABELS) as LossReason[];

export function FunnelTagsTab({ tenant, dispatch }: FunnelTagsTabProps) {
  const [newTag, setNewTag] = useState("");

  function addTag(event: FormEvent) {
    event.preventDefault();
    const tag = newTag.trim().toLowerCase();
    if (!tag || tenant.settings.tags.includes(tag)) {
      setNewTag("");
      return;
    }
    dispatch({
      type: "UPDATE_TENANT",
      tenant: { ...tenant, settings: { ...tenant.settings, tags: [...tenant.settings.tags, tag] } },
    });
    toast.success("Tag adicionada.");
    setNewTag("");
  }

  function removeTag(tag: string) {
    dispatch({
      type: "UPDATE_TENANT",
      tenant: { ...tenant, settings: { ...tenant.settings, tags: tenant.settings.tags.filter((t) => t !== tag) } },
    });
    toast.success("Tag removida.");
  }

  function toggleLossReason(reason: LossReason) {
    const active = tenant.settings.lossReasons.includes(reason);
    const lossReasons = active
      ? tenant.settings.lossReasons.filter((r) => r !== reason)
      : [...tenant.settings.lossReasons, reason];
    dispatch({ type: "UPDATE_TENANT", tenant: { ...tenant, settings: { ...tenant.settings, lossReasons } } });
    toast.success("Motivos de perda atualizados.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Tags</h2>
          <p className="text-sm text-muted-foreground">Tags disponíveis para classificar clientes.</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {tenant.settings.tags.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma tag cadastrada.</p>
          )}
          {tenant.settings.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full text-muted-foreground transition-colors hover:text-destructive"
                aria-label={`Remover tag ${tag}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>

        <form onSubmit={addTag} className="flex max-w-xs gap-2">
          <Input
            value={newTag}
            onChange={(event) => setNewTag(event.target.value)}
            placeholder="Nova tag"
            aria-label="Nova tag"
          />
          <Button type="submit" variant="outline">
            Adicionar
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Motivos de perda</h2>
          <p className="text-sm text-muted-foreground">Motivos disponíveis ao marcar um negócio como perdido.</p>
        </div>

        <div className="flex flex-col gap-2">
          {ALL_LOSS_REASONS.map((reason) => (
            <Label key={reason} className="flex items-center gap-2 font-normal">
              <input
                type="checkbox"
                checked={tenant.settings.lossReasons.includes(reason)}
                onChange={() => toggleLossReason(reason)}
                className="size-4 rounded border-input accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {LOSS_REASON_LABELS[reason]}
            </Label>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Estágios do funil personalizáveis na versão Pro.</p>
    </div>
  );
}
