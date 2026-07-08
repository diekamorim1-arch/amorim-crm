// PriceHistorySheet — sheet lateral com o histórico cronológico (mais recente
// primeiro) de mudanças de preço de um produto de fornecedor. Disponível para
// todos os papéis (somente leitura). A ordenação já vem pronta de
// priceHistoryForProduct — não reordenar aqui.

import { History } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { brl, relativeTime } from "@/lib/format";
import { priceHistoryForProduct } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import type { SupplierProduct } from "@/lib/types";

interface PriceHistorySheetProps {
  product: SupplierProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PriceHistorySheet({ product, open, onOpenChange }: PriceHistorySheetProps) {
  const { state } = useCrm();
  const history = product ? priceHistoryForProduct(state, product.id) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Histórico de preço</SheetTitle>
          <SheetDescription>{product ? product.name : ""}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-4">
          {history.length === 0 ? (
            <EmptyState
              icon={History}
              title="Nenhuma alteração de preço registrada"
              description="O preço deste produto ainda não foi editado desde o cadastro."
              compact
            />
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
              >
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {brl(entry.price)}
                </span>
                <span className="text-xs text-muted-foreground">{relativeTime(entry.changedAt)}</span>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
