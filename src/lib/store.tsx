import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type JSX,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { newId } from "./id";
import { isImpersonating } from "./selectors";
import { supabase } from "./supabaseClient";
import {
  api,
  mapAppointment,
  mapContact,
  mapConversation,
  mapDeal,
  mapExpense,
  mapMessage,
  mapSupplier,
  mapSupplierProduct,
  mapUser,
  setImpersonatedTenantId,
  type ApiAppointment,
  type ApiContact,
  type ApiConversation,
  type ApiDeal,
  type ApiExpense,
  type ApiMessage,
  type ApiSupplier,
  type ApiSupplierProduct,
} from "./apiClient";
import type {
  Activity,
  Appointment,
  Attachment,
  Contact,
  ConnectionStatus,
  Conversation,
  CrmState,
  Deal,
  Expense,
  LossReason,
  Message,
  Stage,
  Supplier,
  SupplierPriceChange,
  SupplierProduct,
  User,
} from "./types";

// Re-exportado para consumidores que já importam `newId` de "@/lib/store"
// (a maioria dos componentes) — a implementação real vive em "./id" para
// evitar um ciclo de import com seed.ts (ver comentário em id.ts).
export { newId };

// Re-exportado para consumidores que despacham ações fora de componentes
// React e precisam tipar seu próprio `dispatch` recebido por parâmetro sem
// importar diretamente de "react".
export type { Dispatch };

export type CrmAction =
  | { type: "LOGOUT" }
  | { type: "MOVE_DEAL"; dealId: string; stage: Stage }
  | { type: "MARK_DEAL_LOST"; dealId: string; reason: LossReason }
  | { type: "ADD_CONTACT"; contact: Contact }
  | { type: "UPDATE_CONTACT"; contact: Contact }
  | { type: "REMOVE_CONTACT"; contactId: string }
  | { type: "REMOTE_UPSERT_CONTACT"; contact: Contact }
  | { type: "ADD_DEAL"; deal: Deal }
  | { type: "UPDATE_DEAL"; deal: Deal }
  | { type: "REMOVE_DEAL"; dealId: string }
  | { type: "REMOTE_UPSERT_DEAL"; deal: Deal }
  | { type: "REMOTE_UPSERT_CONVERSATION"; conversation: Conversation }
  | { type: "REMOTE_UPSERT_MESSAGE"; message: Message }
  | { type: "SET_MESSAGES"; conversationId: string; messages: Message[] }
  | { type: "ADD_APPOINTMENT"; appointment: Appointment }
  | { type: "UPDATE_APPOINTMENT"; appointment: Appointment }
  | { type: "REMOVE_APPOINTMENT"; appointmentId: string }
  | { type: "REMOTE_UPSERT_APPOINTMENT"; appointment: Appointment }
  | { type: "ADD_ACTIVITY"; activity: Activity }
  | { type: "SET_CONNECTION_STATUS"; connectionId: string; status: ConnectionStatus }
  | { type: "ADD_USER"; user: User }
  | { type: "UPDATE_USER"; user: User }
  | { type: "REMOVE_USER"; userId: string }
  | { type: "ADD_SUPPLIER"; supplier: Supplier }
  | { type: "UPDATE_SUPPLIER"; supplier: Supplier }
  | { type: "REMOVE_SUPPLIER"; supplierId: string }
  | { type: "REMOTE_UPSERT_SUPPLIER"; supplier: Supplier }
  | { type: "ADD_SUPPLIER_PRODUCT"; product: SupplierProduct }
  | { type: "ADD_SUPPLIER_PRODUCTS"; products: SupplierProduct[] }
  | { type: "UPDATE_SUPPLIER_PRODUCT_PRICE"; productId: string; price: number }
  | { type: "UPDATE_SUPPLIER_PRODUCT"; productId: string; name: string; price: number; colors?: string }
  | { type: "REMOVE_SUPPLIER_PRODUCT"; productId: string }
  | { type: "REMOTE_UPSERT_SUPPLIER_PRODUCT"; product: SupplierProduct }
  | { type: "UPDATE_DEAL_FINANCIALS"; dealId: string; value: number; supplierProductId?: string; supplierValue: number; giftValue: number; freightValue: number }
  | { type: "ADD_ATTACHMENT"; attachment: Attachment }
  | { type: "REMOVE_ATTACHMENT"; attachmentId: string }
  | { type: "ADD_EXPENSE"; expense: Expense }
  | { type: "REMOVE_EXPENSE"; expenseId: string }
  | { type: "SET_EXPENSES"; expenses: Expense[] }
  | { type: "REMOTE_UPSERT_EXPENSE"; expense: Expense }
  | { type: "SET_AUTH_SESSION"; user: User }
  | {
      type: "SET_REMOTE_DATA";
      contacts: Contact[];
      deals: Deal[];
      appointments: Appointment[];
      users: User[];
      suppliers: Supplier[];
      supplierProducts: SupplierProduct[];
      conversations: Conversation[];
      expenses: Expense[];
    }
  | { type: "ENTER_TENANT_AS_GESTOR"; tenantId: string; tenantName: string }
  | { type: "EXIT_IMPERSONATION" };

