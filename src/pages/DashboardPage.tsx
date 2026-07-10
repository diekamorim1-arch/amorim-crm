// DashboardPage — visão do gestor: métricas do mês, funil de vendas, leads
// por canal, ranking de motivos de perda, conversas sem responsável e os
// agendamentos de hoje. Página somente leitura: busca tudo via selectors
// (dashboardMetrics/tenantScope) e passa dados prontos para componentes de
// gráfico "burros" (sem useCrm próprio), para ficarem fáceis de testar depois.

import { useState } from "react";
import { useNavigate } from "react-router";
import { CalendarX } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { ChannelTable } from "@/components/dashboard/ChannelTable";
import { ClientProfitTable } from "@/components/dashboard/ClientProfitTable";
import { CustomersWonSheet } from "@/components/dashboard/CustomersWonSheet";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { LossRanking } from "@/components/dashboard/LossRanking";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MonthlyHistoryTable } from "@/components/dashboard/MonthlyHistoryTable";
import { NewLeadsSheet } from "@/components/dashboard/NewLeadsSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatHourMinute, isSameDay } from "@/components/agenda/weekGridMath";
import { APPOINTMENT_TYPE_LABELS, STAGE_LABELS } from "@/lib/constants";
import { brl } from "@/lib/format";
import {
  customersWonThisMonth,
  dashboardMetrics,
  monthKeyOf,
  monthlyHistory,
  newLeadsThisMonth,
  tenantScope,
  wonDealsForMonth,
} from "@/lib/selectors";
import { useCrm } from "@/lib/store";

/** Delta percentual assinado vs. o período anterior; sem base (mês anterior
 * zerado) não mostra variação inventada — só o valor absoluto. */
function computeDelta(current: number, previous: number): { pct: number; label: string } | undefined {
  if (previous === 0) return undefined;
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  return { pct, label: "vs. mês anterior" };
}

export function DashboardPage() {
  const { state } = useCrm();
  const navigate = useNavigate();

  const [newLeadsOpen, setNewLeadsOpen] = useState(false);
  const [customersWonOpen, setCustomersWonOpen] = useState(false);
  const [profitMonth, setProfitMonth] = useState(() => monthKeyOf(new Date().toISOString()));

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
  const history = monthlyHistory(state);
  const monthOptions = [...history].reverse().map((row) => ({ monthKey: row.monthKey, month: row.month }));
  const profitRows = wonDealsForMonth(state, profitMonth);

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
          <MonthlyHistoryTable data={history} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base font-semibold">Lucro líquido por cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientProfitTable
            rows={profitRows}
            monthOptions={monthOptions}
            selectedMonth={profitMonth}
            onMonthChange={setProfitMonth}
          />
        </CardContent>
      </Card>

      <NewLeadsSheet open={newLeadsOpen} onOpenChange={setNewLeadsOpen} contacts={newLeads} />
      <CustomersWonSheet open={customersWonOpen} onOpenChange={setCustomersWonOpen} rows={customersWon} />
    </div>
  );
}
