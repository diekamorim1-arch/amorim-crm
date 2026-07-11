// Cliente HTTP fino pro backend FastAPI — usado pelas features já migradas
// pra lá (WhatsApp/Evolution API, contatos/negócios/atividades/agendamentos/
// anexos/usuários/dashboard). Anexa o token de sessão do Supabase como
// Bearer — o backend valida esse mesmo token via sb.auth.get_user().

import { supabase } from "./supabaseClient";
import type { Activity, Appointment, Attachment, BillingStatus, Contact, Deal, LossReason, Role, Tenant, User } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {}

// Tenant que o admin_saas está "vestindo" via Entrar como gestor — setado
// por store.tsx sempre que a sessão reflete uma impersonação ativa. Vai em
// toda requisição autenticada como header X-Impersonate-Tenant; o backend
// só aceita esse header vindo de um token com role admin_saas de verdade
// (ver app/deps.py), então um valor stale aqui nunca vaza acesso indevido.
let impersonatedTenantId: string | null = null;

export function setImpersonatedTenantId(tenantId: string | null): void {
  impersonatedTenantId = tenantId;
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  if (impersonatedTenantId) {
    headers["X-Impersonate-Tenant"] = impersonatedTenantId;
  }
  return headers;
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

// Sem "Content-Type": o browser define o boundary do multipart sozinho a
// partir do FormData — sobrescrever isso quebra o parse no FastAPI.
async function requestMultipart<T>(path: string, formData: FormData): Promise<T> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, { method: "POST", headers, body: formData });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error?.message ?? `Erro ${response.status} ao chamar a API.`);
  }
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
// consome via tenantScope/selectors.

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

export interface ApiUser {
  id: string;
  tenant_id: string | null;
  role: string;
  name: string;
  email: string;
  avatar_color: string;
  avatar_url: string | null;
  is_active: boolean;
  notifications_last_seen_at: string | null;
}

export function mapUser(api: ApiUser): User {
  return {
    id: api.id,
    tenantId: api.tenant_id,
    name: api.name,
    email: api.email,
    role: api.role as Role,
    avatarColor: api.avatar_color,
    avatarUrl: api.avatar_url ?? undefined,
    notificationsLastSeenAt: api.notifications_last_seen_at ?? undefined,
    // GET /users não expõe created_at (user_profiles não guarda; teria que
    // vir de auth.users) — nenhuma tela usa User.createdAt pra membro de
    // equipe hoje, então "agora" é honesto o suficiente pra satisfazer o tipo.
    createdAt: new Date().toISOString(),
    isActive: api.is_active,
  };
}

export interface UserUpdatePayload {
  name?: string;
  email?: string;
}

export interface ApiAttachment {
  id: string;
  tenant_id: string;
  contact_id: string;
  deal_id: string | null;
  file_name: string;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
  url: string;
}

export function mapAttachment(api: ApiAttachment): Attachment {
  return {
    id: api.id,
    tenantId: api.tenant_id,
    contactId: api.contact_id,
    dealId: api.deal_id ?? undefined,
    fileName: api.file_name,
    fileType: api.file_type,
    // URL assinada do Supabase Storage (expira em alguns minutos), não um
    // data: URI — o campo é reaproveitado só pra não duplicar o tipo local.
    dataUrl: api.url,
    uploadedBy: api.uploaded_by,
    uploadedAt: api.uploaded_at,
  };
}

export interface ApiMonthlyHistoryItem {
  month: string;
  month_key: string;
  new_leads: number;
  revenue: number;
  net_profit: number;
}

export interface MonthlyHistoryItem {
  month: string;
  monthKey: string;
  newLeads: number;
  revenue: number;
  netProfit: number;
}

export function mapMonthlyHistoryItem(api: ApiMonthlyHistoryItem): MonthlyHistoryItem {
  return {
    month: api.month,
    monthKey: api.month_key,
    newLeads: api.new_leads,
    revenue: api.revenue,
    netProfit: api.net_profit,
  };
}

export interface ApiMonthlyDealDetail {
  deal_id: string;
  contact_id: string;
  contact_name: string;
  products: string;
  value: number;
  supplier_value: number;
  gift_value: number;
  freight_value: number;
  net_profit: number;
}

export interface MonthlyDealDetail {
  dealId: string;
  contactId: string;
  contactName: string;
  products: string;
  value: number;
  supplierValue: number;
  giftValue: number;
  freightValue: number;
  netProfit: number;
}

export function mapMonthlyDealDetail(api: ApiMonthlyDealDetail): MonthlyDealDetail {
  return {
    dealId: api.deal_id,
    contactId: api.contact_id,
    contactName: api.contact_name,
    products: api.products,
    value: api.value,
    supplierValue: api.supplier_value,
    giftValue: api.gift_value,
    freightValue: api.freight_value,
    netProfit: api.net_profit,
  };
}

export interface ApiTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  settings: { tags: string[]; loss_reasons: string[]; business_hours: string };
  created_at: string;
  billing_status: string;
  plan_expires_at: string | null;
}

export interface ImpersonateResponse {
  tenant_id: string;
  tenant_name: string;
}

