import { STAGES, STALE_DAYS } from "./constants";
import { monthLabel } from "./format";
import type {
  Activity,
  Appointment,
  Attachment,
  Contact,
  Conversation,
  CrmState,
  Deal,
  Expense,
  LossReason,
  Message,
  Origin,
  Stage,
  Supplier,
  SupplierPriceChange,
  SupplierProduct,
  User,
  WhatsAppConnection,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Todas as coleções do state já filtradas pelo tenant da sessão atual. */
export function tenantScope(state: CrmState): {
  contacts: Contact[];
  deals: Deal[];
  conversations: Conversation[];
  messages: Message[];
  appointments: Appointment[];
  activities: Activity[];
  connections: WhatsAppConnection[];
  users: User[];
  suppliers: Supplier[];
  supplierProducts: SupplierProduct[];
  supplierPriceChanges: SupplierPriceChange[];
  attachments: Attachment[];
  expenses: Expense[];
} {
  const tenantId = state.session?.tenantId;
  if (!tenantId) {
    return {
      contacts: [],
      deals: [],
      conversations: [],
      messages: [],
      appointments: [],
      activities: [],
      connections: [],
      users: [],
      suppliers: [],
      supplierProducts: [],
      supplierPriceChanges: [],
      attachments: [],
      expenses: [],
    };
  }

  return {
    contacts: state.contacts.filter((c) => c.tenantId === tenantId),
    deals: state.deals.filter((d) => d.tenantId === tenantId),
    conversations: state.conversations.filter((c) => c.tenantId === tenantId),
    messages: state.messages.filter((m) => m.tenantId === tenantId),
    appointments: state.appointments.filter((a) => a.tenantId === tenantId),
    activities: state.activities.filter((a) => a.tenantId === tenantId),
    connections: state.connections.filter((c) => c.tenantId === tenantId),
    users: state.users.filter((u) => u.tenantId === tenantId),
    suppliers: state.suppliers.filter((s) => s.tenantId === tenantId),
    supplierProducts: state.supplierProducts.filter((p) => p.tenantId === tenantId),
    supplierPriceChanges: state.supplierPriceChanges.filter((p) => p.tenantId === tenantId),
    attachments: state.attachments.filter((a) => a.tenantId === tenantId),
    expenses: state.expenses.filter((e) => e.tenantId === tenantId),
  };
}

/** Usuário efetivo da sessão atual. Enquanto um admin_saas está "vestindo" o
 * papel de gestor de uma loja (Entrar como gestor), state.session.role vira
 * "gestor" mas o registro em state.users continua sendo o perfil real do
 * admin (role admin_saas) — o userId nunca muda durante a impersonação.
 * Sem sobrescrever role aqui, toda tela que faz `currentUser(state)?.role
 * === "gestor"` pra liberar edição (Pipeline, Fornecedores, ficha do
 * cliente...) ficaria bloqueada pro admin dentro da loja. */
export function currentUser(state: CrmState): User | null {
  if (!state.session) return null;
  const user = state.users.find((u) => u.id === state.session!.userId);
  if (!user) return null;
  return user.role === state.session.role ? user : { ...user, role: state.session.role };
}

/** true quando a sessão atual é um admin_saas "vestindo" o papel de gestor
 * de uma loja via Entrar como gestor — detectado comparando o role real do
 * perfil (state.users, nunca sobrescrito) com o role efetivo da sessão. */
export function isImpersonating(state: CrmState): boolean {
  if (!state.session) return false;
  const realUser = state.users.find((u) => u.id === state.session!.userId);
  return realUser?.role === "admin_saas" && state.session.role === "gestor";
}

/** Usuários elegíveis pra "Responsável" nos formulários de lead/cliente/
 * agendamento: o time real do tenant, mais o próprio admin_saas quando está
 * impersonando. O admin nunca tem vínculo em user_profiles com esta loja
 * (tenant_id null no perfil dele), então nunca aparece em
 * tenantScope(state).users — mas o backend aceita ele como owner_id da
 * própria sessão impersonada (ver app/core/tenant_guard.py::
 * verify_owner_or_self), então ele precisa aparecer como opção aqui. */
export function assignableUsers(state: CrmState): User[] {
  const users = tenantScope(state).users;
  if (!isImpersonating(state)) return users;
  const admin = state.users.find((u) => u.id === state.session!.userId);
  if (!admin) return users;
  return [...users, { ...admin, role: "gestor", name: `${admin.name} (Admin)` }];
}

/** Deals ativos (outcome !== "perdido") do tenant atual, agrupados por estágio. */
export function dealsByStage(state: CrmState): Record<Stage, Deal[]> {
  const { deals } = tenantScope(state);
  const grouped = STAGES.reduce(
    (acc, s) => ({ ...acc, [s.id]: [] as Deal[] }),
    {} as Record<Stage, Deal[]>,
  );
  for (const deal of deals) {
    if (deal.outcome === "perdido") continue;
    grouped[deal.stage].push(deal);
  }
  return grouped;
}

export function lostDeals(state: CrmState): Deal[] {
  return tenantScope(state).deals.filter((d) => d.outcome === "perdido");
}

/** Um deal aberto é considerado "parado" quando não muda de estágio há mais de STALE_DAYS dias. */
export function isStale(deal: Deal): boolean {
  if (deal.outcome !== "aberto") return false;
  const elapsed = Date.now() - new Date(deal.stageChangedAt).getTime();
  return elapsed > STALE_DAYS * DAY_MS;
}

export function contactById(state: CrmState, id: string): Contact | undefined {
  return tenantScope(state).contacts.find((c) => c.id === id);
}

export function conversationWithContact(state: CrmState, contactId: string): Conversation | undefined {
  return tenantScope(state).conversations.find((c) => c.contactId === contactId);
}

export function isSameMonth(iso: string, reference: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === reference.getFullYear() && d.getMonth() === reference.getMonth();
}

/** Chave ordenável/comparável de mês, ex.: "2026-07" — usada tanto no
 * histórico mensal do Dashboard quanto no filtro de mês de Lucro por Cliente
 * e nos fechamentos mensais de Gastos. */
export function monthKeyOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Leads (contatos) cujo primeiro contato caiu no mês corrente — versão em
 * lista de `dashboardMetrics().newLeadsMonth` (só a contagem), pro drill-down
 * do card "Leads novos no mês" no Dashboard. */
export function newLeadsThisMonth(state: CrmState): Contact[] {
  const now = new Date();
  return tenantScope(state).contacts.filter((c) => isSameMonth(c.firstContactAt, now));
}

/** Negócios ganhos num mês específico (`monthKey` no formato "YYYY-MM"),
 * já pareados com o contato — base do drill-down "Clientes que compraram no
 * mês" e da tabela "Lucro líquido por cliente" (filtrável por mês). */
export function wonDealsForMonth(state: CrmState, monthKey: string): { contact: Contact; deal: Deal }[] {
  const { contacts, deals } = tenantScope(state);
  const rows: { contact: Contact; deal: Deal }[] = [];
  for (const deal of deals) {
    if (deal.outcome !== "ganho" || monthKeyOf(deal.stageChangedAt) !== monthKey) continue;
    const contact = contacts.find((c) => c.id === deal.contactId);
    if (contact) rows.push({ contact, deal });
  }
  return rows.sort((a, b) => new Date(b.deal.stageChangedAt).getTime() - new Date(a.deal.stageChangedAt).getTime());
}

/** Negócios ganhos no mês corrente — atalho de `wonDealsForMonth` pro
 * drill-down do card "Clientes que compraram no mês" no Dashboard. */
export function customersWonThisMonth(state: CrmState): { contact: Contact; deal: Deal }[] {
  return wonDealsForMonth(state, monthKeyOf(new Date().toISOString()));
}

/** Lucro líquido de um negócio ganho: venda - custo de fornecedor - brindes -
 * frete. Mesma fórmula usada ao vivo no EditDealDialog e em
 * dashboardMetrics().netProfitMonth — centralizada aqui pra não divergir. */
export function dealNetProfit(deal: Deal): number {
  return deal.value - (deal.supplierValue ?? 0) - (deal.giftValue ?? 0) - (deal.freightValue ?? 0);
}

/** Série mensal (mais antigo primeiro) dos últimos `monthsBack` meses,
 * incluindo o corrente — agregada a partir de contacts/deals já carregados,
 * sem precisar de tabela/endpoint novo. */
export function monthlyHistory(
  state: CrmState,
  monthsBack = 12,
): { month: string; monthKey: string; newLeads: number; revenue: number; netProfit: number }[] {
  const { contacts, deals } = tenantScope(state);
  const now = new Date();
  const months: { month: string; monthKey: string; newLeads: number; revenue: number; netProfit: number }[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const newLeads = contacts.filter((c) => isSameMonth(c.firstContactAt, ref)).length;
    const wonThisMonth = deals.filter((d) => d.outcome === "ganho" && isSameMonth(d.stageChangedAt, ref));
    const revenue = wonThisMonth.reduce((sum, d) => sum + d.value, 0);
    const netProfit = wonThisMonth.reduce((sum, d) => sum + dealNetProfit(d), 0);
    months.push({
      month: monthLabel(ref),
      monthKey: monthKeyOf(ref.toISOString()),
      newLeads,
      revenue,
      netProfit,
    });
  }

  return months;
}

/** Histórico de preços de um produto de fornecedor, mais recente primeiro. */
export function priceHistoryForProduct(state: CrmState, productId: string): SupplierPriceChange[] {
  return tenantScope(state)
    .supplierPriceChanges.filter((c) => c.supplierProductId === productId)
    .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
}

export function dashboardMetrics(state: CrmState): {
  newLeadsMonth: number;
  inNegotiationValue: number;
  revenueMonth: number;
  revenuePrevMonth: number;
  netProfitMonth: number;
  conversionRate: number;
  funnelCounts: { stage: Stage; count: number; value: number }[];
  byChannel: { origin: Origin; total: number; won: number }[];
  lossRanking: { reason: LossReason; count: number }[];
} {
  const { contacts, deals } = tenantScope(state);

  const now = new Date();
  const prevMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const newLeadsMonth = contacts.filter((c) => isSameMonth(c.firstContactAt, now)).length;

  const inNegotiationValue = deals
    .filter((d) => d.outcome === "aberto" && (d.stage === "negociacao" || d.stage === "fechamento"))
    .reduce((sum, d) => sum + d.value, 0);

  const wonDeals = deals.filter((d) => d.outcome === "ganho");
  const revenueMonth = wonDeals
    .filter((d) => isSameMonth(d.stageChangedAt, now))
    .reduce((sum, d) => sum + d.value, 0);
  const revenuePrevMonth = wonDeals
    .filter((d) => isSameMonth(d.stageChangedAt, prevMonthRef))
    .reduce((sum, d) => sum + d.value, 0);
  const netProfitMonth = wonDeals
    .filter((d) => isSameMonth(d.stageChangedAt, now))
    .reduce((sum, d) => sum + dealNetProfit(d), 0);

  const lostCount = deals.filter((d) => d.outcome === "perdido").length;
  const wonCount = wonDeals.length;
  const decidedCount = wonCount + lostCount;
  const conversionRate = decidedCount === 0 ? 0 : Math.round((wonCount / decidedCount) * 1000) / 10;

  const dealsByStageMap = dealsByStage(state);
  const funnelCounts = STAGES.map((s) => {
    const stageDeals = dealsByStageMap[s.id];
    return {
      stage: s.id,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + d.value, 0),
    };
  });

  const originsPresent = Array.from(new Set(contacts.map((c) => c.origin)));
  const byChannel = originsPresent.map((origin) => {
    const channelContacts = contacts.filter((c) => c.origin === origin);
    const channelContactIds = new Set(channelContacts.map((c) => c.id));
    const wonContactIds = new Set(
      deals.filter((d) => d.outcome === "ganho" && channelContactIds.has(d.contactId)).map((d) => d.contactId),
    );
    return {
      origin,
      total: channelContacts.length,
      won: wonContactIds.size,
    };
  });

  const lossReasonCounts = new Map<LossReason, number>();
  for (const deal of deals) {
    if (deal.outcome !== "perdido" || !deal.lossReason) continue;
    lossReasonCounts.set(deal.lossReason, (lossReasonCounts.get(deal.lossReason) ?? 0) + 1);
  }
  const lossRanking = Array.from(lossReasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  return {
    newLeadsMonth,
    inNegotiationValue,
    revenueMonth,
    revenuePrevMonth,
    netProfitMonth,
    conversionRate,
    funnelCounts,
    byChannel,
    lossRanking,
  };
}
