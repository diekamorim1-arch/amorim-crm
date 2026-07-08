// Labels pt-BR centralizados para todos os tipos enum-like de types.ts.

import type {
  AppointmentStatus,
  AppointmentType,
  ConnectionStatus,
  JourneyStatus,
  LossReason,
  Origin,
  PaymentMethod,
  ProductLine,
  Role,
  Stage,
} from "./types";

export const STAGES: { id: Stage; label: string }[] = [
  { id: "novo_lead", label: "Novo Lead" },
  { id: "em_atendimento", label: "Em Atendimento" },
  { id: "negociacao", label: "Negociação" },
  { id: "fechamento", label: "Fechamento" },
  { id: "pos_venda", label: "Pós-venda / Recompra" },
];

export const STAGE_LABELS: Record<Stage, string> = STAGES.reduce(
  (acc, s) => ({ ...acc, [s.id]: s.label }),
  {} as Record<Stage, string>,
);

export const LOSS_REASON_LABELS: Record<LossReason, string> = {
  preco: "Preço",
  prazo_entrega: "Prazo de entrega",
  sem_modelo: "Sem o modelo/cor",
  concorrencia: "Concorrência",
  sem_resposta: "Cliente sumiu",
  desistiu: "Desistiu da compra",
};

export const ORIGIN_LABELS: Record<Origin, string> = {
  instagram_organico: "Instagram Orgânico",
  instagram_ads: "Instagram Ads",
  whatsapp_direto: "WhatsApp Direto",
  indicacao: "Indicação",
  outro: "Outro",
};

export const PRODUCT_LINE_LABELS: Record<ProductLine, string> = {
  iphone: "iPhone",
  ipad: "iPad",
  mac: "Mac",
  watch: "Apple Watch",
  airpods: "AirPods",
  acessorios: "Acessórios",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  cartao_avista: "Cartão à vista",
  cartao_parcelado: "Cartão parcelado",
  boleto: "Boleto",
};

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  entrega: "Entrega",
  retirada: "Retirada",
  atendimento: "Atendimento",
  follow_up: "Follow-up",
};

export const JOURNEY_STATUS_LABELS: Record<JourneyStatus, string> = {
  lead: "Lead",
  cliente: "Cliente",
  recorrente: "Recorrente",
};

export const ROLE_LABELS: Record<Role, string> = {
  atendente: "Atendente",
  gestor: "Gestor",
  admin_saas: "Admin SaaS",
};

export const PLAN_LABELS: Record<"starter" | "pro", string> = {
  starter: "Starter",
  pro: "Pro",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  agendado: "Agendado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const CONNECTION_STATUS_LABELS: Record<ConnectionStatus, string> = {
  desconectado: "Desconectado",
  pareando: "Pareando",
  conectado: "Conectado",
};

/** Número de dias sem mudança de estágio a partir do qual um deal aberto é considerado "parado" (badge de stale). */
export const STALE_DAYS = 3;

/** Paleta de cores de avatar sorteada para novos usuários (convite de equipe, gestor padrão de loja nova). */
export const AVATAR_COLORS = ["#1D4ED8", "#DB2777", "#059669", "#EA580C", "#7C3AED", "#0F172A", "#0891B2", "#B45309"];