function countWonDeals(state: CrmState, contactId: string): number {
  return state.deals.filter((d) => d.contactId === contactId && d.outcome === "ganho").length;
}

/** Insere ou substitui por id — usado pelos eventos REMOTE_UPSERT_* (Supabase
 * Realtime): tanto faz se o evento é a própria mutação otimista ecoando de
 * volta (já existe, vira substituição) ou a mutação de outro usuário chegando
 * pela primeira vez (não existe, vira inserção). */
function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
}

/** Reducer puro — sem dependências de React, testável isoladamente. */
export function crmReducer(state: CrmState, action: CrmAction): CrmState {
  switch (action.type) {
    case "LOGOUT": {
      return { ...state, session: null };
    }

    case "MOVE_DEAL": {
      const deal = state.deals.find((d) => d.id === action.dealId);
      if (!deal) return state;
      const now = new Date().toISOString();
      const isWinningMove = action.stage === "pos_venda";

      const updatedDeal: Deal = {
        ...deal,
        stage: action.stage,
        stageChangedAt: now,
        outcome: isWinningMove ? "ganho" : deal.outcome,
      };

      const deals = state.deals.map((d) => (d.id === deal.id ? updatedDeal : d));

      const stageActivity: Activity = {
        id: newId("activity"),
        tenantId: deal.tenantId,
        contactId: deal.contactId,
        dealId: deal.id,
        userId: deal.ownerId,
        type: "mudanca_estagio",
        description: `Deal movido para o estágio ${action.stage}.`,
        createdAt: now,
      };

      let activities = [...state.activities, stageActivity];
      let contacts = state.contacts;

      if (isWinningMove) {
        const saleActivity: Activity = {
          id: newId("activity"),
          tenantId: deal.tenantId,
          contactId: deal.contactId,
          dealId: deal.id,
          userId: deal.ownerId,
          type: "venda",
          description: `Venda concluída: ${deal.products}.`,
          createdAt: now,
        };
        activities = [...activities, saleActivity];

        const wonCount = countWonDeals({ ...state, deals }, deal.contactId);
        const journeyStatus = wonCount >= 2 ? "recorrente" : "cliente";
        contacts = state.contacts.map((c) => (c.id === deal.contactId ? { ...c, journeyStatus } : c));
      }

      return { ...state, deals, activities, contacts };
    }

    case "MARK_DEAL_LOST": {
      if (!action.reason) return state;
      const deal = state.deals.find((d) => d.id === action.dealId);
      if (!deal) return state;
      const deals = state.deals.map((d) =>
        d.id === action.dealId ? { ...d, outcome: "perdido" as const, lossReason: action.reason } : d,
      );
      return { ...state, deals };
    }

    case "ADD_CONTACT": {
      return { ...state, contacts: [...state.contacts, action.contact] };
    }

    case "UPDATE_CONTACT": {
      return { ...state, contacts: state.contacts.map((c) => (c.id === action.contact.id ? action.contact : c)) };
    }

    case "REMOTE_UPSERT_CONTACT": {
      return { ...state, contacts: upsertById(state.contacts, action.contact) };
    }

    case "ADD_DEAL": {
      return { ...state, deals: [...state.deals, action.deal] };
    }

    case "UPDATE_DEAL": {
      // Substituição direta do deal pelo objeto retornado pela própria
      // chamada de API que o mutou (mover de estágio, marcar perdido,
      // editar) — usada no lugar de refreshCrmData() pra não refazer os 4
      // fetches completos a cada mutação. Também serve pra reverter uma
      // atualização otimista (ex.: PipelinePage.handleMoveDeal) passando o
      // deal original de volta se a chamada de API falhar.
      return { ...state, deals: state.deals.map((d) => (d.id === action.deal.id ? action.deal : d)) };
    }

    case "REMOVE_DEAL": {
      return { ...state, deals: state.deals.filter((d) => d.id !== action.dealId) };
    }

    case "REMOTE_UPSERT_DEAL": {
      return { ...state, deals: upsertById(state.deals, action.deal) };
    }

    case "REMOVE_CONTACT": {
      const { contactId } = action;
      const removedConversationIds = new Set(
        state.conversations.filter((c) => c.contactId === contactId).map((c) => c.id),
      );
      return {
        ...state,
        contacts: state.contacts.filter((c) => c.id !== contactId),
        deals: state.deals.filter((d) => d.contactId !== contactId),
        appointments: state.appointments.filter((a) => a.contactId !== contactId),
        activities: state.activities.filter((a) => a.contactId !== contactId),
        attachments: state.attachments.filter((a) => a.contactId !== contactId),
        conversations: state.conversations.filter((c) => c.contactId !== contactId),
        messages: state.messages.filter((m) => !removedConversationIds.has(m.conversationId)),
      };
    }

    case "REMOTE_UPSERT_CONVERSATION": {
      return { ...state, conversations: upsertById(state.conversations, action.conversation) };
    }

    case "REMOTE_UPSERT_MESSAGE": {
      return { ...state, messages: upsertById(state.messages, action.message) };
    }

    case "SET_MESSAGES": {
      // Substituição só das mensagens desta conversa — busca o histórico
      // completo a cada abertura do ChatPane (GET /conversations/{id}/messages,
      // que também marca a conversa como lida no servidor), preservando
      // mensagens já carregadas de outras conversas no state.
      return {
        ...state,
        messages: [...state.messages.filter((m) => m.conversationId !== action.conversationId), ...action.messages],
      };
    }

    case "ADD_APPOINTMENT": {
      return { ...state, appointments: [...state.appointments, action.appointment] };
    }

    case "UPDATE_APPOINTMENT": {
      return {
        ...state,
        appointments: state.appointments.map((a) => (a.id === action.appointment.id ? action.appointment : a)),
      };
    }

    case "REMOVE_APPOINTMENT": {
      return { ...state, appointments: state.appointments.filter((a) => a.id !== action.appointmentId) };
    }

    case "REMOTE_UPSERT_APPOINTMENT": {
      return { ...state, appointments: upsertById(state.appointments, action.appointment) };
    }

    case "ADD_ACTIVITY": {
      return { ...state, activities: [...state.activities, action.activity] };
    }

    case "SET_CONNECTION_STATUS": {
      const now = new Date().toISOString();
      return {
        ...state,
        connections: state.connections.map((c) =>
          c.id === action.connectionId
            ? { ...c, status: action.status, connectedAt: action.status === "conectado" ? now : c.connectedAt }
            : c,
        ),
      };
    }

    case "ADD_USER": {
      return { ...state, users: [...state.users, action.user] };
    }

    case "UPDATE_USER": {
      return { ...state, users: state.users.map((u) => (u.id === action.user.id ? action.user : u)) };
    }

    case "REMOVE_USER": {
      return { ...state, users: state.users.filter((u) => u.id !== action.userId) };
    }

    case "ADD_SUPPLIER": {
      return { ...state, suppliers: [...state.suppliers, action.supplier] };
    }

    case "UPDATE_SUPPLIER": {
      return { ...state, suppliers: state.suppliers.map((s) => (s.id === action.supplier.id ? action.supplier : s)) };
    }

    case "REMOTE_UPSERT_SUPPLIER": {
      return { ...state, suppliers: upsertById(state.suppliers, action.supplier) };
    }

    case "REMOVE_SUPPLIER": {
      const removedProductIds = new Set(
        state.supplierProducts.filter((p) => p.supplierId === action.supplierId).map((p) => p.id),
      );
      return {
        ...state,
        suppliers: state.suppliers.filter((s) => s.id !== action.supplierId),
        supplierProducts: state.supplierProducts.filter((p) => p.supplierId !== action.supplierId),
        supplierPriceChanges: state.supplierPriceChanges.filter((c) => !removedProductIds.has(c.supplierProductId)),
        // Mesma regra do delete_supplier no backend: deals que referenciavam
        // um produto deste fornecedor só perdem o vínculo, o negócio em si
        // (e o valor financeiro já gravado nele) continua existindo.
        deals: state.deals.map((d) =>
          d.supplierProductId && removedProductIds.has(d.supplierProductId)
            ? { ...d, supplierProductId: undefined }
            : d,
        ),
      };
    }

    case "ADD_SUPPLIER_PRODUCT": {
      return { ...state, supplierProducts: [...state.supplierProducts, action.product] };
    }

    case "ADD_SUPPLIER_PRODUCTS": {
      return { ...state, supplierProducts: [...state.supplierProducts, ...action.products] };
    }

    case "UPDATE_SUPPLIER_PRODUCT_PRICE": {
      const product = state.supplierProducts.find((p) => p.id === action.productId);
      if (!product) return state;
      const now = new Date().toISOString();

      const priceChange: SupplierPriceChange = {
        id: newId("pricechg"),
        tenantId: product.tenantId,
        supplierProductId: product.id,
        price: action.price,
        changedAt: now,
      };

      const supplierProducts = state.supplierProducts.map((p) =>
        p.id === product.id ? { ...p, currentPrice: action.price, updatedAt: now } : p,
      );

      return { ...state, supplierProducts, supplierPriceChanges: [...state.supplierPriceChanges, priceChange] };
    }

    case "UPDATE_SUPPLIER_PRODUCT": {
      const product = state.supplierProducts.find((p) => p.id === action.productId);
      if (!product) return state;
      const priceChanged = action.price !== product.currentPrice;
      const now = new Date().toISOString();

      const supplierProducts = state.supplierProducts.map((p) =>
        p.id === product.id
          ? {
              ...p,
              name: action.name,
              currentPrice: action.price,
              colors: action.colors,
              updatedAt: priceChanged ? now : p.updatedAt,
            }
          : p,
      );

      if (!priceChanged) {
        return { ...state, supplierProducts };
      }

      const priceChange: SupplierPriceChange = {
        id: newId("pricechg"),
        tenantId: product.tenantId,
        supplierProductId: product.id,
        price: action.price,
        changedAt: now,
      };

      return { ...state, supplierProducts, supplierPriceChanges: [...state.supplierPriceChanges, priceChange] };
    }

    case "REMOVE_SUPPLIER_PRODUCT": {
      return {
        ...state,
        supplierProducts: state.supplierProducts.filter((p) => p.id !== action.productId),
        supplierPriceChanges: state.supplierPriceChanges.filter((c) => c.supplierProductId !== action.productId),
        // deals.supplier_product_id vira null no backend quando o produto é
        // excluído — reflete o mesmo desvínculo aqui, sem tocar no resto do
        // negócio.
        deals: state.deals.map((d) => (d.supplierProductId === action.productId ? { ...d, supplierProductId: undefined } : d)),
      };
    }

    case "REMOTE_UPSERT_SUPPLIER_PRODUCT": {
      // Só substitui a linha do produto — o histórico de preço em si (a
      // tabela supplier_price_changes) tem sua própria origem de verdade no
      // servidor; recriar uma entrada de histórico aqui a partir do evento
      // Realtime duplicaria o registro que o outro usuário já gravou.
      return { ...state, supplierProducts: upsertById(state.supplierProducts, action.product) };
    }

    case "UPDATE_DEAL_FINANCIALS": {
      const deal = state.deals.find((d) => d.id === action.dealId);
      if (!deal) return state;
      const deals = state.deals.map((d) =>
        d.id === action.dealId
          ? {
              ...d,
              value: action.value,
              supplierProductId: action.supplierProductId,
              supplierValue: action.supplierValue,
              giftValue: action.giftValue,
              freightValue: action.freightValue,
            }
          : d,
      );
      return { ...state, deals };
    }

    case "ADD_ATTACHMENT": {
      return { ...state, attachments: [...state.attachments, action.attachment] };
    }

    case "REMOVE_ATTACHMENT": {
      return { ...state, attachments: state.attachments.filter((a) => a.id !== action.attachmentId) };
    }

    case "ADD_EXPENSE": {
      return { ...state, expenses: [...state.expenses, action.expense] };
    }

    case "REMOVE_EXPENSE": {
      return { ...state, expenses: state.expenses.filter((e) => e.id !== action.expenseId) };
    }

    case "REMOTE_UPSERT_EXPENSE": {
      return { ...state, expenses: upsertById(state.expenses, action.expense) };
    }

    case "SET_EXPENSES": {
      // Substituição completa (não ADD_EXPENSE em loop) — GastosPage busca
      // os gastos do tenant a cada montagem; usar ADD_EXPENSE duplicaria
      // tudo se a pessoa saísse e voltasse pra tela.
      return { ...state, expenses: action.expenses };
    }

    case "SET_AUTH_SESSION": {
      // Login real (Supabase Auth): injeta/atualiza o User derivado do
      // profile no array local para que currentUser()/tenantScope() — que
      // continuam olhando só para state.users/state.session — funcionem sem
      // precisar mudar todo o resto do app nesta mesma leva.
      const exists = state.users.some((u) => u.id === action.user.id);
      const users = exists
        ? state.users.map((u) => (u.id === action.user.id ? action.user : u))
        : [...state.users, action.user];

      // onAuthStateChange dispara este action pra QUALQUER evento do Supabase,
      // inclusive TOKEN_REFRESHED (ex.: ao voltar o foco da aba depois de um
      // tempo parado) — não só um login novo. Se o admin_saas estava
      // impersonando uma loja (session.role "gestor", mas o perfil real
      // recém-buscado é admin_saas), preserva o tenant impersonado em vez de
      // resetar pro perfil real — senão o admin "cai" da loja toda vez que a
      // aba volta o foco e o Supabase revalida o token.
      const wasImpersonating =
        state.session?.userId === action.user.id &&
        state.session.role === "gestor" &&
        action.user.role === "admin_saas";

      const session = wasImpersonating
        ? state.session!
        : { userId: action.user.id, tenantId: action.user.tenantId ?? "", role: action.user.role };

      return { ...state, users, session };
    }

    case "ENTER_TENANT_AS_GESTOR": {
      // Só admin_saas pode "vestir" uma loja — mantém session.userId
      // (o próprio admin) pra EXIT_IMPERSONATION conseguir voltar depois.
      // realRole grava o papel real ali mesmo na sessão (não só em
      // state.users) pra EXIT_IMPERSONATION conseguir reverter mesmo se o
      // perfil do admin sumir de state.users por algum motivo.
      if (!state.session || state.session.role !== "admin_saas") return state;
      return {
        ...state,
        session: {
          ...state.session,
          role: "gestor",
          realRole: "admin_saas",
          tenantId: action.tenantId,
          tenantName: action.tenantName,
        },
      };
    }

    case "EXIT_IMPERSONATION": {
      // session.realRole (gravado por ENTER_TENANT_AS_GESTOR) é a fonte da
      // verdade pra restaurar o papel — não depende de state.users conter o
      // perfil do admin no momento do clique. state.users só é usado aqui
      // como complemento pro tenantId (sempre "" pra admin_saas de qualquer
      // forma, já que ele nunca tem vínculo de tenant).
      if (!state.session || !state.session.realRole) return state;
      const realUser = state.users.find((u) => u.id === state.session!.userId);
      return {
        ...state,
        session: {
          userId: state.session.userId,
          tenantId: realUser?.tenantId ?? "",
          role: state.session.realRole,
        },
      };
    }

    case "SET_REMOTE_DATA": {
      // action.users já vem só do tenant ativo (o backend escopa por
      // require_tenant) — substitui os usuários desse tenant sem mexer nos
      // de outros tenants (dados demo/seed) nem no próprio perfil do
      // admin_saas (tenantId null, nunca bate no filtro abaixo).
      const tenantId = state.session?.tenantId;
      const users = tenantId
        ? [...state.users.filter((u) => u.tenantId !== tenantId), ...action.users]
        : state.users;
      return {
        ...state,
        contacts: action.contacts,
        deals: action.deals,
        appointments: action.appointments,
        users,
        suppliers: action.suppliers,
        supplierProducts: action.supplierProducts,
        conversations: action.conversations,
        expenses: action.expenses,
      };
    }

    default:
      return state;
  }
}

