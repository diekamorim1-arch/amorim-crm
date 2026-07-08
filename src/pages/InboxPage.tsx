// InboxPage — orquestra o layout de 3 painéis do Inbox (lista | chat |
// contexto) e a navegação mobile empilhada (lista ⇒ chat com voltar,
// contexto em Sheet). A conversa selecionada vem da URL (/inbox/:conversationId),
// então compartilhar o link ou usar o botão voltar do navegador funciona.

import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { MessageCircle } from "lucide-react";

import { ChatPane } from "@/components/inbox/ChatPane";
import { ContactPanel } from "@/components/inbox/ContactPanel";
import { ConversationList } from "@/components/inbox/ConversationList";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true,
  );

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const handler = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isDesktop;
}

export function InboxPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { state } = useCrm();

  const [contextOpen, setContextOpen] = useState(true);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);

  const conversation = conversationId
    ? tenantScope(state).conversations.find((c) => c.id === conversationId)
    : undefined;

  if (conversationId && !conversation) {
    return <Navigate to="/inbox" replace />;
  }

  function handleSelect(id: string) {
    navigate(`/inbox/${id}`);
  }

  function handleBack() {
    navigate("/inbox");
  }

  if (!isDesktop) {
    return (
      <div className="h-[calc(100svh-11rem)] min-h-0 md:h-[calc(100svh-6.5rem)]">
        {!conversationId ? (
          <ConversationList selectedId={conversationId} onSelect={handleSelect} />
        ) : (
          <>
            <div className="h-full rounded-xl border border-border bg-card">
              <ChatPane
                conversationId={conversationId}
                onBack={handleBack}
                onToggleContext={() => setMobileContextOpen(true)}
              />
            </div>

            {conversation && (
              <Sheet open={mobileContextOpen} onOpenChange={setMobileContextOpen}>
                <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>Detalhes do cliente</SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-4">
                    <ContactPanel contactId={conversation.contactId} />
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100svh-11rem)] min-h-0 gap-4 md:h-[calc(100svh-6.5rem)]">
      <div className="w-80 shrink-0">
        <ConversationList selectedId={conversationId} onSelect={handleSelect} />
      </div>

      <div className="min-w-0 flex-1 rounded-xl border border-border bg-card">
        {conversationId ? (
          <ChatPane
            conversationId={conversationId}
            onToggleContext={() => setContextOpen((v) => !v)}
            contextOpen={contextOpen}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <MessageCircle className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Selecione uma conversa para começar.</p>
          </div>
        )}
      </div>

      {contextOpen && conversation && (
        <div className="w-80 shrink-0">
          <ContactPanel contactId={conversation.contactId} />
        </div>
      )}
    </div>
  );
}
