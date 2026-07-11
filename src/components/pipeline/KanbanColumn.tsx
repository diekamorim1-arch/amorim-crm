// Coluna do Kanban de pipeline — recebe os deals já filtrados/ordenados pelo
// pai, cuida apenas de exibição, drag-over highlight e soltar (drop) via HTML5 DnD.

import { type ReactNode, useState } from "react";
import { Inbox } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { DealCard } from "@/components/pipeline/DealCard";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Contact, Deal, Stage } from "@/lib/types";

interface KanbanColumnProps {
  stageId: Stage;
  label: string;
  deals: Deal[];
  getContact: (contactId: string) => Contact | undefined;
  onDropDeal: (dealId: string, stage: Stage) => void;
  onMoveDeal: (dealId: string, stage: Stage) => void;
  onMarkLost: (deal: Deal) => void;
  onOpenFicha: (contactId: string) => void;
  onOpenConversation: (contactId: string) => void;
  onEditDeal?: (deal: Deal) => void;
  onDeleteDeal?: (deal: Deal) => void;
  footer?: ReactNode;
}

export function KanbanColumn({
  stageId,
  label,
  deals,
  getContact,
  onDropDeal,
  onMoveDeal,
  onMarkLost,
  onOpenFicha,
  onOpenConversation,
  onEditDeal,
  onDeleteDeal,
  footer,
}: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false);
  const total = deals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div
      className={cn(
        "flex w-[85vw] shrink-0 snap-start flex-col rounded-xl border border-border bg-card/40 transition-colors sm:w-80",
        dragOver && "border-primary bg-primary/5 ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        const dealId = event.dataTransfer.getData("text/plain");
        if (dealId) onDropDeal(dealId, stageId);
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">{label}</h2>
          <p className="text-xs text-muted-foreground">
            {deals.length} negócio{deals.length === 1 ? "" : "s"}
          </p>
        </div>
        <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">{brl(total)}</span>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto p-3" style={{ maxHeight: "calc(100vh - 22rem)" }}>
        {deals.length === 0 && (
          <EmptyState compact icon={Inbox} title="Nenhum negócio aqui" className="border-none py-8" />
        )}
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            contact={getContact(deal.contactId)}
            onMove={onMoveDeal}
            onMarkLost={onMarkLost}
            onOpenFicha={onOpenFicha}
            onOpenConversation={onOpenConversation}
            onEditDeal={onEditDeal}
            onDeleteDeal={onDeleteDeal}
          />
        ))}
      </div>

      {footer && <div className="border-t border-border px-4 py-2">{footer}</div>}
    </div>
  );
}
