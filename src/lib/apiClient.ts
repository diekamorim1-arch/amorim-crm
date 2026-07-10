// Cliente HTTP fino pro backend FastAPI — usado pelas features já migradas
// pra lá (WhatsApp/Evolution API, contatos/negócios/atividades/agendamentos).
// Anexos (comprovantes) ainda ficam só no reducer local/localStorage — o
// backend já tem um endpoint de upload real (Supabase Storage), mas migrar a
// AttachmentsTab pra ele é um passo à parte, ainda não feito. Anexa o token
// de sessão do Supabase como Bearer — o backend valida esse mesmo token via
// sb.auth.get_user().

import { supabase } from "./supabaseClient";
import type { Activity, Appointment, Contact, Deal } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = { "Content-Type": "application/json", ...(await authHeaders()), ...(init?.headers ?? {}) };
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error?.message ?? `Erro ${response.status} ao chamar a API.`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export interface ApiConnection {
  id: string;
  tenant_id: string;
  user_id: string;
  phone: string;
  status: "desconectado" | "pareando" | "conectado";
  connected_at: string | null;
}

export interface ApiQrCode {
  qrcode: string | null;
  status: ApiConnection["status"];
}

interface ApiAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface ApiContact {
  id: string;
  tenant_id: string;
  name: string;
  whatsapp: string;
  instagram: string | null;
  email: string | null;
  cpf: string | null;
  address: ApiAddress | null;
  origin: string;
  interests: string[];
  tags: string[];
  journey_status: string;
  owner_id: string;
  first_contact_at: string;
  last_interaction_at: string;
}

export interface ApiDeal {
  id: string;
  tenant_id: string;
  contact_id: string;
  title: string;
  products: string;
  value: number;
  payment: string;
  trade_in: boolean;
  trade_in_desc: string | null;
  stage: string;
  outcome: string;
  loss_reason: string | null;
  owner_id: string;
  stage_changed_at: string;
  supplier_product_id: string | null;
  supplier_value: number | null;
  gift_value: number | null;
  freight_value: number | null;
}

export interface ApiActivity {
  id: string;
  tenant_id: string;
  contact_id: string;
  deal_id: string | null;
  user_id: string;
  type: string;
  description: string;
  created_at: string;
}

export interface ApiAppointment {
  id: string;
  tenant_id: string;
  contact_id: string;
  deal_id: string | null;
  type: string;
  starts_at: string;
  ends_at: string;
  status: string;
  owner_id: string;
  note: string | null;
}

// Mapeiam o DTO snake_case do backend pro tipo camelCase que o resto do app já
// consome (via tenantScope/seed) — assim os ~20 componentes que só leem essas
// coleções não precisam saber se o dado veio do backend ou do reducer local.

export function mapContact(api: ApiContact): Contact {
  return {
    id: api.id,
    tenantId: api.tenant_id,
    name: api.name,
    whatsapp: api.whatsapp,
    instagram: api.instagram ?? undefined,
    email: api.email ?? undefined,
    cpf: api.cpf ?? undefined,
    address: api.address ?? undefined,
    origin: api.origin as Contact["origin"],
    interests: api.interests as Contact["interests"],
    tags: api.tags,
    journeyStatus: api.journey_status as Contact["journeyStatus"],
    ownerId: api.owner_id,
    firstContactAt: api.first_contact_at,
    lastInteractionAt: api.last_interaction_at,
    // ContactOut não expõe created_at (a tabela não guarda essa coluna
    // separada de first_contact_at) — usamos o mesmo valor, já que hoje são
    // sempre criados juntos e nenhuma tela distingue os dois para clientes reais.
    createdAt: api.first_contact_at,
  };
}

export function mapDeal(api: ApiDeal): Deal {
  return {
    id: api.id,
    tenantId: api.tenant_id,
    contactId: api.contact_id,
    title: api.title,
    products: api.products,
    value: api.value,
    payment: api.payment as Deal["payment"],
    tradeIn: api.trade_in,
    tradeInDesc: api.trade_in_desc ?? undefined,
    stage: api.stage as Deal["stage"],
    outcome: api.outcome as Deal["outcome"],
    lossReason: (api.loss_reason as Deal["lossReason"]) ?? undefined,
    ownerId: api.owner_id,
    stageChangedAt: api.stage_changed_at,
    // DealOut não expõe created_at nem expected_close_at — nenhuma tela usa
    // deal.createdAt hoje, então stage_changed_at é um valor honesto o
    // suficiente pra satisfazer o tipo sem inventar uma data fictícia.
    createdAt: api.stage_changed_at,
    supplierProductId: api.supplier_product_id ?? undefined,
    supplierValue: api.supplier_value ?? undefined,
    giftValue: api.gift_value ?? undefined,
    freightValue: api.freight_value ?? undefined,
  };
}