export function mapTenant(api: ApiTenant): Tenant {
  return {
    id: api.id,
    name: api.name,
    slug: api.slug,
    plan: api.plan as Tenant["plan"],
    status: api.status as Tenant["status"],
    createdAt: api.created_at,
    billingStatus: api.billing_status as Tenant["billingStatus"],
    planExpiresAt: api.plan_expires_at ?? undefined,
    settings: {
      tags: api.settings.tags,
      lossReasons: api.settings.loss_reasons as LossReason[],
      businessHours: api.settings.business_hours,
    },
  };
}

export interface ApiAdminUser {
  id: string;
  tenant_id: string | null;
  tenant_name: string | null;
  role: string;
  name: string;
  email: string;
  avatar_color: string;
  avatar_url: string | null;
  is_active: boolean;
}

export interface AdminUser {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  role: Role;
  name: string;
  email: string;
  avatarColor: string;
  avatarUrl?: string;
  isActive: boolean;
}

export function mapAdminUser(api: ApiAdminUser): AdminUser {
  return {
    id: api.id,
    tenantId: api.tenant_id,
    tenantName: api.tenant_name,
    role: api.role as Role,
    name: api.name,
    email: api.email,
    avatarColor: api.avatar_color,
    avatarUrl: api.avatar_url ?? undefined,
    isActive: api.is_active,
  };
}

export const api = {
  listConnections: () => request<ApiConnection[]>("/api/v1/connections"),
  createConnection: (phone: string) =>
    request<ApiConnection>("/api/v1/connections", { method: "POST", body: JSON.stringify({ phone }) }),
  deleteConnection: (id: string) => request<void>(`/api/v1/connections/${id}`, { method: "DELETE" }),
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
  listRecentActivities: (limit = 20) => request<ApiActivity[]>(`/api/v1/activities/recent?limit=${limit}`),

  listUsers: () => request<ApiUser[]>("/api/v1/users"),
  updateUser: (id: string, body: UserUpdatePayload) =>
    request<ApiUser>(`/api/v1/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  updateUserRole: (id: string, role: Role) =>
    request<ApiUser>(`/api/v1/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  updateUserStatus: (id: string, isActive: boolean) =>
    request<ApiUser>(`/api/v1/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ is_active: isActive }) }),
  deleteUser: (id: string) => request<{ status: string }>(`/api/v1/users/${id}`, { method: "DELETE" }),
  updateMe: (name: string) => request<ApiUser>("/api/v1/users/me", { method: "PATCH", body: JSON.stringify({ name }) }),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return requestMultipart<ApiUser>("/api/v1/users/me/avatar", formData);
  },
  markNotificationsSeen: () => request<ApiUser>("/api/v1/users/me/notifications-seen", { method: "POST" }),

  listAppointments: () => request<ApiAppointment[]>("/api/v1/appointments"),
  createAppointment: (body: AppointmentPayload) =>
    request<ApiAppointment>("/api/v1/appointments", { method: "POST", body: JSON.stringify(body) }),
  updateAppointment: (id: string, body: Partial<AppointmentPayload & { status: string }>) =>
    request<ApiAppointment>(`/api/v1/appointments/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  getMonthlyHistory: (months = 12) =>
    request<ApiMonthlyHistoryItem[]>(`/api/v1/dashboard/monthly-history?months=${months}`),
  getMonthlyDetail: (year: number, month: number) =>
    request<ApiMonthlyDealDetail[]>(`/api/v1/dashboard/monthly-history/${year}/${month}`),

  listAttachments: (contactId: string) =>
    request<ApiAttachment[]>(`/api/v1/contacts/${contactId}/attachments`),
  uploadAttachment: (contactId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return requestMultipart<ApiAttachment>(`/api/v1/contacts/${contactId}/attachments`, formData);
  },
  deleteAttachment: (id: string) => request<{ status: string }>(`/api/v1/attachments/${id}`, { method: "DELETE" }),

  listTenants: () => request<ApiTenant[]>("/api/v1/tenants"),
  getTenant: (tenantId: string) => request<ApiTenant>(`/api/v1/tenants/${tenantId}`),
  createTenant: (name: string, plan: string) =>
    request<ApiTenant>("/api/v1/tenants", { method: "POST", body: JSON.stringify({ name, plan }) }),
  updateTenant: (tenantId: string, body: { name?: string; plan?: string }) =>
    request<ApiTenant>(`/api/v1/tenants/${tenantId}`, { method: "PATCH", body: JSON.stringify(body) }),
  updateTenantSettings: (
    tenantId: string,
    body: { tags?: string[]; loss_reasons?: string[]; business_hours?: string },
  ) =>
    request<ApiTenant>(`/api/v1/tenants/${tenantId}/settings`, { method: "PATCH", body: JSON.stringify(body) }),
  updateTenantBilling: (tenantId: string, billingStatus: BillingStatus, planExpiresAt: string | null) =>
    request<ApiTenant>(`/api/v1/tenants/${tenantId}/billing`, {
      method: "PATCH",
      body: JSON.stringify({ billing_status: billingStatus, plan_expires_at: planExpiresAt }),
    }),
  impersonateTenant: (tenantId: string) =>
    request<ImpersonateResponse>(`/api/v1/tenants/${tenantId}/impersonate`, { method: "POST" }),

  listAdminUsers: () => request<ApiAdminUser[]>("/api/v1/admin/users"),
};
