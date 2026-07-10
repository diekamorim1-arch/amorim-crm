// AppointmentDialog — cria ou edita um agendamento. Reaproveitado pela Agenda
// (WeekGrid/TodayList, modo edição via prop `appointment`), pelo ContactPanel
// do Inbox (Task 6) e pela ficha do cliente (Task 5), ambos em modo criação
// pré-preenchido com `contactId`/`dealId`.

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api } from "@/lib/apiClient";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/constants";
import { toDateInputValue } from "@/components/agenda/weekGridMath";
import { cn } from "@/lib/utils";
import { tenantScope } from "@/lib/selectors";
import { newId, useCrm } from "@/lib/store";
import type { Activity, Appointment, AppointmentType } from "@/lib/types";

interface AppointmentDialogProps {
  contactId?: string;
  dealId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Presente em modo edição (aberto pela WeekGrid/TodayList a partir de um agendamento existente). */
  appointment?: Appointment;
}

const NO_DEAL = "none";

interface FormState {
  type: AppointmentType;
  contactId: string;
  dealId: string;
  date: string;
  startTime: string;
  endTime: string;
  ownerId: string;
  note: string;
}

function buildInitialState(
  appointment: Appointment | undefined,
  contactId: string | undefined,
  dealId: string | undefined,
  defaultOwnerId: string,
): FormState {
  if (appointment) {
    const start = new Date(appointment.startsAt);
    const end = new Date(appointment.endsAt);
    return {
      type: appointment.type,
      contactId: appointment.contactId,
      dealId: appointment.dealId ?? NO_DEAL,
      date: toDateInputValue(start),
      startTime: start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      endTime: end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      ownerId: appointment.ownerId,
      note: appointment.note ?? "",
    };
  }

  return {
    type: "atendimento",
    contactId: contactId ?? "",
    dealId: dealId ?? NO_DEAL,
    date: toDateInputValue(new Date()),
    startTime: "",
    endTime: "",
    ownerId: defaultOwnerId,
    note: "",
  };
}

const EMPTY_ERRORS = { contact: "", horario: "" };

