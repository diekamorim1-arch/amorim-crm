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
  mapDeal,
  mapSupplier,
  mapSupplierProduct,
  mapUser,
  setImpersonatedTenantId,
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
// React (ex.: fakeReply.ts) e precisam tipar seu próprio `dispatch` recebido
// por parâmetro sem importar diretamente de "react".
export type { Dispatch };

export type CrmAction =
  | { type: "LOGOUT" }
  | { type: "MOVE_DEAL"; dealId: string; stage: Stage }
  | { type: "MARK_DEAL_LOST"; dealId: string; reason: LossReason }
  | { type: "ADD_CONTACT"; contact: Contact }
  | { type: "UPDATE_CONTACT"; contact: Contact }
  | { type: "ADD_DEAL"; deal: Deal }
  | { type: "UPDATE_DEAL"; deal: Deal }
  | { type: "REMOVE_DEAL"; dealId: string }
  | { type: "ADD_CONVERSATION"; conversation: Conversation }
  | { type: "SEND_MESSAGE"; conversationId: string; text: string; authorId: string }
  | { type: "RECEIVE_MESSAGE"; conversationId: string; text: string }
  | { type: "MARK_CONVERSATION_READ"; conversationId: string }
  | { type: "ASSIGN_CONVERSATION"; conversationId: string; assigneeId: string | null }
  | { type: "ADD_APPOINTMENT"; appointment: Appointment }
  | { type: "UPDATE_APPOINTMENT"; appointment: Appointment }
  | { type: "ADD_ACTIVITY"; activity: Activity }
  | { type: "SET_CONNECTION_STATUS"; connectionId: string; status: ConnectionStatus }
  | { type: "ADD_USER"; user: User }
  | { type: "UPDATE_USER"; user: User }
  | { type: "REMOVE_USER"; userId: string }
  | { type: "ADD_SUPPLIER"; supplier: Supplier }
  | { type: "UPDATE_SUPPLIER"; supplier: Supplier }
  | { type: "ADD_SUPPLIER_PRODUCT"; product: SupplierProduct }
  | { type: "ADD_SUPPLIER_PRODUCTS"; products: SupplierProduct[] }
  | { type: "UPDATE_SUPPLIER_PRODUCT_PRICE"; productId: string; price: number }
  | { type: "UPDATE_SUPPLIER_PRODUCT"; productId: string; name: string; price: number; colors?: string }
  | { type: "UPDATE_DEAL_FINANCIALS"; dealId: string; value: number; supplierProductId?: string; supplierValue: number; giftValue: number; freightValue: number }
  | { type: "ADD_ATTACHMENT"; attachment: Attachment }
  | { type: "REMOVE_ATTACHMENT"; attachmentId: string }
  | { type: "ADD_EXPENSE"; expense: Expense }
  | { type: "REMOVE_EXPENSE"; expenseId: string }
  | { type: "SET_EXPENSES"; expenses: Expense[] }
  | { type: "SET_AUTH_SESSION"; user: User }
  | {
      type: "SET_REMOTE_DATA";
      contacts: Contact[];
      deals: Deal[];
      appointments: Appointment[];
      users: User[];
      suppliers: Supplier[];
      supplierProducts: SupplierProduct[];
    }
  | { type: "ENTER_TENANT_AS_GESTOR"; tenantId: string; tenantName: string }
  | { type: "EXIT_IMPERSONATION" };

function countWonDeals(state: CrmState, contactId: string): number {
  return state.deals.filter((d) => d.contactId === contactId && d.outcome === "ganho").length;
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

    case "ADD_CONVERSATION": {
      return { ...state, conversations: [...state.conversations, action.conversation] };
    }

    case "SEND_MESSAGE":
    case "RECEIVE_MESSAGE": {
      const conversation = state.conversations.find((c) => c.id === action.conversationId);
      if (!conversation) return state;
      const now = new Date().toISOString();
      const direction: "in" | "out" = action.type === "SEND_MESSAGE" ? "out" : "in";
      const authorId = action.type === "SEND_MESSAGE" ? action.authorId : undefined;

      const message: Message = {
        id: newId("msg"),
        tenantId: conversation.tenantId,
        conversationId: conversation.id,
        direction,
        text: action.text,
        authorId,
        status: direction === "out" ? "enviada" : "entregue",
        createdAt: now,
      };

      // Quando o cliente responde, simulamos que ele leu as mensagens que
      // enviamos antes disso nesta conversa: promove os ticks de
      // "enviada"/"entregue" para "lida" (✓✓ com tingimento) antes de
      // anexar a nova mensagem recebida.
      const priorMessages =
        direction === "in"
          ? state.messages.map((m) =>
              m.conversationId === conversation.id && m.direction === "out" && m.status !== "lida"
                ? { ...m, status: "lida" as const }
                : m,
            )
          : state.messages;

      const conversations = state.conversations.map((c) =>
        c.id === conversation.id ? { ...c, unread: direction === "in" ? c.unread + 1 : c.unread } : c,
      );

      const contacts = state.contacts.map((c) =>
        c.id === conversation.contactId ? { ...c, lastInteractionAt: now } : c,
      );

      const activity: Activity = {
        id: newId("activity"),
        tenantId: conversation.tenantId,
        contactId: conversation.contactId,
        userId: authorId ?? conversation.assigneeId ?? "sistema",
        type: "mensagem",
        description: direction === "out" ? "Mensagem enviada." : "Mensagem recebida.",
        createdAt: now,
      };

      return {
        ...state,
        messages: [...priorMessages, message],
        conversations,
        contacts,
        activities: [...state.activities, activity],
      };
    }

    case "MARK_CONVERSATION_READ": {
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId ? { ...c, unread: 0 } : c,
        ),
      };
    }

    case "ASSIGN_CONVERSATION": {
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId ? { ...c, assigneeId: action.assigneeId } : c,
        ),
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

export function CrmProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(crmReducer, EMPTY_STATE);
  // Só true depois da 1ª checagem de sessão do Supabase (getSession inicial).
  // Sem isso, o guard de AppShell veria state.session como estava persistido
  // (ok pro modo demo) mas um usuário real autenticado sofreria um flash de
  // redirect pro /login enquanto a sessão real ainda está sendo resolvida.
  const [authReady, setAuthReady] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  async function refreshCrmData(): Promise<RemoteData> {
    const [apiContacts, apiDeals, apiAppointments, apiUsers, apiSuppliers] = await Promise.all([
      api.listContacts(),
      api.listDeals(),
      api.listAppointments(),
      api.listUsers(),
      api.listSuppliers(),
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
      try {
        await refreshCrmData();
      } catch {
        toast.error("Não foi possível carregar seus dados do servidor. Tente recarregar a página.");
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      applyRealSession(data.session).finally(() => {
        if (active) setAuthReady(true);
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        dispatch({ type: "LOGOUT" });
        return;
      }
      applyRealSession(session);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantém o header X-Impersonate-Tenant do apiClient sincronizado com a
  // sessão: liga quando ENTER_TENANT_AS_GESTOR ou o re-sync de
  // SET_AUTH_SESSION preservam uma impersonação, desliga quando
  // EXIT_IMPERSONATION (ou qualquer outro caminho) volta pro perfil real.
  useEffect(() => {
    setImpersonatedTenantId(isImpersonating(state) ? state.session!.tenantId : null);
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
