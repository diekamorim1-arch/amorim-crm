// Pipeline Kanban — 5 colunas por estágio, drag-and-drop nativo + fallback de
// menu, quick-add de lead, marcar como perdido e sheet de negócios perdidos.

import { useState } from "react";
import { useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AddLeadDialog, type AddLeadFormValues } from "@/components/pipeline/AddLeadDialog";
import { EditDealDialog } from "@/components/pipeline/EditDealDialog";
import { KanbanColumn } from "@/components/pipeline/KanbanColumn";
import { LostDealsSheet } from "@/components/pipeline/LostDealsSheet";
import { MarkLostDialog } from "@/components/pipeline/MarkLostDialog";
import { Button } from "@/components/ui/button";
import { STAGES } from "@/lib/constants";
import { contactById, conversationWithContact, currentUser, dealsByStage, lostDeals, tenantScope } from "@/lib/selectors";
import { crmReducer, newId, useCrm } from "@/lib/store";
import type { Activity, Contact, Conversation, Deal, LossReason, Stage } from "@/lib/types";

const POS_VENDA_WINDOW_DAYS = 30;
const POS_VENDA_WINDOW_MS = POS_VENDA_WINDOW_DAYS * 24 * 60 * 60 * 1000;

function isRecentWin(deal: Deal): boolean {
  return Date.now() - new Date(deal.stageChangedAt).getTime() <= POS_VENDA_WINDOW_MS;
}

export function PipelinePage() {
  const { state, dispatch } = useCrm();
  const navigate = useNavigate();

  const [addOpen, setAddOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostDialogDeal, setLostDialogDeal] = useState<Deal | null>(null);
  const [editDealTarget, setEditDealTarget] = useState<Deal | null>(null);

  const isGestor = currentUser(state)?.role === "gestor";

  const grouped = dealsByStage(state);
  const posVendaAll = grouped.pos_venda;
  const posVendaRecent = posVendaAll.filter(isRecentWin);
  const olderWonCount = posVendaAll.length - posVendaRecent.length;

  function dealsForStage(stage: Stage): Deal[] {
    return stage === "pos_venda" ? posVendaRecent : grouped[stage];
  }

  function handleMoveDeal(dealId: string, stage: Stage) {
    // Guarda contra mover para a própria coluna (ex.: soltar o card de volta
    // onde estava): sem esse early-return o reducer resetaria stageChangedAt
    // (zerando o relógio de "parado"), criaria uma Activity de mudança de
    // estágio espúria e, em pos_venda, re-dispararia o toast de venda ganha
    // com Activity de venda duplicada.
    const deal = state.deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === stage) return;

    if (stage === "pos_venda") {
      // Computa o estado resultante antes de despachar para poder ler o
      // journeyStatus do contato "depois" da mudança, sem depender de um
      // segundo render.
      const next = crmReducer(state, { type: "MOVE_DEAL", dealId, stage });
      dispatch({ type: "MOVE_DEAL", dealId, stage });

      const contact = next.contacts.find((c) => c.id === deal.contactId);
      if (contact) {
        const label = contact.journeyStatus === "recorrente" ? "recorrente" : "cliente";
        toast.success(`Venda ganha! 🎉 ${contact.name} agora é ${label}.`);
      }
      return;
    }

    dispatch({ type: "MOVE_DEAL", dealId, stage });
  }

  function handleConfirmLost(reason: LossReason) {
    if (!lostDialogDeal) return;
    dispatch({ type: "MARK_DEAL_LOST", dealId: lostDialogDeal.id, reason });
    toast.success("Negócio marcado como perdido.");
    setLostDialogDeal(null);
  }

  function handleOpenFicha(contactId: string) {
    navigate(`/clientes/${contactId}`);
  }

  function handleOpenConversation(contactId: string) {
    const existing = conversationWithContact(state, contactId);
    if (existing) {
      navigate(`/inbox/${existing.id}`);
      return;
    }

    if (!state.session) return;
    const conversation: Conversation = {
      id: newId("conv"),
      tenantId: state.session.tenantId,
      contactId,
      assigneeId: null,
      status: "aberta",
      unread: 0,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: "ADD_CONVERSATION", conversation });
    navigate(`/inbox/${conversation.id}`);
  }

  function handleCreateLead(values: AddLeadFormValues) {
    if (!state.session) return;
    const tenantId = state.session.tenantId;
    const now = new Date().toISOString();
    const contactId = newId("contact");
    const dealId = newId("deal");
    const productLabel = values.supplierProductName ?? "Novo negócio";

    const contact: Contact = {
      id: contactId,
      tenantId,
      name: values.name,
      whatsapp: values.whatsapp,
      origin: values.origin,
      interests: [],
      tags: [],
      journeyStatus: "lead",
      ownerId: values.ownerId,
      firstContactAt: now,
      lastInteractionAt: now,
      createdAt: now,
    };

    const deal: Deal = {
      id: dealId,
      tenantId,
      contactId,
      title: productLabel,
      products: productLabel,
      value: values.value,
      payment: "pix",
      tradeIn: false,
      stage: "novo_lead",
      outcome: "aberto",
      ownerId: values.ownerId,
      stageChangedAt: now,
      createdAt: now,
      supplierProductId: values.supplierProductId,
      supplierValue: values.supplierValue,
    };

    const activity: Activity = {
      id: newId("activity"),
      tenantId,
      contactId,
      dealId,
      userId: values.ownerId,
      type: "mudanca_estagio",
      description: `Novo lead criado: ${productLabel}.`,
      createdAt: now,
    };

    dispatch({ type: "ADD_CONTACT", contact });
    dispatch({ type: "ADD_DEAL", deal });
    dispatch({ type: "ADD_ACTIVITY", activity });

    toast.success(`Lead ${contact.name} criado.`);
    setAddOpen(false);
  }

  return (
    <div className="flex h-full min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Pipeline</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setLostOpen(true)}>
            Perdidos ({lostDeals(state).length})
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus />
            Novo lead
          </Button>
        </div>
      </div>

      <div className="flex flex-1 snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stageId={stage.id}
            label={stage.label}
            deals={dealsForStage(stage.id)}
            getContact={(id) => contactById(state, id)}
            onDropDeal={handleMoveDeal}
            onMoveDeal={handleMoveDeal}
            onMarkLost={setLostDialogDeal}
            onOpenFicha={handleOpenFicha}
            onOpenConversation={handleOpenConversation}
            onEditDeal={isGestor ? setEditDealTarget : undefined}
            footer={
              stage.id === "pos_venda" && olderWonCount > 0 ? (
                <p className="text-xs text-muted-foreground">
                  +{olderWonCount} venda{olderWonCount === 1 ? "" : "s"} mais antiga
                  {olderWonCount === 1 ? "" : "s"} — veja na ficha do cliente
                </p>
              ) : undefined
            }
          />
        ))}
      </div>

      <AddLeadDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        users={tenantScope(state).users}
        defaultOwnerId={state.session?.userId ?? ""}
        onSubmit={handleCreateLead}
      />

      <MarkLostDialog
        deal={lostDialogDeal}
        onOpenChange={(open) => {
          if (!open) setLostDialogDeal(null);
        }}
        onConfirm={handleConfirmLost}
      />

      <LostDealsSheet open={lostOpen} onOpenChange={setLostOpen} deals={lostDeals(state)} />

      <EditDealDialog
        deal={editDealTarget}
        open={!!editDealTarget}
        onOpenChange={(open) => !open && setEditDealTarget(null)}
      />
    </div>
  );
}
