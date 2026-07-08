// Mapeamento de cor por tipo de agendamento — 4 tipos, 4 tokens visualmente
// distintos (2 semânticos do design system + 2 da paleta padrão do Tailwind,
// nenhum hex inventado). Reaproveitado por WeekGrid e TodayList.

import type { AppointmentType } from "@/lib/types";

interface AppointmentTypeStyle {
  /** Bloco na grade semanal (fundo translúcido + texto + borda). */
  block: string;
  /** Ponto/indicador usado na TodayList. */
  dot: string;
}

export const APPOINTMENT_TYPE_STYLES: Record<AppointmentType, AppointmentTypeStyle> = {
  entrega: {
    block: "border-primary/30 bg-primary/10 text-primary",
    dot: "bg-primary",
  },
  retirada: {
    block: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  atendimento: {
    block: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  follow_up: {
    block: "border-attention/30 bg-attention/10 text-attention",
    dot: "bg-attention",
  },
};
