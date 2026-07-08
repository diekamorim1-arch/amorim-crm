// Mapeamento de cor por tipo de agendamento — 4 tipos, 4 tokens visualmente
// distintos, todos definidos em src/index.css (nenhuma cor padrão do
// Tailwind, nenhum hex inventado aqui). `entrega` e `follow_up` reaproveitam
// tokens já existentes (--primary, --attention); `retirada` e `atendimento`
// usam os tokens dedicados --appointment-retirada/--appointment-atendimento
// (um teal e um violeta) — escolhidos para não ler como o azul-Apple que o
// design-direction pede para evitar (ver docs/design-direction.md).

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
    block: "border-appointment-retirada/30 bg-appointment-retirada/10 text-appointment-retirada",
    dot: "bg-appointment-retirada",
  },
  atendimento: {
    block: "border-appointment-atendimento/30 bg-appointment-atendimento/10 text-appointment-atendimento",
    dot: "bg-appointment-atendimento",
  },
  follow_up: {
    block: "border-attention/30 bg-attention/10 text-attention",
    dot: "bg-attention",
  },
};
