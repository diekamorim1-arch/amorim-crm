// Busca global (command palette) sobre contatos, negócios e conversas do
// tenant da sessão atual. Atalho: Cmd/Ctrl+K.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Search } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";

export function GlobalSearch() {
  const { state } = useCrm();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { contacts, deals, conversations } = tenantScope(state);

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">
          <span className="hidden sm:inline">Buscar clientes, negócios, conversas…</span>
          <span className="sm:hidden">Buscar…</span>
        </span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Busca" description="Busque clientes, negócios e conversas">
        <CommandInput placeholder="Buscar clientes, negócios, conversas…" />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

          {contacts.length > 0 && (
            <CommandGroup heading="Clientes">
              {contacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={`cliente ${contact.name}`}
                  onSelect={() => go(`/clientes/${contact.id}`)}
                >
                  {contact.name}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {deals.length > 0 && (
            <CommandGroup heading="Negócios">
              {deals.map((deal) => (
                <CommandItem key={deal.id} value={`negocio ${deal.title}`} onSelect={() => go("/pipeline")}>
                  {deal.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {conversations.length > 0 && (
            <CommandGroup heading="Conversas">
              {conversations.map((conversation) => {
                const contact = contacts.find((c) => c.id === conversation.contactId);
                return (
                  <CommandItem
                    key={conversation.id}
                    value={`conversa ${contact?.name ?? conversation.id}`}
                    onSelect={() => go(`/inbox/${conversation.id}`)}
                  >
                    {contact?.name ?? "Conversa"}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
