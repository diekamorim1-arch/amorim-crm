// SupplierFormDialog — dialog único para criar e editar fornecedores via API
// real. Em modo de criação (supplier === undefined) despacha ADD_SUPPLIER
// com a resposta do POST; em modo de edição despacha UPDATE_SUPPLIER com a
// resposta do PATCH. Segue o mesmo padrão dual-mode do ContactFormDialog.

import { useEffect, useState, type FormEvent } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api, mapSupplier } from "@/lib/apiClient";
import { useCrm } from "@/lib/store";
import type { Supplier } from "@/lib/types";

interface SupplierFormDialogProps {
  supplier?: Supplier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormValues {
  name: string;
  whatsapp: string;
  contactName: string;
  email: string;
  notes: string;
}

const EMPTY_ERRORS = { name: "", whatsapp: "" };

function valuesFromSupplier(supplier: Supplier | undefined): FormValues {
  return {
    name: supplier?.name ?? "",
    whatsapp: supplier?.whatsapp ?? "",
    contactName: supplier?.contactName ?? "",
    email: supplier?.email ?? "",
    notes: supplier?.notes ?? "",
  };
}

export function SupplierFormDialog({ supplier, open, onOpenChange }: SupplierFormDialogProps) {
  const { dispatch } = useCrm();

  const [values, setValues] = useState<FormValues>(() => valuesFromSupplier(supplier));
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!supplier;

  useEffect(() => {
    if (open) {
      setValues(valuesFromSupplier(supplier));
      setErrors(EMPTY_ERRORS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supplier?.id]);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const nextErrors = {
      name: values.name.trim() ? "" : "Informe o nome do fornecedor.",
      whatsapp: values.whatsapp.trim() ? "" : "Informe o WhatsApp do fornecedor.",
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.whatsapp) return;

    const payload = {
      name: values.name.trim(),
      whatsapp: values.whatsapp.trim(),
      contact_name: values.contactName.trim() || undefined,
      email: values.email.trim() || undefined,
      notes: values.notes.trim() || undefined,
    };

    setSubmitting(true);
    try {
      if (isEdit && supplier) {
        const updated = mapSupplier(await api.updateSupplier(supplier.id, payload));
        dispatch({ type: "UPDATE_SUPPLIER", supplier: updated });
        toast.success(`Fornecedor ${updated.name} atualizado.`);
      } else {
        const created = mapSupplier(await api.createSupplier(payload));
        dispatch({ type: "ADD_SUPPLIER", supplier: created });
        toast.success(`Fornecedor ${created.name} criado.`);
      }
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao salvar fornecedor.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar fornecedor" : "Novo fornecedor"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize os dados do fornecedor." : "Cadastra um novo fornecedor da loja."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
              <Label htmlFor="supplier-name">Nome*</Label>
              <Input
                id="supplier-name"
                value={values.name}
                onChange={(event) => update("name", event.target.value)}
                aria-invalid={!!errors.name}
                placeholder="Nome do fornecedor"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
              <Label htmlFor="supplier-whatsapp">WhatsApp*</Label>
              <Input
                id="supplier-whatsapp"
                value={values.whatsapp}
                onChange={(event) => update("whatsapp", event.target.value)}
                aria-invalid={!!errors.whatsapp}
                placeholder="+55 11 90000-0000"
                className="font-mono tabular-nums"
              />
              {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supplier-contact-name">Nome do contato</Label>
              <Input
                id="supplier-contact-name"
                value={values.contactName}
                onChange={(event) => update("contactName", event.target.value)}
                placeholder="Pessoa de contato"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supplier-email">E-mail</Label>
              <Input
                id="supplier-email"
                type="email"
                value={values.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="fornecedor@email.com"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="supplier-notes">Observações</Label>
            <Textarea
              id="supplier-notes"
              value={values.notes}
              onChange={(event) => update("notes", event.target.value)}
              placeholder="Condições de pagamento, prazos, observações gerais..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar fornecedor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
