// EditPriceDialog — edita o preço atual de um produto de fornecedor.
// Dispatcha UPDATE_SUPPLIER_PRODUCT_PRICE, que o reducer usa para atualizar
// currentPrice e registrar a entrada correspondente em supplierPriceChanges
// (consumida por priceHistoryForProduct / PriceHistorySheet).

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

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
import { useCrm } from "@/lib/store";
import type { SupplierProduct } from "@/lib/types";

interface EditPriceDialogProps {
  product: SupplierProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPriceDialog({ product, open, onOpenChange }: EditPriceDialogProps) {
  const { dispatch } = useCrm();

  const [price, setPrice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && product) {
      setPrice(String(product.currentPrice));
      setError("");
    }
  }, [open, product]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!product) return;

    const parsedPrice = Number(price);
    if (!price.trim() || parsedPrice <= 0) {
      setError("Informe um preço maior que zero.");
      return;
    }

    dispatch({ type: "UPDATE_SUPPLIER_PRODUCT_PRICE", productId: product.id, price: parsedPrice });
    toast.success(`Preço de ${product.name} atualizado.`);

    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar preço</DialogTitle>
          <DialogDescription>{product ? `Atualize o preço de ${product.name}.` : ""}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-price">Preço*</Label>
            <Input
              id="edit-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              aria-invalid={!!error}
              placeholder="0,00"
              className="font-mono tabular-nums"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
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