interface RemoteData {
  contacts: Contact[];
  deals: Deal[];
  appointments: Appointment[];
  users: User[];
  suppliers: Supplier[];
  supplierProducts: SupplierProduct[];
  conversations: Conversation[];
  expenses: Expense[];
}

interface CrmContextValue {
  state: CrmState;
  dispatch: Dispatch<CrmAction>;
  /** Refaz o fetch de contacts/deals/appointments/users/suppliers/
   * supplierProducts do backend real e substitui essas coleções no state
   * (SET_REMOTE_DATA). Chamada só na sessão real (login/token refresh) — as
   * mutações do dia a dia atualizam o state local direto com a resposta da
   * própria chamada de API, sem refazer este fetch completo (ver comentário
   * em PipelinePage.handleMoveDeal). Retorna os dados já mapeados para uso
   * imediato pelo chamador. */
  refreshCrmData: () => Promise<RemoteData>;
  /** Incrementado a cada refreshCrmData() bem-sucedido — permite que telas
   * fora do fluxo contacts/deals/appointments (ex.: ActivityTimeline, que
   * busca activities por contactId direto da API) saibam quando refazer o
   * próprio fetch, sem precisar duplicar contacts/deals/appointments no
   * state global só para isso. */
  dataVersion: number;
}

const CrmContext = createContext<CrmContextValue | null>(null);

