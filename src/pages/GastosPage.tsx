// GastosPage — registro de despesas da loja (gestor) via API real. Gastos do
// mês corrente são editáveis (adicionar/remover); meses anteriores aparecem
// como somente-leitura, agrupados por mês só comparando datas (mesmo padrão
// de isSameMonth já usado no Dashboard). Exportação de planilha é um CSV
// gerado no próprio navegador, sob demanda, por mês.

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError, api, mapExpense } from "@/lib/apiClient";
import { brl, monthLabel } from "@/lib/format";
import { isSameMonth, monthKeyOf, tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import type { Expense } from "@/lib/types";

function downloadExpensesCsv(label: string, expenses: Expense[], userName: (userId: string) => string) {
  const header = "Data,Descrição,Valor,Responsável";
  const rows = expenses.map((expense) => {
    const date = new Date(expense.createdAt).toLocaleDateString("pt-BR");
    const description = `"${expense.description.replace(/"/g, '""')}"`;
    const value = expense.value.toFixed(2).replace(".", ",");
    return [date, description, value, userName(expense.userId)].join(",");
  });
  // BOM (﻿) garante acentos corretos ao abrir no Excel em pt-BR.
  const csv = "﻿" + [header, ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gastos-${label.toLowerCase().replace("/", "-")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function GastosPage() {
  const { state, dispatch } = useCrm();
  const { expenses, users } = tenantScope(state);

  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .listExpenses()
      .then((rows) => active && dispatch({ type: "SET_EXPENSES", expenses: rows.map(mapExpense) }))
      .catch(() => active && toast.error("Não foi possível carregar os gastos."));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = new Date();
  const currentMonthLabel = monthLabel(now);

  const currentMonthExpenses = expenses
    .filter((e) => isSameMonth(e.createdAt, now))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const currentTotal = currentMonthExpenses.reduce((sum, e) => sum + e.value, 0);

  const pastMonths = useMemo(() => {
    const byMonth = new Map<string, { month: string; expenses: Expense[] }>();
    for (const expense of expenses) {
      if (isSameMonth(expense.createdAt, now)) continue;
      const key = monthKeyOf(expense.createdAt);
      const entry = byMonth.get(key) ?? { month: monthLabel(new Date(expense.createdAt)), expenses: [] };
      entry.expenses.push(expense);
      byMonth.set(key, entry);
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([monthKey, entry]) => ({
        monthKey,
        month: entry.month,
        expenses: entry.expenses,
        total: entry.expenses.reduce((sum, e) => sum + e.value, 0),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses]);

  function userName(userId: string): string {
    return users.find((u) => u.id === userId)?.name ?? "—";
  }

  async function handleAddExpense(event: FormEvent) {
    event.preventDefault();

    if (!description.trim()) {
      setError("Informe o que foi comprado.");
      return;
    }
    if (!value || Number(value) <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }
    setError("");

    setSubmitting(true);
    try {
      const created = mapExpense(await api.createExpense(description.trim(), Number(value)));
      dispatch({ type: "ADD_EXPENSE", expense: created });
      toast.success(`Gasto "${created.description}" adicionado.`);
      setDescription("");
      setValue("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao adicionar gasto.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(expense: Expense) {
    try {
      await api.deleteExpense(expense.id);
      dispatch({ type: "REMOVE_EXPENSE", expenseId: expense.id });
      toast.success("Gasto removido.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Erro ao remover gasto.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Gastos</h1>
        <p className="text-sm text-muted-foreground">Registre e acompanhe os gastos da loja mês a mês.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base font-semibold">Gastos do mês — {currentMonthLabel}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={handleAddExpense} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="expense-description">O que foi comprado</Label>
              <Input
                id="expense-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ex.: Caixas de embalagem"
                aria-invalid={!!error}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:w-40">
              <Label htmlFor="expense-value">Valor gasto</Label>
              <Input
                id="expense-value"
                type="number"
                min={0}
                step="0.01"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="0,00"
                className="font-mono tabular-nums"
                aria-invalid={!!error}
              />
            </div>
            <Button type="submit" disabled={submitting}>
              <Plus />
              {submitting ? "Adicionando…" : "Adicionar"}
            </Button>
          </form>
          {error && <p className="text-xs text-destructive">{error}</p>}

          {currentMonthExpenses.length === 0 ? (
            <EmptyState compact icon={Receipt} title="Nenhum gasto registrado neste mês ainda" />
          ) : (
            <div className="flex flex-col gap-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentMonthExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(expense.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-foreground">{expense.description}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-foreground">
                        {brl(expense.value)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Remover gasto"
                          onClick={() => handleRemove(expense)}
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <span className="text-sm text-muted-foreground">Total do mês</span>
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{brl(currentTotal)}</span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-fit"
                onClick={() => downloadExpensesCsv(currentMonthLabel, currentMonthExpenses, userName)}
              >
                <Download />
                Exportar planilha
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base font-semibold">Meses anteriores</CardTitle>
        </CardHeader>
        <CardContent>
          {pastMonths.length === 0 ? (
            <EmptyState compact icon={Receipt} title="Nenhum mês fechado ainda" />
          ) : (
            <div className="flex flex-col gap-2">
              {pastMonths.map((entry) => (
                <div
                  key={entry.monthKey}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{entry.month}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.expenses.length} gasto{entry.expenses.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      {brl(entry.total)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Exportar planilha de ${entry.month}`}
                      onClick={() => downloadExpensesCsv(entry.month, entry.expenses, userName)}
                    >
                      <Download />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
