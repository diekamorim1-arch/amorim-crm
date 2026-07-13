// DashboardPage — visão do gestor: métricas do mês, funil de vendas, leads
// por canal, ranking de motivos de perda, conversas sem responsável e os
// agendamentos de hoje. Página somente leitura: busca tudo via selectors
// (dashboardMetrics/tenantScope) e passa dados prontos para componentes de
// gráfico "burros" (sem useCrm próprio), para ficarem fáceis de testar depois.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CalendarX } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/EmptyState";
import { ChannelTable } from "@/components/dashboard/ChannelTable";
import { CustomersWonSheet } from "@/components/dashboard/CustomersWonSheet";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { LossRanking } from "@/components/dashboard/LossRanking";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MonthlyDetailSheet, type MonthlyDetailRow } from "@/components/dashboard/MonthlyDetailSheet";
import { MonthlyHistoryTable } from "@/components/dashboard/MonthlyHistoryTable";
import { MoveDealMonthDialog } from "@/components/dashboard/MoveDealMonthDialog";
import { NewLeadsSheet } from "@/components/dashboard/NewLeadsSheet";
import { EditDealDialog } from "@/components/pipeline/EditDealDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatHourMinute, isSameDay } from "@/components/agenda/weekGridMath";
import { ApiError, api, mapMonthlyDealDetail, mapMonthlyHistoryItem, type MonthlyHistoryItem } from "@/lib/apiClient";
import { APPOINTMENT_TYPE_LABELS, STAGE_LABELS } from "@/lib/constants";
import { brl } from "@/lib/format";
import {
  customersWonThisMonth,
  dashboardMetrics,
  newLeadsThisMonth,
  tenantScope,
} from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import type { Deal } from "@/lib/types";

/** Delta percentual assinado vs. o período anterior; sem base (mês anterior
 * zerado) não mostra variação inventada — só o valor absoluto. */
function computeDelta(current: number, previous: number): { pct: number; label: string } | undefined {
  if (previous === 0) return undefined;
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  return { pct, label: "vs. mês anterior" };
}

