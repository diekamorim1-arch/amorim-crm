// ConversationList — coluna esquerda do Inbox: abas Minhas/Não atribuídas/
// Todas, busca por nome e itens com preview da última mensagem. Autossufi-
// ciente (lê o próprio store), assim InboxPage só repassa seleção/navegação.

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { relativeTime } from "@/lib/format";
import { tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Contact, Conversation, Message } from "@/lib/types";

interface ConversationListProps {
  selectedId?: string;
  onSelect: (conversationId: string) => void;
}

type TabValue = "minhas" | "nao_atribuidas" | "todas";

interface Row {
  conversation: Conversation;
  contact: Contact;
  lastMessage?: Message;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { state } = useCrm();
  const { conversations, contacts, messages } = tenantScope(state);
  const currentUserId = state.session?.userId;

  const [tab, setTab] = useState<TabValue>("minhas");
  const [search, setSearch] = useState("");

  const rows = useMemo<Row[]>(() => {
    const byConversation = new Map<string, Message[]>();
    for (const message of messages) {
      const list = byConversation.get(message.conversationId);
      if (list) list.push(message);
      else byConversation.set(message.conversationId, [message]);
    }

    return conversations
      .map((conversation): Row | null => {
        const contact = contacts.find((c) => c.id === conversation.contactId);
        if (!contact) return null;
        const convMessages = byConversation.get(conversation.id) ?? [];
        const lastMessage = convMessages.reduce<Message | undefined>((latest, current) => {
          if (!latest) return current;
          return new Date(current.createdAt).getTime() > new Date(latest.createdAt).getTime() ? current : latest;
        }, undefined);
        return { conversation, contact, lastMessage };
      })
      .filter((row): row is Row => row !== null)
      .sort((a, b) => {
        const at = new Date(a.lastMessage?.createdAt ?? a.conversation.createdAt).getTime();
        const bt = new Date(b.lastMessage?.createdAt ?? b.conversation.createdAt).getTime();
        return bt - at;
      });
  }, [conversations, contacts, messages]);

  const byTab = rows.filter((row) => {
    if (tab === "minhas") return row.conversation.assigneeId === currentUserId;
    if (tab === "nao_atribuidas") return row.conversation.assigneeId === null;
    return true;
  });

  const query = search.trim().toLowerCase();
  const filtered = query ? byTab.filter((row) => row.contact.name.toLowerCase().includes(query)) : byTab;

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-3">
      <h1 className="font-display text-lg font-semibold tracking-tight text-foreground">Inbox</h1>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar conversa…"
          className="pl-8"
          aria-label="Buscar conversa"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
        <TabsList className="w-full">
          <TabsTrigger value="minhas">Minhas</TabsTrigger>
          <TabsTrigger value="nao_atribuidas">Não atribuídas</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
        )}

        {filtered.map(({ conversation, contact, lastMessage }) => {
          const isSelected = conversation.id === selectedId;
          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={cn(
                "flex items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-accent",
                isSelected && "bg-accent",
              )}
            >
              <Avatar size="default" className="mt-0.5">
                <AvatarFallback>{initialsOf(contact.name)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{contact.name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {relativeTime(lastMessage?.createdAt ?? conversation.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">
                    {lastMessage ? lastMessage.text : "Sem mensagens ainda"}
                  </span>
                  {conversation.unread > 0 && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-whatsapp text-[11px] font-medium text-success-foreground">
                      {conversation.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
