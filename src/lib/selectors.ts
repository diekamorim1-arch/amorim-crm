import { STAGES, STALE_DAYS } from "./constants";
import type {
  Activity,
  Appointment,
  Attachment,
  Contact,
  Conversation,
  CrmState,
  Deal,
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
  };
}

export function currentUser(state: CrmState): User | null {
  if (!state.session) return null;
  return state.users.find((u) => u.id === state.session!.userId) ?? null;
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

function isSameMonth(iso: string, reference: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === reference.getFullYear() && d.getMonth() === reference.getMonth();
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
    .reduce((sum, d) => sum + (d.value - (d.supplierValue ?? 0) - (d.giftValue ?? 0)), 0);

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
