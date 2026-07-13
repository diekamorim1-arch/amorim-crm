// MoveDealMonthDialog — move um negócio ganho pra outro mês do histórico,
// editando deal.stage_changed_at (é esse campo que decide em qual mês do
// histórico mensal o negócio aparece, ver dashboard/service.py::
// get_monthly_detail/get_monthly_history).

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/apiClient";

interface MoveDealMonthDialogProps {
  dealId: string | null;
  dealTitle: string;
  currentStageChangedAt: string;
  onOpenChange: (open: boolean) => void;
  onMoved: (dealId: string, nextStageChangedAt: string) => void;
}

function toMonthInputValue(iso: string): string {
  return iso.slice(0, 7);
}

export function MoveDealMonthDialog({
  dealId,
  dealTitle,
  currentStageChangedAt,
  onOpenChange,
  onMoved,
}: MoveDealMonthDialogProps) {
  const [month, setMonth] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (dealId) setMonth(toMonthInputValue(currentStageChangedAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!dealId || !month) return;

    // Preserva dia/hora originais do stage_changed_at, só troca ano/mês —
    // o histórico só olha pro mês, não precisa zerar o resto da data.
    const nextDate = new Date(currentStageChangedAt);
    const [year, monthNumber] = month.split("-").map(Number);
    nextDate.setFullYear(year, monthNumber - 1);
    const nextStageChangedAt = nextDate.toISOString();

    setSubmitting(true);
    try {
      await api.updateDeal(dealId, { stage_changed_at: nextStageChangedAt });
      onMoved(dealId, nextStageChangedAt);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao mover negócio de mês.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!dealId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mover {dealTitle} pra outro mês</DialogTitle>
          <DialogDescription>Muda em qual mês do histórico este negócio aparece.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="move-deal-month">Mês</Label>
            <Input
              id="move-deal-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !month}>
              {submitting ? "Movendo…" : "Mover"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
