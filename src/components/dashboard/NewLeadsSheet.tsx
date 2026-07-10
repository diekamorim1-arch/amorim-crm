// NewLeadsSheet — drill-down do card "Leads novos no mês": lista os contatos
// (nome, origem, data do primeiro contato), cada um linkando pra própria
// ficha (ContactDetailPage).

import { Link } from "react-router";
import { UserPlus } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ORIGIN_LABELS } from "@/lib/constants";
import { relativeTime } from "@/lib/format";
import type { Contact } from "@/lib/types";

interface NewLeadsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
}

export function NewLeadsSheet({ open, onOpenChange, contacts }: NewLeadsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Leads novos no mês ({contacts.length})</SheetTitle>
          <SheetDescription>Contatos cujo primeiro contato caiu neste mês.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
          {contacts.length === 0 && (
            <EmptyState icon={UserPlus} title="Nenhum lead novo neste mês ainda" />
          )}
          {contacts.map((contact) => (
            <Link
              key={contact.id}
              to={`/clientes/${contact.id}`}
              className="rounded-xl border border-border p-3 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{contact.name}</p>
                <span className="text-xs text-muted-foreground">{relativeTime(contact.firstContactAt)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{ORIGIN_LABELS[contact.origin]}</p>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