const EMPTY_STATE: CrmState = {
  tenants: [],
  users: [],
  contacts: [],
  deals: [],
  conversations: [],
  messages: [],
  appointments: [],
  activities: [],
  connections: [],
  suppliers: [],
  supplierProducts: [],
  supplierPriceChanges: [],
  attachments: [],
  expenses: [],
  session: null,
};

const IMPERSONATION_STORAGE_KEY = "amorim_impersonated_tenant";

interface SavedImpersonation {
  tenantId: string;
  tenantName: string;
}

function saveImpersonation(value: SavedImpersonation): void {
  sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(value));
}

function clearSavedImpersonation(): void {
  sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
}

/** sessionStorage (não localStorage): a impersonação some ao fechar a aba,
 * igual sempre foi — só passa a sobreviver a um F5 dentro da mesma aba. */
function readSavedImpersonation(): SavedImpersonation | null {
  try {
    const raw = sessionStorage.getItem(IMPERSONATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedImpersonation>;
    if (typeof parsed.tenantId !== "string") return null;
    return { tenantId: parsed.tenantId, tenantName: typeof parsed.tenantName === "string" ? parsed.tenantName : "" };
  } catch {
    return null;
  }
}

export function CrmProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(crmReducer, EMPTY_STATE);
  // Só true depois da 1ª checagem de sessão do Supabase (getSession inicial).
  // Sem isso, o guard de AppShell veria state.session como estava persistido
  // (ok pro modo demo) mas um usuário real autenticado sofreria um flash de
  // redirect pro /login enquanto a sessão real ainda está sendo resolvida.
  const [authReady, setAuthReady] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  async function refreshCrmData(): Promise<RemoteData> {
    const [apiContacts, apiDeals, apiAppointments, apiUsers, apiSuppliers, apiConversations, apiExpenses] =
      await Promise.all([
        api.listContacts(),
        api.listDeals(),
        api.listAppointments(),
        api.listUsers(),
        api.listSuppliers(),
        api.listConversations(),
        api.listExpenses(),
      ]);
    const suppliers = apiSuppliers.map(mapSupplier);
    // Não existe um "listar todos os produtos do tenant" — só por fornecedor
    // (GET /suppliers/{id}/products) — então busca em paralelo, um por
    // fornecedor. Custo aceitável: só roda no login/token refresh, nunca a
    // cada mutação (ver comentário em refreshCrmData acima).
    const productsBySupplier = await Promise.all(suppliers.map((s) => api.listSupplierProducts(s.id)));
    const data: RemoteData = {
      contacts: apiContacts.map(mapContact),
      deals: apiDeals.map(mapDeal),
      appointments: apiAppointments.map(mapAppointment),
      users: apiUsers.map(mapUser),
      suppliers,
      supplierProducts: productsBySupplier.flat().map(mapSupplierProduct),
      conversations: apiConversations.map(mapConversation),
      expenses: apiExpenses.map(mapExpense),
    };
    dispatch({ type: "SET_REMOTE_DATA", ...data });
    setDataVersion((v) => v + 1);
    return data;
  }

  useEffect(() => {
    let active = true;

    async function applyRealSession(session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) {
      if (!session) return;

      const { data: profileRow } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (!active || !profileRow) return;

      const user: User = {
        id: session.user.id,
        email: session.user.email ?? "",
        tenantId: profileRow.tenant_id,
        role: profileRow.role,
        name: profileRow.name,
        avatarColor: profileRow.avatar_color,
        createdAt: profileRow.created_at,
        isActive: profileRow.is_active ?? true,
      };
      dispatch({ type: "SET_AUTH_SESSION", user });

      // Reaplica a impersonação salva (ver efeito abaixo) se o F5 aconteceu
      // enquanto um admin_saas estava "vestindo" uma loja — ENTER_TENANT_AS_
      // GESTOR é só estado em memória, sessionStorage é a única forma de
      // sobreviver a um reload. Sincrono (igual handleEnterAsGestor em
      // AdminTenantsPage) antes de refreshCrmData(), pra essa primeira busca
      // já sair com o header X-Impersonate-Tenant certo.
      if (user.role === "admin_saas") {
        const saved = readSavedImpersonation();
        if (saved) {
          setImpersonatedTenantId(saved.tenantId);
          dispatch({ type: "ENTER_TENANT_AS_GESTOR", tenantId: saved.tenantId, tenantName: saved.tenantName });
        }
      }

      try {
        await refreshCrmData();
      } catch {
        toast.error("Não foi possível carregar seus dados do servidor. Tente recarregar a página.");
      }
    }

    // onAuthStateChange dispara INITIAL_SESSION exatamente uma vez, assim que
    // termina de ler a sessão persistida do storage — diferente de
    // getSession(), que num F5 pode resolver com session: null uma fração de
    // segundo antes desse evento chegar (padrão conhecido do supabase-js).
    // Só usar getSession() aqui (como antes) deixava authReady virar true
    // antes da sessão real chegar: o AppShell via session null e
    // redirecionava pra /login, e de lá o próprio /login mandava de volta
    // pra "/" assim que a sessão real chegasse — perdendo a rota original
    // (/pipeline, /clientes/123 etc.) a cada F5.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        dispatch({ type: "LOGOUT" });
        if (active) setAuthReady(true);
        return;
      }
      applyRealSession(session).finally(() => {
        if (active) setAuthReady(true);
      });
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronização entre usuários do mesmo tenant: contacts/deals/appointments/
  // suppliers/supplier_products/expenses têm Realtime habilitado no Supabase
  // (migração enable_realtime_sync_tables + replica identity full, senão
  // DELETE chega sem tenant_id e o filtro do canal nunca casa). Um canal por
  // tenant, upsert/remove granular no state local — sem esperar o próximo
  // refreshCrmData pra ver o que o outro usuário acabou de fazer. upsertById
  // absorve sem problema o próprio evento "ecoando" de volta pra quem originou
  // a mudança (replace em vez de duplicar), não precisa filtrar por autor.
  useEffect(() => {
    const tenantId = state.session?.tenantId;
    if (!tenantId) return;

    const filter = `tenant_id=eq.${tenantId}`;
    const channel = supabase
      .channel(`tenant-sync-${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts", filter }, (payload) => {
        if (payload.eventType === "DELETE") {
          dispatch({ type: "REMOVE_CONTACT", contactId: (payload.old as { id: string }).id });
        } else {
          dispatch({ type: "REMOTE_UPSERT_CONTACT", contact: mapContact(payload.new as ApiContact) });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "deals", filter }, (payload) => {
        if (payload.eventType === "DELETE") {
          dispatch({ type: "REMOVE_DEAL", dealId: (payload.old as { id: string }).id });
        } else {
          dispatch({ type: "REMOTE_UPSERT_DEAL", deal: mapDeal(payload.new as ApiDeal) });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter }, (payload) => {
        if (payload.eventType === "DELETE") {
          dispatch({ type: "REMOVE_APPOINTMENT", appointmentId: (payload.old as { id: string }).id });
        } else {
          dispatch({ type: "REMOTE_UPSERT_APPOINTMENT", appointment: mapAppointment(payload.new as ApiAppointment) });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "suppliers", filter }, (payload) => {
        if (payload.eventType === "DELETE") {
          dispatch({ type: "REMOVE_SUPPLIER", supplierId: (payload.old as { id: string }).id });
        } else {
          dispatch({ type: "REMOTE_UPSERT_SUPPLIER", supplier: mapSupplier(payload.new as ApiSupplier) });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "supplier_products", filter }, (payload) => {
        if (payload.eventType === "DELETE") {
          dispatch({ type: "REMOVE_SUPPLIER_PRODUCT", productId: (payload.old as { id: string }).id });
        } else {
          dispatch({
            type: "REMOTE_UPSERT_SUPPLIER_PRODUCT",
            product: mapSupplierProduct(payload.new as ApiSupplierProduct),
          });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter }, (payload) => {
        if (payload.eventType === "DELETE") {
          dispatch({ type: "REMOVE_EXPENSE", expenseId: (payload.old as { id: string }).id });
        } else {
          dispatch({ type: "REMOTE_UPSERT_EXPENSE", expense: mapExpense(payload.new as ApiExpense) });
        }
      })
      // conversations/messages nunca são excluídas hoje (sem endpoint de
      // delete), então só INSERT/UPDATE importam aqui.
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations", filter }, (payload) => {
        if (payload.eventType !== "DELETE") {
          dispatch({ type: "REMOTE_UPSERT_CONVERSATION", conversation: mapConversation(payload.new as ApiConversation) });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter }, (payload) => {
        if (payload.eventType !== "DELETE") {
          dispatch({ type: "REMOTE_UPSERT_MESSAGE", message: mapMessage(payload.new as ApiMessage) });
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [state.session?.tenantId, dispatch]);

  // Mantém o header X-Impersonate-Tenant do apiClient sincronizado com a
  // sessão: liga quando ENTER_TENANT_AS_GESTOR ou o re-sync de
  // SET_AUTH_SESSION preservam uma impersonação, desliga quando
  // EXIT_IMPERSONATION (ou qualquer outro caminho) volta pro perfil real.
  // Também persiste/limpa a impersonação em sessionStorage — é o que deixa
  // o bootstrap acima (applyRealSession) reaplicá-la sozinho depois de um F5.
  useEffect(() => {
    const impersonating = isImpersonating(state);
    setImpersonatedTenantId(impersonating ? state.session!.tenantId : null);
    if (impersonating) {
      saveImpersonation({ tenantId: state.session!.tenantId, tenantName: state.session!.tenantName ?? "" });
    } else {
      clearSavedImpersonation();
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch, refreshCrmData, dataVersion }), [state, dataVersion]);

  if (!authReady) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">Carregando…</div>
    );
  }

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm(): CrmContextValue {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm deve ser usado dentro de um CrmProvider");
  return ctx;
}
