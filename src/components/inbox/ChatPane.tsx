// ChatPane — coluna central do Inbox: header com identidade + atribuição,
// histórico de mensagens com separadores de dia e composer auto-grow. Busca o
// histórico real da conversa (o que também marca como lida no servidor) e
// envia mensagens de verdade via api.sendConversationMessage.

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, PanelRight, Send } from "lucide-react";
import { toast } from "sonner";

import { MessageBubble } from "@/components/inbox/MessageBubble";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api, mapConversation, mapMessage } from "@/lib/apiClient";
import { contactById, currentUser, tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import type { Message } from "@/lib/types";

interface ChatPaneProps {
  conversationId: string;
  onBack?: () => void;
  onToggleContext?: () => void;
  contextOpen?: boolean;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Hoje";
  if (isSameDay(date, yesterday)) return "Ontem";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

type Row = { kind: "separator"; label: string; key: string } | { kind: "message"; message: Message };

function buildRows(messages: Message[]): Row[] {
  const sorted = [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const rows: Row[] = [];
  let lastLabel = "";
  for (const message of sorted) {
    const label = dayLabel(message.createdAt);
    if (label !== lastLabel) {
      rows.push({ kind: "separator", label, key: `sep-${message.id}` });
      lastLabel = label;
    }
    rows.push({ kind: "message", message });
  }
  return rows;
}

export function ChatPane({ conversationId, onBack, onToggleContext, contextOpen }: ChatPaneProps) {
  const { state, dispatch } = useCrm();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(true);

  const { conversations, messages, users } = tenantScope(state);
  const conversation = conversations.find((c) => c.id === conversationId);
  const contact = conversation ? contactById(state, conversation.contactId) : undefined;
  const viewer = currentUser(state);
  const conversationMessages = messages.filter((m) => m.conversationId === conversationId);

  useEffect(() => {
    let active = true;
    setMessagesLoading(true);
    // GET /conversations/{id}/messages também marca a conversa como lida no
    // servidor (unread -> 0) — o eco disso chega pelo canal Realtime, não
    // precisa de um dispatch local separado pra isso.
    api
      .getMessages(conversationId)
      .then((apiMessages) => {
        if (!active) return;
        dispatch({ type: "SET_MESSAGES", conversationId, messages: apiMessages.map(mapMessage) });
      })
      .catch(() => {
        if (active) toast.error("Não foi possível carregar as mensagens desta conversa.");
      })
      .finally(() => {
        if (active) setMessagesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [conversationId, dispatch]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [conversationMessages.length, conversationId]);

  if (!conversation || !contact) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Conversa não encontrada.</p>
      </div>
    );
  }

  async function handleAssign(assigneeId: string | null) {
    try {
      const updated = await api.updateConversationAssignee(conversationId, assigneeId);
      dispatch({ type: "REMOTE_UPSERT_CONVERSATION", conversation: mapConversation(updated) });
      if (assigneeId === null) {
        toast.success("Conversa sem responsável.");
      } else if (assigneeId === viewer?.id) {
        toast.success("Você assumiu esta conversa.");
      } else {
        const name = users.find((u) => u.id === assigneeId)?.name ?? "";
        toast.success(`Conversa atribuída a ${name}.`);
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível atribuir a conversa.");
    }
  }

  async function handleSend() {
    const text = draft.trim();
    if (!text || !viewer || sending) return;
    setSending(true);
    try {
      const sent = await api.sendConversationMessage(conversationId, text);
      dispatch({ type: "REMOTE_UPSERT_MESSAGE", message: mapMessage(sent) });
      setDraft("");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  const rows = buildRows(conversationMessages);
  const showAssumeBanner = conversation.assigneeId === null && viewer?.role === "atendente";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border p-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Voltar para a lista">
            <ArrowLeft />
          </Button>
        )}

        <button
          type="button"
          onClick={() => navigate(`/clientes/${contact.id}`)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 text-left transition-colors hover:bg-accent"
        >
          <Avatar size="sm" className="shrink-0">
            <AvatarFallback>{initialsOf(contact.name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 truncate text-sm font-medium text-foreground">{contact.name}</span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <Select value={conversation.assigneeId ?? "none"} onValueChange={(v) => handleAssign(v === "none" ? null : v)}>
            <SelectTrigger size="sm" className="w-28 sm:w-40">
              <SelectValue placeholder="Atribuir" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Não atribuída</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {onToggleContext && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleContext}
              aria-label="Mostrar detalhes do cliente"
            >
              <PanelRight className={contextOpen ? "text-primary" : undefined} />
            </Button>
          )}
        </div>
      </div>

      {showAssumeBanner && viewer && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-accent/50 px-4 py-2 text-sm">
          <span className="text-foreground">Esta conversa ainda não tem responsável.</span>
          <Button size="sm" onClick={() => handleAssign(viewer.id)}>
            Assumir esta conversa
          </Button>
        </div>
      )}

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
        {messagesLoading && conversationMessages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">Carregando mensagens…</p>
        ) : (
          rows.map((row) =>
            row.kind === "separator" ? (
              <div key={row.key} className="my-2 flex justify-center">
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {row.label}
                </span>
              </div>
            ) : (
              <MessageBubble key={row.message.id} message={row.message} />
            ),
          )
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem…"
          className="max-h-40 flex-1 resize-none"
          rows={1}
        />
        <Button size="icon" onClick={() => void handleSend()} disabled={!draft.trim() || sending} aria-label="Enviar mensagem">
          <Send />
        </Button>
      </div>
    </div>
  );
}
