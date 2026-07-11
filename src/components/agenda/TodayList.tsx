// TodayList — lista vertical dos agendamentos de hoje, ordenada por hora,
// com tipo, cliente (link p/ ficha), negócio vinculado, responsável e ações
// de concluir/cancelar. Usada tanto na visão "Hoje" da Agenda quanto poderia
// ser reaproveitada em outros contextos futuros.

import type { MouseEvent } from "react";
import { Link } from "react-router";
import { Check, CalendarX, X } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/EmptyState";
import { APPOINTMENT_TYPE_STYLES } from "@/components/agenda/appointmentTypeStyles";
import { formatHourMinute } from "@/components/agenda/weekGridMath";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError, api, mapAppointment } from "@/lib/apiClient";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useCrm } from "@/lib/store";
import type { Appointment, Contact, Deal, User } from "@/lib/types";

interface TodayListProps {
  appointments: Appointment[];
  contacts: Contact[];
  deals: Deal[];
  users: User[];
  onSelectAppointment: (appointment: Appointment) => void;
}

export function TodayList({ appointments, contacts, deals, users, onSelectAppointment }: TodayListProps) {
  const { dispatch } = useCrm();

  const sorted = [...appointments].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  async function updateStatus(appt: Appointment, status: "concluido" | "cancelado", event: MouseEvent) {
    event.stopPropagation();

    try {
      const updated = await api.updateAppointment(appt.id, { status });
      dispatch({ type: "UPDATE_APPOINTMENT", appointment: mapAppointment(updated) });
      toast.success(status === "concluido" ? "Agendamento concluído." : "Agendamento cancelado.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao atualizar agendamento.");
    }
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={CalendarX}
        title="Nenhum agendamento para hoje"
        description="Crie um novo agendamento ou confira a visão semanal."
      />
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {sorted.map((appt) => {
        const contact = contacts.find((c) => c.id === appt.contactId);
        const deal = deals.find((d) => d.id === appt.dealId);
        const owner = users.find((u) => u.id === appt.ownerId);
        const style = APPOINTMENT_TYPE_STYLES[appt.type];
        const finished = appt.status !== "agendado";

        return (
          <li key={appt.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelectAppointment(appt)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectAppointment(appt);
                }
              }}
              className={cn(
                "flex w-full cursor-pointer flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between",
                finished && "opacity-70",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="flex flex-col items-center">
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {formatHourMinute(appt.startsAt)}
                  </span>
                  <span className={cn("mt-1 size-2 rounded-full", style.dot)} aria-hidden="true" />
                </span>

                <div className="flex flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className={cn("border", style.block)}>
                      {APPOINTMENT_TYPE_LABELS[appt.type]}
                    </Badge>
                    <Badge variant="secondary">{APPOINTMENT_STATUS_LABELS[appt.status]}</Badge>
                  </div>
                  {contact ? (
                    <Link
                      to={`/clientes/${contact.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {contact.name}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">Cliente não encontrado</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {deal ? deal.products : "Sem negócio vinculado"} · Responsável: {owner?.name ?? "—"}
                  </span>
                </div>
              </div>

              {appt.status === "agendado" && (
                <div className="flex gap-2 self-end sm:self-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(event) => updateStatus(appt, "concluido", event)}
                  >
                    <Check />
                    Concluir
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(event) => updateStatus(appt, "cancelado", event)}
                  >
                    <X />
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
