// EditUserDialog — edita nome/e-mail de um membro da equipe já existente
// (papel é editado inline na própria tabela do TeamTab, não aqui) via API.

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ApiError, api } from "@/lib/apiClient";
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
import type { User } from "@/lib/types";

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const EMPTY_ERRORS = { name: "", email: "" };

export function EditUserDialog({ user, open, onOpenChange, onSaved }: EditUserDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setEmail(user.email);
      setErrors(EMPTY_ERRORS);
    }
  }, [open, user]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    const nextErrors = {
      name: name.trim() ? "" : "Informe o nome.",
      email: email.trim() ? "" : "Informe o e-mail.",
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.email) return;

    setSubmitting(true);
    try {
      await api.updateUser(user.id, {
        name: name.trim() !== user.name ? name.trim() : undefined,
        email: email.trim() !== user.email ? email.trim() : undefined,
      });
      toast.success(`${name.trim()} atualizado.`);
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao atualizar usuário.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar membro da equipe</DialogTitle>
          <DialogDescription>Alterar o e-mail dispara uma confirmação para o novo endereço.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-user-name">Nome*</Label>
            <Input
              id="edit-user-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-user-email">E-mail*</Label>
            <Input
              id="edit-user-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
