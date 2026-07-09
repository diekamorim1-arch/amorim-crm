import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type JSX,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { buildSeed } from "./seed";
import { newId } from "./id";
import type {
  Activity,
  Appointment,
  Attachment,
  Contact,
  ConnectionStatus,
  Conversation,
  CrmState,
  Deal,
  LossReason,
  Message,
  Stage,
  Supplier,
  SupplierPriceChange,
  SupplierProduct,
  Tenant,
  User,
} from "./types";

const STORAGE_KEY = "amorim-crm-state-v1";

// Re-exportado para consumidores que já importam `newId` de "@/lib/store"
// (a maioria dos componentes) — a implementação real vive em "./id" para
// evitar um ciclo de import com seed.ts (ver comentário em id.ts).
export { newId };

// Re-exportado para consumidores que despacham ações fora de componentes
// React (ex.: fakeReply.ts) e precisam tipar seu próprio `dispatch` recebido
// por parâmetro sem importar diretamente de "react".
export type { Dispatch };

export type CrmAction =
  | { type: "LOGIN"; userId: string }
  | { type: "LOGOUT" }
  | { type: "SWITCH_SESSION"; userId: string }
  | { type: "ENTER_TENANT_AS_GESTOR"; tenantId: string }
  | { type: "MOVE_DEAL"; dealId: string; stage: Stage }
  | { type: "MARK_DEAL_LOST"; dealId: string; reason: LossReason }
  | { type: "ADD_CONTACT"; contact: Contact }
  | { type: "UPDATE_CONTACT"; contact: Contact }
  | { type: "ADD_DEAL"; deal: Deal }
  | { type: "ADD_CONVERSATION"; conversation: Conversation }
  | { type: "SEND_MESSAGE"; conversationId: string; text: string; authorId: string }
  | { type: "RECEIVE_MESSAGE"; conversationId: string; text: string }
  | { type: "MARK_CONVERSATION_READ"; conversationId: string }
  | { type: "ASSIGN_CONVERSATION"; conversationId: string; assigneeId: string | null }
  | { type: "ADD_APPOINTMENT"; appointment: Appointment }
  | { type: "UPDATE_APPOINTMENT"; appointment: Appointment }
  | { type: "ADD_ACTIVITY"; activity: Activity }
  | { type: "SET_CONNECTION_STATUS"; connectionId: string; status: ConnectionStatus }
  | { type: "UPDATE_TENANT"; tenant: Tenant }
  | { type: "ADD_TENANT"; tenant: Tenant }
  | { type: "ADD_USER"; user: User }
  | { type: "UPDATE_USER"; user: User }
  | { type: "ADD_SUPPLIER"; supplier: Supplier }
  | { type: "UPDATE_SUPPLIER"; supplier: Supplier }
  | { type: "ADD_SUPPLIER_PRODUCT"; product: SupplierProduct }
  | { type: "UPDATE_SUPPLIER_PRODUCT_PRICE"; productId: string; price: number }
  | { type: "UPDATE_SUPPLIER_PRODUCT"; productId: string; name: string; price: number }
  | { type: "UPDATE_DEAL_FINANCIALS"; dealId: string; value: number; supplierProductId?: string; supplierValue: number; giftValue: number }
  | { type: "ADD_ATTACHMENT"; attachment: Attachment }
  | { type: "REMOVE_ATTACHMENT"; attachmentId: string }
  | { type: "RESET_DEMO" };

function countWonDeals(state: CrmState, contactId: string): number {
  return state.deals.filter((d) => d.contactId === contactId && d.outcome === "ganho").length;
}

