// ContactPanel — coluna de contexto do Inbox: resumo do cliente, negócio
// ativo (com select para mover de estágio) e ações rápidas. Autossuficiente
// (lê o próprio store a partir de contactId).

import { useState } from "react";
import { useNavigate } from "react-router";
import { CalendarDays, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";

import { AppointmentDialog } from "@/components/agenda/AppointmentDialog";
import { JourneyBadge } from "@/components/contacts/JourneyBadge";
import { QuickDealDialog } from "@/components/inbox/QuickDealDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, api } from "@/lib/apiClient";
import { ORIGIN_LABELS, STAGES, STAGE_LABELS } from "@/lib/constants";
import { brl } from "@/lib/format";
import { contactById, tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import type { Stage } from "@/lib/types";

interface ContactPanelProps {
  contactId: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

export function ContactPanel({ contactId }: ContactPanelProps) {
  const { state, refreshCrmData } = useCrm();
  const navigate = useNavigate();
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [apptDialogOpen, setApptDialogOpen] = useState(false);

  const contact = contactById(state, contactId);
  const { deals } = tenantScope(state);

  if (!contact) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>
      </div>
    );
  }

  const activeDeal = deals
    .filter((d) => d.contactId === contact.id && d.outcome === "aberto")
    .sort((a, b) => new Date(b.stageChangedAt).getTime() - new Date(a.stageChangedAt).getTime())[0];

  async function handleMoveStage(stage: Stage) {
    if (!activeDeal || stage === activeDeal.stage) return;

    try {
      await api.moveDeal(activeDeal.id, stage);
      await refreshCrmData();
      toast.success(`Negócio movido para ${STAGE_LABELS[stage]}.`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao mover negócio.");
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <Avatar size="lg" className="size-14">
          <AvatarFallback className="text-lg">{initialsOf(contact.name)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-center gap-1">
          <h2 className="font-display text-base font-semibold text-foreground">{contact.name}</h2>
          <JourneyBadge status={contact.journeyStatus} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">WhatsApp</span>
          <span className="font-mono text-foreground">{contact.whatsapp}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Origem</span>
          <span className="text-foreground">{ORIGIN_LABELS[contact.origin]}</span>
        </div>
        {contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {contact.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div>
        <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Negócio ativo</h3>
        {activeDeal ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="text-sm font-medium text-foreground">{activeDeal.products}</p>
            <p className="font-mono text-base font-semibold tabular-nums text-foreground">{brl(activeDeal.value)}</p>
            <Select value={activeDeal.stage} onValueChange={(v) => handleMoveStage(v as Stage)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum negócio em aberto no momento.</p>
        )}
      </div>

      <Separator />

      <div className="mt-auto flex flex-col gap-2">
        <Button variant="outline" onClick={() => setDealDialogOpen(true)}>
          <Plus />
          Criar negócio
        </Button>
        <Button variant="outline" onClick={() => setApptDialogOpen(true)}>
          <CalendarDays />
          Agendar
        </Button>
        <Button variant="outline" onClick={() => navigate(`/clientes/${contact.id}`)}>
          <UserRound />
          Abrir ficha
        </Button>
      </div>

      <QuickDealDialog open={dealDialogOpen} onOpenChange={setDealDialogOpen} contactId={contact.id} />
      <AppointmentDialog
        contactId={contact.id}
        dealId={activeDeal?.id}
        open={apptDialogOpen}
        onOpenChange={setApptDialogOpen}
      />
    </div>
  );
}
