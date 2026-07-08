// SupplierProductDialog — cria um produto novo no catálogo de um fornecedor.
// Só existe em modo de criação: o preço informado vira currentPrice direto,
// sem gerar SupplierPriceChange (o histórico só nasce na 1ª edição de preço,
// ver EditPriceDialog).

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
import { newId, useCrm } from "@/lib/store";
import type { SupplierProduct } from "@/lib/types";

interface SupplierProductDialogProps {
  supplierId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_ERRORS = { name: "", price: "" };

export function SupplierProductDialog({ supplierId, open, onOpenChange }: SupplierProductDialogProps) {
  const { state, dispatch } = useCrm();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState(EMPTY_ERRORS);

  useEffect(() => {
    if (open) {
      setName("");
      setPrice("");
      setErrors(EMPTY_ERRORS);
    }
  }, [open]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!state.session) return;

    const parsedPrice = Number(price);
    const nextErrors = {
      name: name.trim() ? "" : "Informe o nome do produto.",
      price: price.trim() && parsedPrice > 0 ? "" : "Informe um preço inicial maior que zero.",
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.price) return;

    const now = new Date().toISOString();
    const created: SupplierProduct = {
      id: newId("product"),
      tenantId: state.session.tenantId,
      supplierId,
      name: name.trim(),
      currentPrice: parsedPrice,
      updatedAt: now,
      createdAt: now,
    };
    dispatch({ type: "ADD_SUPPLIER_PRODUCT", product: created });
    toast.success(`Produto ${created.name} adicionado.`);

    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo produto</DialogTitle>
          <DialogDescription>Adiciona um produto ao catálogo deste fornecedor.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-name">Nome do produto*</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={!!errors.name}
              placeholder="Nome do produto"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-price">Preço inicial*</Label>
            <Input
              id="product-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              aria-invalid={!!errors.price}
              placeholder="0,00"
              className="font-mono tabular-nums"
            />
            {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Adicionar produto</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
