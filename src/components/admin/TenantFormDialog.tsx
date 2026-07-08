// TenantFormDialog — cria uma nova loja (tenant) na plataforma: nome, slug
// (auto-gerado a partir do nome, editável) e plano. Ao salvar, cria também um
// gestor padrão para a loja ("Gestor {nome}"), já pronto para aparecer no
// SessionSwitcher e fazer login — a loja abre vazia (ver estados vazios da
// Task 12).

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
import { AVATAR_COLORS, PLAN_LABELS } from "@/lib/constants";
import { newId, type CrmAction, type Dispatch } from "@/lib/store";
import type { Tenant, User } from "@/lib/types";

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenants: Tenant[];
  dispatch: Dispatch<CrmAction>;
}

const PLAN_OPTIONS: Tenant["plan"][] = ["starter", "pro"];
const DEFAULT_LOSS_REASONS: Tenant["settings"]["lossReasons"] = [
  "preco",
  "prazo_entrega",
  "sem_modelo",
  "concorrencia",
  "sem_resposta",
  "desistiu",
];

const DIACRITICS_RE = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const EMPTY_ERRORS = { name: "", slug: "" };

export function TenantFormDialog({ open, onOpenChange, tenants, dispatch }: TenantFormDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [plan, setPlan] = useState<Tenant["plan"]>("starter");
  const [errors, setErrors] = useState(EMPTY_ERRORS);

  function reset() {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setPlan("starter");
    setErrors(EMPTY_ERRORS);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(slugify(value));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedName = name.trim();
    const finalSlug = slug || slugify(trimmedName);
    const slugInUse = tenants.some((t) => t.slug === finalSlug);

    const nextErrors = {
      name: trimmedName ? "" : "Informe o nome da loja.",
      slug: !finalSlug ? "Informe um identificador válido." : slugInUse ? "Esse identificador já está em uso." : "",
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.slug) return;

    const now = new Date().toISOString();
    const tenant: Tenant = {
      id: newId("tenant"),
      name: trimmedName,
      slug: finalSlug,
      plan,
      status: "ativo",
      createdAt: now,
      settings: { tags: [], lossReasons: DEFAULT_LOSS_REASONS, businessHours: "Seg a Sex 09h-18h" },
    };

    const gestor: User = {
      id: newId("user"),
      tenantId: tenant.id,
      name: `Gestor ${trimmedName}`,
      email: `gestor@${finalSlug}.com.br`,
      role: "gestor",
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      createdAt: now,
    };

    dispatch({ type: "ADD_TENANT", tenant });
    dispatch({ type: "ADD_USER", user: gestor });
    toast.success(`Loja ${trimmedName} criada.`);
    reset();
    onOpenChange(false);
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
              onChange={(event) => handleNameChange(event.target.value)}
              aria-invalid={!!errors.name}
              placeholder="Nome da loja"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-slug">Identificador (slug)*</Label>
            <Input
              id="tenant-slug"
              value={slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              aria-invalid={!!errors.slug}
              placeholder="nome-da-loja"
              className="font-mono tabular-nums"
            />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
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
            <Button type="submit">Criar loja</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