/** Reducer puro — sem dependências de React, testável isoladamente. */
export function crmReducer(state: CrmState, action: CrmAction): CrmState {
  switch (action.type) {
    case "LOGIN":
    case "SWITCH_SESSION": {
      const user = state.users.find((u) => u.id === action.userId);
      if (!user) return state;
      return { ...state, session: { userId: user.id, tenantId: user.tenantId ?? "", role: user.role } };
    }

    case "LOGOUT": {
      return { ...state, session: null };
    }

    case "ENTER_TENANT_AS_GESTOR": {
      if (!state.session) return state;
      // A sessão vira "gestor" daquele tenant — não basta trocar o tenantId:
      // Sidebar/MobileBottomNav e o guard do AppShell decidem menu/rotas
      // olhando só para `role`. O `userId` original (admin_saas) é mantido de
      // propósito: "Voltar ao painel" apenas dá SWITCH_SESSION nesse mesmo
      // userId, que re-deriva a sessão original a partir do User (admin_saas,
      // sem tenant) — sem precisar de um campo extra para lembrar de onde veio.
      return { ...state, session: { ...state.session, tenantId: action.tenantId, role: "gestor" } };
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

    case "UPDATE_TENANT": {
      return { ...state, tenants: state.tenants.map((t) => (t.id === action.tenant.id ? action.tenant : t)) };
    }

    case "ADD_TENANT": {
      return { ...state, tenants: [...state.tenants, action.tenant] };
    }

    case "ADD_USER": {
      return { ...state, users: [...state.users, action.user] };
    }

    case "UPDATE_USER": {
      return { ...state, users: state.users.map((u) => (u.id === action.user.id ? action.user : u)) };
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
          ? { ...p, name: action.name, currentPrice: action.price, updatedAt: priceChanged ? now : p.updatedAt }
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

    case "RESET_DEMO": {
      const fresh = buildSeed();
      if (!state.session) return fresh;
      // buildSeed() gera todos os ids via crypto.randomUUID() — não são
      // estáveis entre chamadas. Preservar session.userId/tenantId verbatim
      // apontaria para ids da seed antiga, inexistentes na seed nova, e
      // deixaria currentUser()/tenantScope() vazios (tela em branco, sem
      // sessão válida para nem sequer trocar de usuário). Re-resolvemos o
      // usuário pelo e-mail (literal fixo na seed, estável entre chamadas)
      // para reconstruir uma sessão válida contra o novo state.
      const oldUser = state.users.find((u) => u.id === state.session!.userId);
      const newUser = oldUser ? fresh.users.find((u) => u.email === oldUser.email) : undefined;
      if (!newUser) return fresh;
      return { ...fresh, session: { userId: newUser.id, tenantId: newUser.tenantId ?? "", role: newUser.role } };
    }

    default:
      return state;
  }
}

/**
 * Valida se um objeto desserializado do localStorage tem o formato mínimo
 * esperado de um `CrmState` para ser usado com segurança. Além das coleções
 * originais, exige `suppliers`/`supplierProducts`/`supplierPriceChanges`
 * (adicionadas na Task 1 deste mini-plano): um blob salvo por uma sessão
 * anterior a essa mudança teria `tenants` como array (passando numa checagem
 * mais fraca) mas careceria totalmente dessas 3 coleções novas — e a
 * primeira chamada a `tenantScope()` quebraria com TypeError ao chamar
 * `.filter()` em `undefined`. Exportada como função pura para ser testável
 * sem precisar mockar `window.localStorage`.
 */
export function isValidPersistedState(parsed: unknown): parsed is CrmState {
  if (!parsed || typeof parsed !== "object") return false;
  const candidate = parsed as Partial<CrmState>;
  return (
    Array.isArray(candidate.tenants) &&
    Array.isArray(candidate.suppliers) &&
    Array.isArray(candidate.supplierProducts) &&
    Array.isArray(candidate.supplierPriceChanges) &&
    Array.isArray(candidate.attachments)
  );
}

function loadInitialState(): CrmState {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeed();
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidPersistedState(parsed)) return buildSeed();
    return parsed;
  } catch {
    return buildSeed();
  }
}

interface CrmContextValue {
  state: CrmState;
  dispatch: Dispatch<CrmAction>;
}

const CrmContext = createContext<CrmContextValue | null>(null);

export function CrmProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(crmReducer, undefined, loadInitialState);
  // Evita spammar o toast de quota excedida a cada mudança de estado enquanto
  // o problema persiste: só avisa uma vez por "sequência" de falhas, e reseta
  // assim que um setItem volta a funcionar.
  const hasWarnedQuotaRef = useRef(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      hasWarnedQuotaRef.current = false;
    } catch (error) {
      const isQuotaExceeded =
        error instanceof DOMException &&
        (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");

      if (isQuotaExceeded) {
        if (!hasWarnedQuotaRef.current) {
          hasWarnedQuotaRef.current = true;
          toast.error("Armazenamento local cheio — as últimas alterações podem não ter sido salvas.");
        }
      } else {
        // localStorage indisponível (modo privado, etc.) — segue sem persistir.
      }
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm(): CrmContextValue {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm deve ser usado dentro de um CrmProvider");
  return ctx;
}