export function AppointmentDialog({ contactId, dealId, open, onOpenChange, appointment }: AppointmentDialogProps) {
  const { state, dispatch, refreshCrmData } = useCrm();
  const { contacts, deals, users } = tenantScope(state);
  const defaultOwnerId = state.session?.userId ?? users[0]?.id ?? "";

  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(appointment, contactId, dealId, defaultOwnerId),
  );
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);

  const isEditing = !!appointment;

  // Recarrega o formulário sempre que o dialog é reaberto com um alvo diferente.
  useEffect(() => {
    if (open) {
      setForm(buildInitialState(appointment, contactId, dealId, defaultOwnerId));
      setErrors(EMPTY_ERRORS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointment?.id, contactId, dealId]);

  const selectedContact = contacts.find((c) => c.id === form.contactId);
  const openDealsForContact = useMemo(
    () => deals.filter((d) => d.contactId === form.contactId && d.outcome === "aberto"),
    [deals, form.contactId],
  );
  // Se o agendamento já tinha um negócio vinculado que não está mais aberto
  // (ganho/perdido desde a criação), mantém ele visível no select — em vez
  // de escondê-lo silenciosamente enquanto o id continua sendo salvo.
  const currentLinkedDeal =
    form.dealId !== NO_DEAL && !openDealsForContact.some((d) => d.id === form.dealId)
      ? deals.find((d) => d.id === form.dealId)
      : undefined;
  const dealSelectOptions = currentLinkedDeal ? [...openDealsForContact, currentLinkedDeal] : openDealsForContact;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setErrors(EMPTY_ERRORS);
      setContactPickerOpen(false);
    }
    onOpenChange(next);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!state.session) return;

    const nextErrors = {
      contact: form.contactId ? "" : "Selecione um cliente.",
      horario: form.date && form.startTime && form.endTime ? "" : "Informe data e horário de início e fim.",
    };
    if (!nextErrors.horario && form.date && form.startTime && form.endTime) {
      const start = new Date(`${form.date}T${form.startTime}`);
      const end = new Date(`${form.date}T${form.endTime}`);
      if (end.getTime() <= start.getTime()) {
        nextErrors.horario = "O horário de fim deve ser depois do início.";
      }
    }
    setErrors(nextErrors);
    if (nextErrors.contact || nextErrors.horario) return;

    const contact = contacts.find((c) => c.id === form.contactId);
    if (!contact) return;

    const startsAt = new Date(`${form.date}T${form.startTime}`).toISOString();
    const endsAt = new Date(`${form.date}T${form.endTime}`).toISOString();
    const resolvedDealId = form.dealId === NO_DEAL ? undefined : form.dealId;

    if (state.isRealSession) {
      try {
        if (isEditing && appointment) {
          await api.updateAppointment(appointment.id, {
            contact_id: form.contactId,
            deal_id: resolvedDealId,
            type: form.type,
            starts_at: startsAt,
            ends_at: endsAt,
            owner_id: form.ownerId,
            note: form.note.trim() || undefined,
          });
          await refreshCrmData();
          toast.success(`Agendamento de ${contact.name} atualizado.`);
        } else {
          await api.createAppointment({
            contact_id: form.contactId,
            deal_id: resolvedDealId,
            type: form.type,
            starts_at: startsAt,
            ends_at: endsAt,
            owner_id: form.ownerId,
            note: form.note.trim() || undefined,
          });
          await api.createActivity({
            contact_id: form.contactId,
            deal_id: resolvedDealId,
            type: "agendamento",
            description: `Agendamento de ${APPOINTMENT_TYPE_LABELS[form.type].toLowerCase()} criado.`,
          });
          await refreshCrmData();
          toast.success(`Agendamento criado para ${contact.name}.`);
        }
        handleOpenChange(false);
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : "Erro ao salvar agendamento.");
      }
      return;
    }

    if (isEditing && appointment) {
      const updated: Appointment = {
        ...appointment,
        type: form.type,
        contactId: form.contactId,
        dealId: resolvedDealId,
        startsAt,
        endsAt,
        ownerId: form.ownerId,
        note: form.note.trim() || undefined,
      };
      dispatch({ type: "UPDATE_APPOINTMENT", appointment: updated });
      toast.success(`Agendamento de ${contact.name} atualizado.`);
    } else {
      const newAppointment: Appointment = {
        id: newId("appt"),
        tenantId: state.session.tenantId,
        contactId: form.contactId,
        dealId: resolvedDealId,
        type: form.type,
        startsAt,
        endsAt,
        status: "agendado",
        ownerId: form.ownerId,
        note: form.note.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: "ADD_APPOINTMENT", appointment: newAppointment });

      const activity: Activity = {
        id: newId("activity"),
        tenantId: state.session.tenantId,
        contactId: form.contactId,
        dealId: resolvedDealId,
        userId: state.session.userId,
        type: "agendamento",
        description: `Agendamento de ${APPOINTMENT_TYPE_LABELS[form.type].toLowerCase()} criado.`,
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: "ADD_ACTIVITY", activity });

      toast.success(`Agendamento criado para ${contact.name}.`);
    }

    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Altera data, horário ou detalhes deste agendamento."
              : "Agenda uma entrega, retirada, atendimento ou follow-up vinculado a um cliente."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => update("type", v as AppointmentType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(APPOINTMENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Cliente*</Label>
              <Popover open={contactPickerOpen} onOpenChange={setContactPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={contactPickerOpen}
                    aria-invalid={!!errors.contact}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">{selectedContact ? selectedContact.name : "Selecionar cliente"}</span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente…" />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {contacts.map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={contact.name}
                            onSelect={() => {
                              update("contactId", contact.id);
                              update("dealId", NO_DEAL);
                              setContactPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn("size-4", contact.id === form.contactId ? "opacity-100" : "opacity-0")}
                            />
                            {contact.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.contact && <p className="text-xs text-destructive">{errors.contact}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Negócio vinculado</Label>
            <Select
              value={form.dealId}
              onValueChange={(v) => update("dealId", v)}
              disabled={!form.contactId || dealSelectOptions.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_DEAL}>Nenhum</SelectItem>
                {dealSelectOptions.map((deal) => (
                  <SelectItem key={deal.id} value={deal.id}>
                    {deal.products}
                    {deal.outcome !== "aberto" && " (encerrado)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appt-date">Data*</Label>
              <Input
                id="appt-date"
                type="date"
                value={form.date}
                onChange={(event) => update("date", event.target.value)}
                aria-invalid={!!errors.horario}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appt-start">Início*</Label>
              <Input
                id="appt-start"
                type="time"
                value={form.startTime}
                onChange={(event) => update("startTime", event.target.value)}
                aria-invalid={!!errors.horario}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appt-end">Fim*</Label>
              <Input
                id="appt-end"
                type="time"
                value={form.endTime}
                onChange={(event) => update("endTime", event.target.value)}
                aria-invalid={!!errors.horario}
              />
            </div>
          </div>
          {errors.horario && <p className="-mt-2 text-xs text-destructive">{errors.horario}</p>}

          <div className="flex flex-col gap-1.5">
            <Label>Responsável</Label>
            <Select value={form.ownerId} onValueChange={(v) => update("ownerId", v)}>
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="appt-note">Observação</Label>
            <Textarea
              id="appt-note"
              value={form.note}
              onChange={(event) => update("note", event.target.value)}
              placeholder="Detalhes opcionais sobre o agendamento…"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{isEditing ? "Salvar alterações" : "Criar agendamento"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
