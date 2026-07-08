// WeekGrid — grade semanal (Seg–Dom) com slots de 08h–20h. Renderização pura
// a partir de props; toda a matemática de posicionamento dos blocos vem de
// weekGridMath.ts, mantida isolada do estado de navegação da AgendaPage.

import { APPOINTMENT_TYPE_STYLES } from "@/components/agenda/appointmentTypeStyles";
import {
  DAY_LABELS,
  HOUR_HEIGHT_PX,
  SLOT_HOURS,
  blockStyle,
  dayLabel,
  formatHourMinute,
  getWeekDays,
  hourLabel,
  isSameDay,
} from "@/components/agenda/weekGridMath";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Appointment, Contact } from "@/lib/types";

interface WeekGridProps {
  weekStart: Date;
  appointments: Appointment[];
  contacts: Contact[];
  onSelectAppointment: (appointment: Appointment) => void;
}

export function WeekGrid({ weekStart, appointments, contacts, onSelectAppointment }: WeekGridProps) {
  const days = getWeekDays(weekStart);
  const today = new Date();
  const gridHeight = SLOT_HOURS.length * HOUR_HEIGHT_PX;

  function contactName(contactId: string): string {
    return contacts.find((c) => c.id === contactId)?.name ?? "Cliente";
  }

  function appointmentsForDay(day: Date): Appointment[] {
    return appointments.filter((a) => isSameDay(new Date(a.startsAt), day));
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="grid min-w-[880px] grid-cols-[56px_repeat(7,1fr)]">
        {/* Cabeçalho: canto vazio + dias da semana */}
        <div className="border-b border-border" />
        {days.map((day, i) => {
          const current = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex flex-col items-center gap-0.5 border-b border-l border-border py-2",
                current && "bg-primary/5",
              )}
            >
              <span className="text-xs font-medium text-muted-foreground">{DAY_LABELS[i]}</span>
              <span
                className={cn(
                  "font-mono text-sm font-semibold tabular-nums text-foreground",
                  current && "text-primary",
                )}
              >
                {dayLabel(day)}
              </span>
            </div>
          );
        })}

        {/* Coluna de horas */}
        <div className="relative" style={{ height: gridHeight }}>
          {SLOT_HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground"
              style={{ top: (hour - SLOT_HOURS[0]) * HOUR_HEIGHT_PX }}
            >
              {hourLabel(hour)}
            </div>
          ))}
        </div>

        {/* Colunas dos dias */}
        {days.map((day) => {
          const current = isSameDay(day, today);
          const dayAppointments = appointmentsForDay(day);
          return (
            <div
              key={day.toISOString()}
              className={cn("relative border-l border-border", current && "bg-primary/5")}
              style={{ height: gridHeight }}
            >
              {SLOT_HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-t border-border/60"
                  style={{ top: (hour - SLOT_HOURS[0]) * HOUR_HEIGHT_PX }}
                />
              ))}

              {dayAppointments.map((appt) => {
                const { top, height } = blockStyle(appt.startsAt, appt.endsAt);
                const style = APPOINTMENT_TYPE_STYLES[appt.type];
                const finished = appt.status !== "agendado";
                return (
                  <button
                    key={appt.id}
                    type="button"
                    onClick={() => onSelectAppointment(appt)}
                    style={{ top, height, left: 2, right: 2 }}
                    className={cn(
                      "absolute flex flex-col overflow-hidden rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight transition-opacity hover:opacity-80",
                      style.block,
                      finished && "opacity-55",
                    )}
                    title={`${APPOINTMENT_TYPE_LABELS[appt.type]} · ${contactName(appt.contactId)}`}
                  >
                    <span className="truncate font-medium">{contactName(appt.contactId)}</span>
                    <span className="font-mono tabular-nums opacity-80">{formatHourMinute(appt.startsAt)}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
