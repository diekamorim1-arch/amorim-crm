// SupplierDetailPage — ficha do fornecedor: dados cadastrais + catálogo de
// produtos com preço atual e atalhos para editar preço / ver histórico.
// Controles de escrita (Editar, Novo produto, Editar preço) só para gestor;
// "Ver histórico" fica disponível para todos os papéis.

import { useState } from "react";
import { Navigate, useParams } from "react-router";
import { History, Package, Pencil, Plus, Upload } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { EditPriceDialog } from "@/components/suppliers/EditPriceDialog";
import { ImportProductsDialog } from "@/components/suppliers/ImportProductsDialog";
import { PriceHistorySheet } from "@/components/suppliers/PriceHistorySheet";
import { SupplierFormDialog } from "@/components/suppliers/SupplierFormDialog";
import { SupplierProductDialog } from "@/components/suppliers/SupplierProductDialog";
import { Button } from "@/components/ui/button";
import { currentUser, tenantScope } from "@/lib/selectors";
import { brl, relativeTime } from "@/lib/format";
import { useCrm } from "@/lib/store";
import type { SupplierProduct } from "@/lib/types";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

export function SupplierDetailPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const { state } = useCrm();
  const me = currentUser(state);
  const isGestor = me?.role === "gestor";

  const [editOpen, setEditOpen] = useState(false);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<SupplierProduct | null>(null);
  const [priceProduct, setPriceProduct] = useState<SupplierProduct | null>(null);
  const [historyProduct, setHistoryProduct] = useState<SupplierProduct | null>(null);

  const { suppliers, supplierProducts } = tenantScope(state);
  const supplier = supplierId ? suppliers.find((s) => s.id === supplierId) : undefined;

  if (!supplier) {
    return <Navigate to="/fornecedores" replace />;
  }

  const products = supplierProducts
    .filter((p) => p.supplierId === supplier.id)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-full flex flex-col gap-0.5">
            <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">{supplier.name}</h1>
          </div>
          <InfoRow label="WhatsApp" value={supplier.whatsapp} />
          <InfoRow label="Nome do contato" value={supplier.contactName ?? "—"} />
          <InfoRow label="E-mail" value={supplier.email ?? "—"} />
          <InfoRow label="Observações" value={supplier.notes ?? "—"} />
        </div>

        {isGestor && (
          <Button onClick={() => setEditOpen(true)}>
            <Pencil />
            Editar
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-foreground">Produtos</h2>
          {isGestor && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload />
                Importar produtos
              </Button>
              <Button variant="outline" size="sm" onClick={() => setNewProductOpen(true)}>
                <Plus />
                Novo produto
              </Button>
            </div>
          )}
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum produto cadastrado ainda"
            description="Adicione o primeiro produto deste fornecedor para acompanhar o preço de custo."
            action={
              isGestor ? (
                <Button size="sm" onClick={() => setNewProductOpen(true)}>
                  <Plus />
                  Novo produto
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {products.map((product) => (
              <div
                key={product.id}
                onDoubleClick={() => setEditProduct(product)}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{product.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {product.colors ? `${product.colors} · ` : ""}atualizado {relativeTime(product.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    {brl(product.currentPrice)}
                  </span>
                  <div className="flex gap-2">
                    {isGestor && (
                      <Button variant="outline" size="sm" onClick={() => setPriceProduct(product)}>
                        Editar preço
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setHistoryProduct(product)}>
                      <History />
                      Ver histórico
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SupplierFormDialog supplier={supplier} open={editOpen} onOpenChange={setEditOpen} />
      <SupplierProductDialog supplierId={supplier.id} open={newProductOpen} onOpenChange={setNewProductOpen} />
      <ImportProductsDialog supplierId={supplier.id} open={importOpen} onOpenChange={setImportOpen} />
      <SupplierProductDialog
        supplierId={supplier.id}
        product={editProduct ?? undefined}
        open={!!editProduct}
        onOpenChange={(o) => !o && setEditProduct(null)}
      />
      <EditPriceDialog product={priceProduct} open={!!priceProduct} onOpenChange={(o) => !o && setPriceProduct(null)} />
      <PriceHistorySheet
        product={historyProduct}
        open={!!historyProduct}
        onOpenChange={(o) => !o && setHistoryProduct(null)}
      />
    </div>
  );
}