export function mapActivity(api: ApiActivity): Activity {
  return {
    id: api.id,
    tenantId: api.tenant_id,
    contactId: api.contact_id,
    dealId: api.deal_id ?? undefined,
    userId: api.user_id,
    type: api.type as Activity["type"],
    description: api.description,
    createdAt: api.created_at,
  };
}

export function mapAppointment(api: ApiAppointment): Appointment {
  return {
    id: api.id,
    tenantId: api.tenant_id,
    contactId: api.contact_id,
    dealId: api.deal_id ?? undefined,
    type: api.type as Appointment["type"],
    startsAt: api.starts_at,
    endsAt: api.ends_at,
    status: api.status as Appointment["status"],
    ownerId: api.owner_id,
    note: api.note ?? undefined,
    createdAt: api.starts_at,
  };
}

export interface ContactPayload {
  name: string;
  whatsapp: string;
  instagram?: string;
  email?: string;
  cpf?: string;
  address?: ApiAddress;
  origin: string;
  interests?: string[];
  tags?: string[];
  owner_id: string;
}

export interface DealPayload {
  contact_id: string;
  title: string;
  products: string;
  value: number;
  payment: string;
  trade_in?: boolean;
  trade_in_desc?: string;
  owner_id: string;
}

export interface DealFinancialsPayload {
  supplier_product_id?: string;
  supplier_value: number;
  gift_value: number;
  freight_value: number;
}

export interface ActivityPayload {
  contact_id: string;
  deal_id?: string;
  type: string;
  description: string;
}

export interface AppointmentPayload {
  contact_id: string;
  deal_id?: string;
  type: string;
  starts_at: string;
  ends_at: string;
  owner_id: string;
  note?: string;
}

export const api = {
  listConnections: () => request<ApiConnection[]>("/api/v1/connections"),
  createConnection: (phone: string) =>
    request<ApiConnection>("/api/v1/connections", { method: "POST", body: JSON.stringify({ phone }) }),
  pairConnection: (id: string) => request<ApiConnection>(`/api/v1/connections/${id}/pair`, { method: "POST" }),
  getQrCode: (id: string) => request<ApiQrCode>(`/api/v1/connections/${id}/qrcode`),
  disconnectConnection: (id: string) =>
    request<ApiConnection>(`/api/v1/connections/${id}/disconnect`, { method: "POST" }),
  sendMessage: (id: string, number: string, text: string) =>
    request<{ status: string }>(`/api/v1/connections/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ number, text }),
    }),

  listContacts: () => request<ApiContact[]>("/api/v1/contacts"),
  createContact: (body: ContactPayload) =>
    request<ApiContact>("/api/v1/contacts", { method: "POST", body: JSON.stringify(body) }),
  updateContact: (id: string, body: Partial<ContactPayload>) =>
    request<ApiContact>(`/api/v1/contacts/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  listDeals: () => request<ApiDeal[]>("/api/v1/deals"),
  createDeal: (body: DealPayload) => request<ApiDeal>("/api/v1/deals", { method: "POST", body: JSON.stringify(body) }),
  updateDeal: (id: string, body: Partial<{ title: string; products: string; value: number; payment: string }>) =>
    request<ApiDeal>(`/api/v1/deals/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  moveDeal: (id: string, stage: string) =>
    request<ApiDeal>(`/api/v1/deals/${id}/move`, { method: "POST", body: JSON.stringify({ stage }) }),
  markDealLost: (id: string, reason: string) =>
    request<ApiDeal>(`/api/v1/deals/${id}/mark-lost`, { method: "POST", body: JSON.stringify({ reason }) }),
  updateDealFinancials: (id: string, body: DealFinancialsPayload) =>
    request<ApiDeal>(`/api/v1/deals/${id}/financials`, { method: "PATCH", body: JSON.stringify(body) }),

  listActivities: (contactId: string) =>
    request<ApiActivity[]>(`/api/v1/activities?contact_id=${encodeURIComponent(contactId)}`),
  createActivity: (body: ActivityPayload) =>
    request<ApiActivity>("/api/v1/activities", { method: "POST", body: JSON.stringify(body) }),

  listAppointments: () => request<ApiAppointment[]>("/api/v1/appointments"),
  createAppointment: (body: AppointmentPayload) =>
    request<ApiAppointment>("/api/v1/appointments", { method: "POST", body: JSON.stringify(body) }),
  updateAppointment: (id: string, body: Partial<AppointmentPayload & { status: string }>) =>
    request<ApiAppointment>(`/api/v1/appointments/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
};
