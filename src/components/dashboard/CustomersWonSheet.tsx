// CustomersWonSheet — drill-down do card "Clientes que compraram no mês":
// lista os negócios ganhos no mês (cliente, produto, data, valor), cada um
// linkando pra ficha do cliente correspondente.

import { Link } from "react-router";
import { ShoppingBag } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { brl, relativeTime } from "@/lib/format";
import type { Contact, Deal } from "@/lib/types";

interface CustomersWonSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: { contact: Contact; deal: Deal }[];
}

export function CustomersWonSheet({ open, onOpenChange, rows }: CustomersWonSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Clientes que compraram no mês ({rows.length})</SheetTitle>
          <SheetDescription>Negócios ganhos neste mês.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
          {rows.length === 0 && (
            <EmptyState icon={ShoppingBag} title="Nenhuma venda ganha neste mês ainda" />
          )}
          {rows.map(({ contact, deal }) => (
            <Link
              key={deal.id}
              to={`/clientes/${contact.id}`}
              className="rounded-xl border border-border p-3 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{contact.name}</p>
                <span className="font-mono text-sm tabular-nums text-foreground">{brl(deal.value)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{deal.products}</span>
                <span>{relativeTime(deal.stageChangedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
