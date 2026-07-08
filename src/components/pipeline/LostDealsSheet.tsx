// Sheet lateral com a lista de negócios perdidos (título, valor, motivo, data).

import { CircleOff } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LOSS_REASON_LABELS } from "@/lib/constants";
import { brl, relativeTime } from "@/lib/format";
import type { Deal } from "@/lib/types";

interface LostDealsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deals: Deal[];
}

export function LostDealsSheet({ open, onOpenChange, deals }: LostDealsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Perdidos ({deals.length})</SheetTitle>
          <SheetDescription>Negócios marcados como perdidos.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
          {deals.length === 0 && (
            <EmptyState
              icon={CircleOff}
              title="Nenhum negócio perdido ainda"
              description="Os negócios marcados como perdidos vão aparecer aqui."
            />
          )}
          {deals.map((deal) => (
            <div key={deal.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{deal.title}</p>
                <span className="font-mono text-sm tabular-nums text-foreground">{brl(deal.value)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{deal.lossReason ? LOSS_REASON_LABELS[deal.lossReason] : "Motivo não informado"}</span>
                <span>{relativeTime(deal.stageChangedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
