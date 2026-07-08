// Matemática pura de layout da grade semanal — isolada do estado de
// navegação da AgendaPage. Nada aqui depende de React nem de contexto;
// recebe datas/strings e devolve números ou datas, o que facilita testar e
// reaproveitar (ex.: TodayList usa os mesmos limites de horário).

export const SLOT_START_HOUR = 8;
export const SLOT_END_HOUR = 20;
export const HOUR_HEIGHT_PX = 56;
export const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Início (00:00) da semana (segunda-feira) que contém `date`. */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = domingo, 1 = segunda, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

/** As 7 datas (Seg–Dom) da semana que começa em `weekStart`. */
export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Rótulo curto do dia: "07/07". */
export function dayLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** Rótulo do intervalo da semana exibida no header: "07 – 13 de jul." */
export function weekRangeLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const startDay = weekStart.getDate().toString().padStart(2, "0");
  const endLabel = end.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${startDay} – ${endLabel}`;
}

export function hourLabel(hour: number): string {
  return `${hour.toString().padStart(2, "0")}h`;
}

export const SLOT_HOURS = Array.from(
  { length: SLOT_END_HOUR - SLOT_START_HOUR },
  (_, i) => SLOT_START_HOUR + i,
);

function hoursFromSlotStart(iso: string): number {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60 - SLOT_START_HOUR;
}

/** Posição (top) e altura (height) em px de um bloco de agendamento dentro da coluna do dia, já limitado à janela 08h–20h. */
export function blockStyle(startsAt: string, endsAt: string): { top: number; height: number } {
  const totalHeight = (SLOT_END_HOUR - SLOT_START_HOUR) * HOUR_HEIGHT_PX;
  const rawTop = hoursFromSlotStart(startsAt) * HOUR_HEIGHT_PX;
  const rawBottom = hoursFromSlotStart(endsAt) * HOUR_HEIGHT_PX;

  const top = Math.min(Math.max(rawTop, 0), totalHeight);
  const bottom = Math.min(Math.max(rawBottom, 0), totalHeight);
  const MIN_HEIGHT_PX = 22;

  return { top, height: Math.max(bottom - top, MIN_HEIGHT_PX) };
}

export function formatHourMinute(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** yyyy-MM-dd em horário local (evita o desvio de fuso de toISOString()). */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}
