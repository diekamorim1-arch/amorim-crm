// Modelo de dados do Amorim CRM — contrato consumido por todas as telas.

export type Role = "atendente" | "gestor" | "admin_saas";
export type Stage = "novo_lead" | "em_atendimento" | "negociacao" | "fechamento" | "pos_venda";
export type Outcome = "aberto" | "ganho" | "perdido";
export type LossReason = "preco" | "prazo_entrega" | "sem_modelo" | "concorrencia" | "sem_resposta" | "desistiu";
export type JourneyStatus = "lead" | "cliente" | "recorrente";
export type Origin = "instagram_organico" | "instagram_ads" | "whatsapp_direto" | "indicacao" | "outro";
export type ProductLine = "iphone" | "ipad" | "mac" | "watch" | "airpods" | "acessorios";
export type PaymentMethod = "pix" | "cartao_avista" | "cartao_parcelado" | "boleto";
export type AppointmentType = "entrega" | "retirada" | "atendimento" | "follow_up";
export type AppointmentStatus = "agendado" | "concluido" | "cancelado";
export type ConnectionStatus = "desconectado" | "pareando" | "conectado";
export type ActivityType = "mensagem" | "mudanca_estagio" | "nota" | "agendamento" | "venda";

export type BillingStatus = "em_dia" | "vencido" | "cancelado";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "starter" | "pro";
  status: "ativo" | "suspenso";
  createdAt: string;
  settings: { tags: string[]; lossReasons: LossReason[]; businessHours: string };
  billingStatus: BillingStatus;
  planExpiresAt?: string;
}

export interface User {
  id: string;
  tenantId: string | null;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
  avatarUrl?: string;
  createdAt: string;
  isActive: boolean;
  notificationsLastSeenAt?: string;
}

export interface Contact {
  id: string;
  tenantId: string;
  name: string;
  whatsapp: string;
  instagram?: string;
  email?: string;
  cpf?: string;
  address?: { street: string; city: string; state: string; zip: string };
  origin: Origin;
  interests: ProductLine[];
  tags: string[];
  journeyStatus: JourneyStatus;
  ownerId: string;
  firstContactAt: string;
  lastInteractionAt: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  whatsapp: string;
  contactName?: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

export interface SupplierProduct {
  id: string;
  tenantId: string;
  supplierId: string;
  name: string;
  currentPrice: number;
  updatedAt: string;
  createdAt: string;
}

export interface SupplierPriceChange {
  id: string;
  tenantId: string;
  supplierProductId: string;
  price: number;
  changedAt: string;
}

export interface Deal {
  id: string;
  tenantId: string;
  contactId: string;
  title: string;
  products: string;
  value: number;
  payment: PaymentMethod;
  tradeIn: boolean;
  tradeInDesc?: string;
  stage: Stage;
  outcome: Outcome;
  lossReason?: LossReason;
  ownerId: string;
  expectedCloseAt?: string;
  stageChangedAt: string;
  createdAt: string;
  supplierProductId?: string;
  supplierValue?: number;
  giftValue?: number;
  freightValue?: number;
}

export interface Conversation {
  id: string;
  tenantId: string;
  contactId: string;
  assigneeId: string | null;
  status: "aberta" | "resolvida";
  unread: number;
  createdAt: string;
}

export interface Message {
  id: string;
  tenantId: string;
  conversationId: string;
  direction: "in" | "out";
  text: string;
  authorId?: string;
  status: "enviada" | "entregue" | "lida";
  createdAt: string;
}

export interface Appointment {
  id: string;
  tenantId: string;
  contactId: string;
  dealId?: string;
  type: AppointmentType;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  ownerId: string;
  note?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  tenantId: string;
  contactId: string;
  dealId?: string;
  userId: string;
  type: ActivityType;
  description: string;
  createdAt: string;
}

export interface WhatsAppConnection {
  id: string;
  tenantId: string;
  userId: string;
  phone: string;
  status: ConnectionStatus;
  connectedAt?: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  tenantId: string;
  contactId: string;
  dealId?: string;
  fileName: string;
  fileType: string;
  dataUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Expense {
  id: string;
  tenantId: string;
  description: string;
  value: number;
  userId: string;
  createdAt: string;
}

export interface Session {
  userId: string;
  tenantId: string;
  role: Role;
  /** Nome da loja impersonada (ENTER_TENANT_AS_GESTOR) — só usado pelo
   * banner "Você está vendo X como Admin" do AppShell; state.tenants não é
   * populado numa sessão real, então o nome vem direto da resposta de
   * POST /tenants/{id}/impersonate em vez de um lookup em state.tenants. */
  tenantName?: string;
}

export interface CrmState {
  tenants: Tenant[];
  users: User[];
  contacts: Contact[];
  deals: Deal[];
  conversations: Conversation[];
  messages: Message[];
  appointments: Appointment[];
  activities: Activity[];
  connections: WhatsAppConnection[];
  suppliers: Supplier[];
  supplierProducts: SupplierProduct[];
  supplierPriceChanges: SupplierPriceChange[];
  attachments: Attachment[];
  expenses: Expense[];
  session: Session | null;
}
