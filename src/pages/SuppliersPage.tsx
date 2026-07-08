// SuppliersPage — lista de fornecedores com busca client-side simples. Grid
// de cards (clique navega para o detalhe); "Novo fornecedor" só para gestor.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Search, SearchX, Truck } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { SupplierFormDialog } from "@/components/suppliers/SupplierFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { currentUser, tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import type { Supplier } from "@/lib/types";

export function SuppliersPage() {
  const { state } = useCrm();
  const navigate = useNavigate();
  const me = currentUser(state);
  const { suppliers, supplierProducts } = tenantScope(state);

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const isGestor = me?.role === "gestor";

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return suppliers
      .filter((supplier) => !query || supplier.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [suppliers, search]);

  function productCount(supplierId: string): number {
    return supplierProducts.filter((p) => p.supplierId === supplierId).length;
  }

  function openSupplier(supplier: Supplier) {
    navigate(`/fornecedores/${supplier.id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Fornecedores</h1>
        {isGestor && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            Novo fornecedor
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome do fornecedor"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        search.trim() !== "" ? (
          <EmptyState
            icon={SearchX}
            title="Nenhum fornecedor encontrado"
            description="Tente ajustar a busca."
            action={
              <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                Limpar busca
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Truck}
            title="Nenhum fornecedor cadastrado ainda"
            description="Adicione o primeiro fornecedor para começar a acompanhar produtos e preços de custo."
            action={
              isGestor ? (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus />
                  Novo fornecedor
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((supplier) => (
            <Card
              key={supplier.id}
              role="button"
              tabIndex={0}
              onClick={() => openSupplier(supplier)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openSupplier(supplier);
                }
              }}
              className="cursor-pointer rounded-xl transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <CardHeader>
                <span className="font-medium text-foreground">{supplier.name}</span>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                <span className="font-mono tabular-nums">{supplier.whatsapp}</span>
                <span>{supplier.contactName ?? "Sem contato cadastrado"}</span>
                <span>
                  {productCount(supplier.id)} {productCount(supplier.id) === 1 ? "produto" : "produtos"}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SupplierFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
