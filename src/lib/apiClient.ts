// Cliente HTTP fino pro backend FastAPI — usado só pelas features que já
// migraram pra lá (WhatsApp/Evolution API, por enquanto). O resto do app
// ainda fala só com Supabase direto (auth) ou com o reducer local (dados
// ainda não migrados). Anexa o token de sessão do Supabase como Bearer —
// o backend valida esse mesmo token via sb.auth.get_user().

import { supabase } from "./supabaseClient";

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
};
