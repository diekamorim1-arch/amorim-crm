// Pipeline Kanban — 5 colunas por estágio, drag-and-drop nativo + fallback de
// menu, quick-add de lead, marcar como perdido e sheet de negócios perdidos.

import { useState } from "react";
import { useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AddLeadDialog, type AddLeadFormValues } from "@/components/pipeline/AddLeadDialog";
import { DeleteDealDialog } from "@/components/pipeline/DeleteDealDialog";
import { EditDealDialog } from "@/components/pipeline/EditDealDialog";
import { KanbanColumn } from "@/components/pipeline/KanbanColumn";
import { LostDealsSheet } from "@/components/pipeline/LostDealsSheet";
import { MarkLostDialog } from "@/components/pipeline/MarkLostDialog";
import { Button } from "@/components/ui/button";
import { ApiError, api, mapContact, mapConversation, mapDeal } from "@/lib/apiClient";
import { STAGES } from "@/lib/constants";
import { assignableUsers, contactById, conversationWithContact, currentUser, dealsByStage, lostDeals } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import type { Deal, LossReason, Stage } from "@/lib/types";

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
  const [deleteDealTarget, setDeleteDealTarget] = useState<Deal | null>(null);
  const [deletingDeal, setDeletingDeal] = useState(false);

  const isGestor = currentUser(state)?.role === "gestor";

  const grouped = dealsByStage(state);
  const posVendaAll = grouped.pos_venda;
  const posVendaRecent = posVendaAll.filter(isRecentWin);
  const olderWonCount = posVendaAll.length - posVendaRecent.length;

  function dealsForStage(stage: Stage): Deal[] {
    return stage === "pos_venda" ? posVendaRecent : grouped[stage];
  }

  async function handleMoveDeal(dealId: string, stage: Stage) {
    // Guarda contra mover para a própria coluna (ex.: soltar o card de volta
    // onde estava): sem esse early-return o reducer resetaria stageChangedAt
    // (zerando o relógio de "parado"), criaria uma Activity de mudança de
    // estágio espúria e, em pos_venda, re-dispararia o toast de venda ganha
    // com Activity de venda duplicada.
    const deal = state.deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === stage) return;

    // Atualização otimista: o card se move na hora, antes de qualquer round-trip
    // de rede — sem isso, cada arraste esperava moveDeal() E DEPOIS um
    // refreshCrmData() completo (4 requisições) antes da UI reagir.
    const originalContact = state.contacts.find((c) => c.id === deal.contactId);
    // Mesma fórmula do backend (won_count >= 2 → recorrente) — calculada
    // localmente porque o deal recém-movido ainda não está com outcome
    // "ganho" neste snapshot de state.deals, então soma 1 pra contar a venda
    // atual. Só usado pro texto do toast, disparado depois da confirmação
    // da API (não junto do dispatch otimista) — senão um moveDeal que falha
    // mostraria "Venda ganha!" seguido do toast de erro.
    const wonCount = state.deals.filter((d) => d.contactId === deal.contactId && d.outcome === "ganho").length + 1;
    dispatch({ type: "MOVE_DEAL", dealId, stage });

    try {
      const updated = await api.moveDeal(dealId, stage);
      // Reconcilia com a resposta autoritativa do servidor (stageChangedAt
      // exato, por exemplo) — não substitui a atualização otimista, só
      // corrige qualquer pequena divergência.
      dispatch({ type: "UPDATE_DEAL", deal: mapDeal(updated) });
      if (stage === "pos_venda") {
        const label = wonCount >= 2 ? "recorrente" : "cliente";
        toast.success(`Venda ganha! 🎉 ${originalContact?.name ?? "Cliente"} agora é ${label}.`);
      }
    } catch (error) {
      // Reverte a atualização otimista: volta o deal e (se era uma venda) o
      // contato pro estado exato de antes do drag, sem reprocessar a lógica
      // de MOVE_DEAL (que reaplicaria o cálculo de journeyStatus errado).
      dispatch({ type: "UPDATE_DEAL", deal });
      if (originalContact) dispatch({ type: "UPDATE_CONTACT", contact: originalContact });
      toast.error(error instanceof ApiError ? error.message : "Erro ao mover negócio.");
    }
  }

  async function handleConfirmLost(reason: LossReason) {
    if (!lostDialogDeal) return;

    try {
      const updated = await api.markDealLost(lostDialogDeal.id, reason);
      dispatch({ type: "UPDATE_DEAL", deal: mapDeal(updated) });
      toast.success("Negócio marcado como perdido.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao marcar negócio como perdido.");
    }
    setLostDialogDeal(null);
  }

  async function handleConfirmDeleteDeal() {
    if (!deleteDealTarget) return;

    setDeletingDeal(true);
    try {
      await api.deleteDeal(deleteDealTarget.id);
      dispatch({ type: "REMOVE_DEAL", dealId: deleteDealTarget.id });
      toast.success(`Negócio ${deleteDealTarget.title} excluído.`);
      setDeleteDealTarget(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao excluir negócio.");
    } finally {
      setDeletingDeal(false);
    }
  }

  function handleOpenFicha(contactId: string) {
    navigate(`/clientes/${contactId}`);
  }

  async function handleOpenConversation(contactId: string) {
    const existing = conversationWithContact(state, contactId);
    if (existing) {
      navigate(`/inbox/${existing.id}`);
      return;
    }

    try {
      const created = await api.createConversation(contactId);
      dispatch({ type: "REMOTE_UPSERT_CONVERSATION", conversation: mapConversation(created) });
      navigate(`/inbox/${created.id}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível abrir a conversa.");
    }
  }

  async function handleCreateLead(values: AddLeadFormValues) {
    if (!state.session) return;

    try {
      // Uma única ida-e-volta: /leads grava contact+deal+activity no
      // servidor e devolve os dois na mesma resposta, em vez de 3 requests
      // HTTP sequenciais do navegador (createContact -> createDeal ->
      // updateDealFinancials).
      const result = await api.createLead({
        name: values.name,
        whatsapp: values.whatsapp,
        origin: values.origin,
        value: values.value,
        owner_id: values.ownerId,
        supplier_product_id: values.supplierProductId,
        supplier_value: values.supplierValue,
      });
      const contact = mapContact(result.contact);
      const deal = mapDeal(result.deal);
      dispatch({ type: "ADD_CONTACT", contact });
      dispatch({ type: "ADD_DEAL", deal });
      toast.success(`Lead ${contact.name} criado.`);
      setAddOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao criar lead.");
    }
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
            onDeleteDeal={isGestor ? setDeleteDealTarget : undefined}
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
        users={assignableUsers(state)}
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

      <DeleteDealDialog
        deal={deleteDealTarget}
        deleting={deletingDeal}
        onOpenChange={(open) => !open && setDeleteDealTarget(null)}
        onConfirm={handleConfirmDeleteDeal}
      />
    </div>
  );
}
