// EditDealDialog — edita o valor da venda, o custo de fornecedor, brindes e
// frete de um negócio, exibindo o ganho líquido recalculado ao vivo.
// Compartilhado entre o Pipeline (menu do card e duplo-clique) e a ficha do
// cliente (aba Negócios); só é renderizado com onEditDeal presente nos dois
// pais, que decidem a visibilidade (gestor) — este componente não checa role
// nenhuma.

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ApiError, api } from "@/lib/apiClient";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brl } from "@/lib/format";
import { tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import type { Deal } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EditDealDialogProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDealDialog({ deal, open, onOpenChange }: EditDealDialogProps) {
  const { state, refreshCrmData } = useCrm();
  const { suppliers, supplierProducts } = tenantScope(state);

  const [value, setValue] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierProductId, setSupplierProductId] = useState("");
  const [supplierValue, setSupplierValue] = useState("");
  const [giftValue, setGiftValue] = useState("");
  const [freightValue, setFreightValue] = useState("");

  useEffect(() => {
    if (open && deal) {
      const product = deal.supplierProductId
        ? supplierProducts.find((p) => p.id === deal.supplierProductId)
        : undefined;
      setValue(String(deal.value));
      setSupplierId(product?.supplierId ?? "");
      setSupplierProductId(deal.supplierProductId ?? "");
      setSupplierValue(deal.supplierValue != null ? String(deal.supplierValue) : "");
      setGiftValue(String(deal.giftValue ?? 0));
      setFreightValue(String(deal.freightValue ?? 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deal]);

  const productsForSupplier = supplierProducts.filter((p) => p.supplierId === supplierId);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  function handleSupplierChange(nextSupplierId: string) {
    setSupplierId(nextSupplierId);
    // Fornecedor mudou: o produto selecionado antes pertencia a outro
    // fornecedor, então não deve permanecer selecionado.
    setSupplierProductId("");
  }

  function handleProductChange(nextProductId: string) {
    setSupplierProductId(nextProductId);
    const product = supplierProducts.find((p) => p.id === nextProductId);
    if (product) {
      setSupplierValue(String(product.currentPrice));
    }
  }

  const parsedValue = Number(value) || 0;
  const parsedSupplierValue = Number(supplierValue) || 0;
  const parsedGiftValue = Number(giftValue) || 0;
  const parsedFreightValue = Number(freightValue) || 0;
  const netGain = parsedValue - parsedSupplierValue - parsedGiftValue - parsedFreightValue;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!deal) return;

    try {
      await api.updateDeal(deal.id, { value: parsedValue });
      await api.updateDealFinancials(deal.id, {
        supplier_product_id: supplierProductId || undefined,
        supplier_value: parsedSupplierValue,
        gift_value: parsedGiftValue,
        freight_value: parsedFreightValue,
      });
      await refreshCrmData();
      toast.success(`Negócio ${deal.title} atualizado.`);
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao atualizar negócio.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar negócio</DialogTitle>
          <DialogDescription>
            {deal
              ? `Valor da venda, custo de fornecedor, brindes e frete de ${deal.title}.`
              : "Valor da venda, custo de fornecedor, brindes e frete."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deal-sale-value">Valor da venda</Label>
            <Input
              id="deal-sale-value"
              type="number"
              min={0}
              step="0.01"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="0,00"
              className="font-mono tabular-nums"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Fornecedor</Label>
            <Select value={supplierId} onValueChange={handleSupplierChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um fornecedor" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Produto</Label>
            <Select value={supplierProductId} onValueChange={handleProductChange} disabled={!supplierId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {productsForSupplier.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deal-supplier-value">Fornecedor</Label>
              <Input
                id="deal-supplier-value"
                type="number"
                min={0}
                step="0.01"
                value={supplierValue}
                onChange={(event) => setSupplierValue(event.target.value)}
                placeholder="0,00"
                className="font-mono tabular-nums"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deal-gift-value">Brindes</Label>
              <Input
                id="deal-gift-value"
                type="number"
                min={0}
                step="0.01"
                value={giftValue}
                onChange={(event) => setGiftValue(event.target.value)}
                placeholder="0,00"
                className="font-mono tabular-nums"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deal-freight-value">Frete</Label>
              <Input
                id="deal-freight-value"
                type="number"
                min={0}
                step="0.01"
                value={freightValue}
                onChange={(event) => setFreightValue(event.target.value)}
                placeholder="0,00"
                className="font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <span className="text-sm text-muted-foreground">Ganho líquido</span>
            <span
              className={cn(
                "font-mono text-sm font-semibold tabular-nums",
                netGain >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {brl(netGain)}
            </span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
