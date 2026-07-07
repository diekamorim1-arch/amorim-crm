// Dialog para marcar um negócio como perdido — exige motivo antes de confirmar.

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOSS_REASON_LABELS } from "@/lib/constants";
import type { Deal, LossReason } from "@/lib/types";

interface MarkLostDialogProps {
  deal: Deal | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: LossReason) => void;
}

export function MarkLostDialog({ deal, onOpenChange, onConfirm }: MarkLostDialogProps) {
  const [reason, setReason] = useState<LossReason | "">("");

  useEffect(() => {
    setReason("");
  }, [deal?.id]);

  return (
    <Dialog open={deal !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Marcar negócio como perdido</DialogTitle>
          <DialogDescription>
            {deal ? `${deal.title} — selecione o motivo da perda.` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="loss-reason">Motivo*</Label>
          <Select value={reason} onValueChange={(value) => setReason(value as LossReason)}>
            <SelectTrigger id="loss-reason" className="w-full">
              <SelectValue placeholder="Selecione um motivo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LOSS_REASON_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!reason}
            onClick={() => {
              if (!reason) return;
              onConfirm(reason);
            }}
          >
            Marcar como perdido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