export function DashboardPage() {
  const { state, dispatch, dataVersion } = useCrm();
  const navigate = useNavigate();

  const [newLeadsOpen, setNewLeadsOpen] = useState(false);
  const [customersWonOpen, setCustomersWonOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<{ key: string; label: string } | null>(null);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [movingRow, setMovingRow] = useState<MonthlyDetailRow | null>(null);

  const [remoteHistory, setRemoteHistory] = useState<MonthlyHistoryItem[]>([]);
  // Cache por mês (chave "YYYY-MM"): reabrir um mês já visto nesta sessão não
  // rebusca get_monthly_detail — só o primeiro clique em cada mês paga a
  // ida-e-volta de rede.
  const [monthDetailCache, setMonthDetailCache] = useState<Record<string, MonthlyDetailRow[]>>({});

  useEffect(() => {
    let active = true;
    api.getMonthlyHistory().then((rows) => {
      if (active) setRemoteHistory(rows.map(mapMonthlyHistoryItem));
    });
    return () => {
      active = false;
    };
  }, [dataVersion]);

  // dataVersion muda a cada refreshCrmData() bem-sucedido — os meses já
  // cacheados podem estar desatualizados nesse momento (uma mutação em
  // qualquer negócio ganho pode ter mudado o mês de origem dele), então o
  // cache é limpo aqui em vez de confiar em dados potencialmente stale.
  useEffect(() => {
    setMonthDetailCache({});
  }, [dataVersion]);

  useEffect(() => {
    if (!selectedMonth || monthDetailCache[selectedMonth.key]) return;
    const [year, month] = selectedMonth.key.split("-").map(Number);
    const monthKey = selectedMonth.key;
    let active = true;
    api.getMonthlyDetail(year, month).then((rows) => {
      if (active) {
        setMonthDetailCache((prev) => ({ ...prev, [monthKey]: rows.map(mapMonthlyDealDetail) }));
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  function removeDealFromCache(dealId: string) {
    setMonthDetailCache((prev) => {
      const next: typeof prev = {};
      for (const [key, rows] of Object.entries(prev)) {
        next[key] = rows.filter((r) => r.dealId !== dealId);
      }
      return next;
    });
  }

  async function handleDeleteMonthlyDeal(dealId: string) {
    try {
      await api.deleteDeal(dealId);
      dispatch({ type: "REMOVE_DEAL", dealId });
      removeDealFromCache(dealId);
      toast.success("Negócio excluído.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao excluir negócio.");
      throw error;
    }
  }

  function handleMovedDeal(dealId: string, nextStageChangedAt: string) {
    // O negócio deixou de pertencer ao mês aberto — some de qualquer mês
    // cacheado, e state.deals é atualizado pra manter Pipeline/outras telas
    // coerentes.
    removeDealFromCache(dealId);
    const deal = state.deals.find((d) => d.id === dealId);
    if (deal) {
      dispatch({ type: "UPDATE_DEAL", deal: { ...deal, stageChangedAt: nextStageChangedAt } });
    }
    toast.success("Negócio movido de mês.");
  }

  const metrics = dashboardMetrics(state);
  const { conversations, appointments, contacts } = tenantScope(state);

  const unassignedCount = conversations.filter((c) => c.assigneeId === null).length;

  const today = new Date();
  const todayAppointments = [...appointments]
    .filter((a) => isSameDay(new Date(a.startsAt), today))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const revenueDelta = computeDelta(metrics.revenueMonth, metrics.revenuePrevMonth);

  const newLeads = newLeadsThisMonth(state);
  const customersWon = customersWonThisMonth(state);
  const history = remoteHistory;
  const detailRows: MonthlyDetailRow[] = selectedMonth ? (monthDetailCache[selectedMonth.key] ?? []) : [];

  const editingDeal: Deal | null = editingDealId ? (state.deals.find((d) => d.id === editingDealId) ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do funil e do desempenho do mês.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Leads novos no mês"
          value={String(metrics.newLeadsMonth)}
          valueClassName="font-display"
          onClick={() => setNewLeadsOpen(true)}
        />
        <MetricCard
          label="Clientes que compraram no mês"
          value={String(customersWon.length)}
          valueClassName="font-display"
          onClick={() => setCustomersWonOpen(true)}
        />
        <MetricCard
          label="Em negociação"
          value={brl(metrics.inNegotiationValue)}
          valueClassName="font-mono tabular-nums text-xl"
        />
        <MetricCard
          label="Receita no mês"
          value={brl(metrics.revenueMonth)}
          valueClassName="font-mono tabular-nums text-xl"
          delta={revenueDelta}
        />
        <MetricCard
          label="Taxa de conversão"
          value={`${metrics.conversionRate.toFixed(1)}%`}
          valueClassName="font-display"
        />
        <MetricCard
          label="Lucro líquido no mês"
          value={brl(metrics.netProfitMonth)}
          valueClassName="font-mono tabular-nums text-xl"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base font-semibold">Funil de vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart data={metrics.funnelCounts} stageLabels={STAGE_LABELS} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base font-semibold">Leads por canal</CardTitle>
          </CardHeader>
          <CardContent>
            <ChannelTable data={metrics.byChannel} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base font-semibold">Motivos de perda</CardTitle>
          </CardHeader>
          <CardContent>
            <LossRanking data={metrics.lossRanking} />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="font-display text-base font-semibold">
              Conversas não atribuídas ({unassignedCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {unassignedCount === 0
                ? "Todas as conversas já têm um responsável."
                : "Conversas aguardando um responsável na Inbox."}
            </p>
            <Button type="button" variant="outline" onClick={() => navigate("/inbox")} className="self-start">
              Ver na Inbox
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base font-semibold">Agendamentos de hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <EmptyState compact icon={CalendarX} title="Nenhum agendamento para hoje" />
            ) : (
              <ul className="flex flex-col gap-2">
                {todayAppointments.map((appt) => {
                  const contact = contacts.find((c) => c.id === appt.contactId);
                  return (
                    <li key={appt.id} className="flex items-center gap-2 text-sm">
                      <span className="font-mono tabular-nums text-foreground">
                        {formatHourMinute(appt.startsAt)}
                      </span>
                      <span className="flex-1 truncate text-foreground">
                        {contact?.name ?? "Cliente não encontrado"}
                      </span>
                      <Badge variant="secondary">{APPOINTMENT_TYPE_LABELS[appt.type]}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base font-semibold">Histórico mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyHistoryTable
            data={history}
            onSelectMonth={(row) => setSelectedMonth({ key: row.monthKey, label: row.month })}
          />
        </CardContent>
      </Card>

      <NewLeadsSheet open={newLeadsOpen} onOpenChange={setNewLeadsOpen} contacts={newLeads} />
      <CustomersWonSheet open={customersWonOpen} onOpenChange={setCustomersWonOpen} rows={customersWon} />
      <MonthlyDetailSheet
        open={!!selectedMonth}
        onOpenChange={(open) => !open && setSelectedMonth(null)}
        month={selectedMonth?.label ?? ""}
        rows={detailRows}
        onEdit={setEditingDealId}
        onMove={setMovingRow}
        onDelete={handleDeleteMonthlyDeal}
      />
      <EditDealDialog
        deal={editingDeal}
        open={!!editingDealId}
        onOpenChange={(open) => !open && setEditingDealId(null)}
      />
      <MoveDealMonthDialog
        dealId={movingRow?.dealId ?? null}
        dealTitle={movingRow?.contactName ?? ""}
        currentStageChangedAt={movingRow?.stageChangedAt ?? new Date().toISOString()}
        onOpenChange={(open) => !open && setMovingRow(null)}
        onMoved={handleMovedDeal}
      />
    </div>
  );
}
