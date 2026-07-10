// ContactFormDialog — dialog único para criar e editar clientes. Em modo de
// criação (contact === undefined) despacha ADD_CONTACT com journeyStatus
// "lead"; em modo de edição despacha UPDATE_CONTACT preservando os campos que
// o formulário não expõe (journeyStatus, firstContactAt, createdAt...).
// Autossuficiente: lê sessão/usuários do próprio store, então pode ser
// reaberto por Inbox/Agenda apenas passando contact/open/onOpenChange.

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORIGIN_LABELS, PRODUCT_LINE_LABELS } from "@/lib/constants";
import { tenantScope } from "@/lib/selectors";
import { newId, useCrm } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Contact, Origin, ProductLine } from "@/lib/types";

interface ContactFormDialogProps {
  contact?: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormValues {
  name: string;
  whatsapp: string;
  instagram: string;
  email: string;
  cpf: string;
  origin: Origin;
  interests: ProductLine[];
  tags: string;
  ownerId: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

const EMPTY_ERRORS = { name: "", whatsapp: "" };

function valuesFromContact(contact: Contact | undefined, defaultOwnerId: string): FormValues {
  return {
    name: contact?.name ?? "",
    whatsapp: contact?.whatsapp ?? "",
    instagram: contact?.instagram ?? "",
    email: contact?.email ?? "",
    cpf: contact?.cpf ?? "",
    origin: contact?.origin ?? "whatsapp_direto",
    interests: contact?.interests ?? [],
    tags: contact?.tags.join(", ") ?? "",
    ownerId: contact?.ownerId ?? defaultOwnerId,
    street: contact?.address?.street ?? "",
    city: contact?.address?.city ?? "",
    state: contact?.address?.state ?? "",
    zip: contact?.address?.zip ?? "",
  };
}

export function ContactFormDialog({ contact, open, onOpenChange }: ContactFormDialogProps) {
  const { state, dispatch, refreshCrmData } = useCrm();
  const users = tenantScope(state).users;
  const defaultOwnerId = contact?.ownerId ?? state.session?.userId ?? "";

  const [values, setValues] = useState<FormValues>(() => valuesFromContact(contact, defaultOwnerId));
  const [errors, setErrors] = useState(EMPTY_ERRORS);

  const isEdit = !!contact;

  useEffect(() => {
    if (open) {
      setValues(valuesFromContact(contact, defaultOwnerId));
      setErrors(EMPTY_ERRORS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contact?.id]);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleInterest(interest: ProductLine) {
    setValues((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!state.session) return;

    const nextErrors = {
      name: values.name.trim() ? "" : "Informe o nome do cliente.",
      whatsapp: values.whatsapp.trim() ? "" : "Informe o WhatsApp do cliente.",
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.whatsapp) return;

    const now = new Date().toISOString();
    const tags = values.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const hasAddress = values.street.trim() || values.city.trim() || values.state.trim() || values.zip.trim();
    const address = hasAddress
      ? { street: values.street.trim(), city: values.city.trim(), state: values.state.trim(), zip: values.zip.trim() }
      : undefined;

    if (state.isRealSession) {
      try {
        if (isEdit && contact) {
          await api.updateContact(contact.id, {
            name: values.name.trim(),
            whatsapp: values.whatsapp.trim(),
            instagram: values.instagram.trim() || undefined,
            email: values.email.trim() || undefined,
            cpf: values.cpf.trim() || undefined,
            origin: values.origin,
            interests: values.interests,
            tags,
            owner_id: values.ownerId || contact.ownerId,
            address,
          });
          await refreshCrmData();
          toast.success(`Alterações de ${values.name.trim()} salvas.`);
        } else {
          const created = await api.createContact({
            name: values.name.trim(),
            whatsapp: values.whatsapp.trim(),
            instagram: values.instagram.trim() || undefined,
            email: values.email.trim() || undefined,
            cpf: values.cpf.trim() || undefined,
            origin: values.origin,
            interests: values.interests,
            tags,
            owner_id: values.ownerId || state.session.userId,
            address,
          });
          await refreshCrmData();
          toast.success(`Cliente ${created.name} criado.`);
        }
        handleOpenChange(false);
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : "Erro ao salvar cliente.");
      }
      return;
    }

    if (isEdit && contact) {
      const updated: Contact = {
        ...contact,
        name: values.name.trim(),
        whatsapp: values.whatsapp.trim(),
        instagram: values.instagram.trim() || undefined,
        email: values.email.trim() || undefined,
        cpf: values.cpf.trim() || undefined,
        origin: values.origin,
        interests: values.interests,
        tags,
        ownerId: values.ownerId || contact.ownerId,
        address: hasAddress
          ? {
              street: values.street.trim(),
              city: values.city.trim(),
              state: values.state.trim(),
              zip: values.zip.trim(),
            }
          : undefined,
      };
      dispatch({ type: "UPDATE_CONTACT", contact: updated });
      toast.success(`Alterações de ${updated.name} salvas.`);
    } else {
      const created: Contact = {
        id: newId("contact"),
        tenantId: state.session.tenantId,
        name: values.name.trim(),
        whatsapp: values.whatsapp.trim(),
        instagram: values.instagram.trim() || undefined,
        email: values.email.trim() || undefined,
        cpf: values.cpf.trim() || undefined,
        origin: values.origin,
        interests: values.interests,
        tags,
        journeyStatus: "lead",
        ownerId: values.ownerId || state.session.userId,
        firstContactAt: now,
        lastInteractionAt: now,
        createdAt: now,
        address: hasAddress
          ? {
              street: values.street.trim(),
              city: values.city.trim(),
              state: values.state.trim(),
              zip: values.zip.trim(),
            }
          : undefined,
      };
      dispatch({ type: "ADD_CONTACT", contact: created });
      toast.success(`Cliente ${created.name} criado.`);
    }

    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize os dados do cliente." : "Cria um novo cliente com status Lead."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
              <Label htmlFor="contact-name">Nome*</Label>
              <Input
                id="contact-name"
                value={values.name}
                onChange={(event) => update("name", event.target.value)}
                aria-invalid={!!errors.name}
                placeholder="Nome do cliente"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
              <Label htmlFor="contact-whatsapp">WhatsApp*</Label>
              <Input
                id="contact-whatsapp"
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
              <Label htmlFor="contact-instagram">Instagram</Label>
              <Input
                id="contact-instagram"
                value={values.instagram}
                onChange={(event) => update("instagram", event.target.value)}
                placeholder="@usuario"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-email">E-mail</Label>
              <Input
                id="contact-email"
                type="email"
                value={values.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="cliente@email.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-cpf">CPF</Label>
              <Input
                id="contact-cpf"
                value={values.cpf}
                onChange={(event) => update("cpf", event.target.value)}
                placeholder="000.000.000-00"
                className="font-mono tabular-nums"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Origem</Label>
              <Select value={values.origin} onValueChange={(v) => update("origin", v as Origin)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ORIGIN_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Interesses</Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(PRODUCT_LINE_LABELS).map(([value, label]) => {
                const active = values.interests.includes(value as ProductLine);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleInterest(value as ProductLine)}
                    className={cn(
                      "rounded-full border border-border px-2.5 py-1 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact-tags">Tags</Label>
              <Input
                id="contact-tags"
                value={values.tags}
                onChange={(event) => update("tags", event.target.value)}
                placeholder="vip, indicação"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Responsável</Label>
              <Select value={values.ownerId} onValueChange={(v) => update("ownerId", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-street">Endereço</Label>
            <Input
              id="contact-street"
              value={values.street}
              onChange={(event) => update("street", event.target.value)}
              placeholder="Rua, número"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              value={values.city}
              onChange={(event) => update("city", event.target.value)}
              placeholder="Cidade"
              aria-label="Cidade"
            />
            <Input
              value={values.state}
              onChange={(event) => update("state", event.target.value)}
              placeholder="UF"
              aria-label="Estado"
            />
            <Input
              value={values.zip}
              onChange={(event) => update("zip", event.target.value)}
              placeholder="CEP"
              aria-label="CEP"
              className="font-mono tabular-nums"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{isEdit ? "Salvar alterações" : "Criar cliente"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
