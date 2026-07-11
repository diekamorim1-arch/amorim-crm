// TenantFormDialog — cria uma nova loja (tenant) na plataforma via
// api.createTenant: nome + plano. O backend gera o slug definitivo e cria
// um gestor padrão de verdade via Supabase Auth Admin — a loja abre vazia,
// pronta pro primeiro acesso.

import { useState, type FormEvent } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, api } from "@/lib/apiClient";
import { PLAN_LABELS } from "@/lib/constants";
import type { Tenant } from "@/lib/types";

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const PLAN_OPTIONS: Tenant["plan"][] = ["starter", "pro"];

const EMPTY_ERRORS = { name: "" };

export function TenantFormDialog({ open, onOpenChange, onCreated }: TenantFormDialogProps) {
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<Tenant["plan"]>("starter");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState(EMPTY_ERRORS);

  function reset() {
    setName("");
    setPlan("starter");
    setErrors(EMPTY_ERRORS);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrors({ name: "Informe o nome da loja." });
      return;
    }

    setSaving(true);
    try {
      await api.createTenant(trimmedName, plan);
      toast.success(`Loja ${trimmedName} criada.`);
      onCreated?.();
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível criar a loja.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova loja</DialogTitle>
          <DialogDescription>Cria a loja e um gestor padrão para o primeiro acesso.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-name">Nome*</Label>
            <Input
              id="tenant-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={!!errors.name}
              placeholder="Nome da loja"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Plano</Label>
            <Select value={plan} onValueChange={(value) => setPlan(value as Tenant["plan"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PLAN_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Criando…" : "Criar loja"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
