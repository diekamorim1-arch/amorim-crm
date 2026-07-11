// InviteUserDialog — convida um membro real da equipe via Edge Function
// create-team-member, que chama auth.admin.inviteUserByEmail e grava
// user_profiles.

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
import { ROLE_LABELS } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";
import type { Role } from "@/lib/types";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INVITE_ROLES: Role[] = ["atendente", "gestor"];

const EMPTY_ERRORS = { name: "", email: "" };

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("atendente");
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setRole("atendente");
    setErrors(EMPTY_ERRORS);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const nextErrors = {
      name: name.trim() ? "" : "Informe o nome do convidado.",
      email: email.trim() ? "" : "Informe o e-mail do convidado.",
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.email) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-team-member", {
        body: { name: name.trim(), email: email.trim(), role },
      });
      if (error || data?.error) {
        toast.error(data?.error ?? error?.message ?? "Erro ao convidar membro da equipe.");
        return;
      }
      toast.success(`Convite enviado para ${email.trim()}.`);
      reset();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Convidar membro da equipe</DialogTitle>
          <DialogDescription>
            A pessoa recebe um e-mail de convite real e define a própria senha no primeiro acesso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-name">Nome*</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={!!errors.name}
              placeholder="Nome completo"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">E-mail*</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={!!errors.email}
              placeholder="nome@loja.com.br"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Papel</Label>
            <Select value={role} onValueChange={(value) => setRole(value as Role)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Convidando…" : "Convidar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
