// AgendaPage — visão de agendamentos do tenant: grade semanal (Seg–Dom) ou
// lista do dia, com navegação por semana e criação/edição via
// AppointmentDialog. Estado de navegação (semana exibida, view ativa)
// mantido aqui; a matemática de layout da grade vive em weekGridMath.ts.

import { useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";

import { AppointmentDialog } from "@/components/agenda/AppointmentDialog";
import { TodayList } from "@/components/agenda/TodayList";
import { WeekGrid } from "@/components/agenda/WeekGrid";
import { addWeeks, getWeekStart, isSameDay, weekRangeLabel } from "@/components/agenda/weekGridMath";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import type { Appointment } from "@/lib/types";

type AgendaView = "semana" | "hoje";

const MOBILE_BREAKPOINT = 768;

function defaultView(): AgendaView {
  if (typeof window === "undefined") return "semana";
  return window.innerWidth < MOBILE_BREAKPOINT ? "hoje" : "semana";
}

export function AgendaPage() {
  const { state } = useCrm();
  const { appointments, contacts, deals, users } = tenantScope(state);

  const [view, setView] = useState<AgendaView>(defaultView);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | undefined>(undefined);

  const today = new Date();
  const todayAppointments = appointments.filter((a) => isSameDay(new Date(a.startsAt), today));

  function openCreateDialog() {
    setEditingAppointment(undefined);
    setDialogOpen(true);
  }

  function openEditDialog(appointment: Appointment) {
    setEditingAppointment(appointment);
    setDialogOpen(true);
  }

  function handleDialogOpenChange(next: boolean) {
    setDialogOpen(next);
    if (!next) setEditingAppointment(undefined);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Agenda</h1>
          <p className="font-mono text-sm tabular-nums text-muted-foreground">
            {view === "semana" ? weekRangeLabel(weekStart) : today.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setWeekStart((w) => addWeeks(w, -1))}
              disabled={view !== "semana"}
              aria-label="Semana anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setWeekStart(getWeekStart(new Date()))}
              disabled={view !== "semana"}
            >
              Hoje
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setWeekStart((w) => addWeeks(w, 1))}
              disabled={view !== "semana"}
              aria-label="Próxima semana"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <Tabs value={view} onValueChange={(v) => setView(v as AgendaView)}>
            <TabsList>
              <TabsTrigger value="semana">Semana</TabsTrigger>
              <TabsTrigger value="hoje">Hoje</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button type="button" onClick={openCreateDialog}>
            <CalendarPlus />
            Novo agendamento
          </Button>
        </div>
      </div>

      {view === "semana" ? (
        <WeekGrid
          weekStart={weekStart}
          appointments={appointments}
          contacts={contacts}
          onSelectAppointment={openEditDialog}
        />
      ) : (
        <TodayList
          appointments={todayAppointments}
          contacts={contacts}
          deals={deals}
          users={users}
          onSelectAppointment={openEditDialog}
        />
      )}

      <AppointmentDialog open={dialogOpen} onOpenChange={handleDialogOpenChange} appointment={editingAppointment} />
    </div>
  );
}
