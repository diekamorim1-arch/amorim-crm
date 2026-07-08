import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type JSX,
  type ReactNode,
} from "react";
import { buildSeed } from "./seed";
import type {
  Activity,
  Appointment,
  Contact,
  ConnectionStatus,
  CrmState,
  Deal,
  LossReason,
  Message,
  Stage,
  Tenant,
  User,
} from "./types";

const STORAGE_KEY = "amorim-crm-state-v1";

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

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

    case "RESET_DEMO": {
      return { ...buildSeed(), session: state.session };
    }

    default:
      return state;
  }
}

function loadInitialState(): CrmState {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeed();
    const parsed = JSON.parse(raw) as CrmState;
    if (!parsed || !Array.isArray(parsed.tenants)) return buildSeed();
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

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage indisponível (modo privado, quota excedida etc.) — segue sem persistir.
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
