// SupplierProductDialog — cria ou edita um produto do catálogo de um
// fornecedor via API real. Em modo de criação (product === undefined)
// despacha ADD_SUPPLIER_PRODUCT com a resposta do POST; em modo de edição
// persiste via PATCH e despacha UPDATE_SUPPLIER_PRODUCT com os mesmos
// valores enviados (o reducer já sabe só gravar uma SupplierPriceChange
// local quando o preço muda — mesma regra aplicada no backend). Segue o
// mesmo padrão dual-mode do SupplierFormDialog.

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
import { ApiError, api, mapSupplierProduct } from "@/lib/apiClient";
import { useCrm } from "@/lib/store";
import type { SupplierProduct } from "@/lib/types";

interface SupplierProductDialogProps {
  supplierId: string;
  product?: SupplierProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_ERRORS = { name: "", price: "" };

function valuesFromProduct(product: SupplierProduct | undefined): { name: string; price: string } {
  return {
    name: product?.name ?? "",
    price: product ? String(product.currentPrice) : "",
  };
}

export function SupplierProductDialog({ supplierId, product, open, onOpenChange }: SupplierProductDialogProps) {
  const { dispatch } = useCrm();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!product;

  useEffect(() => {
    if (open) {
      const values = valuesFromProduct(product);
      setName(values.name);
      setPrice(values.price);
      setErrors(EMPTY_ERRORS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const parsedPrice = Number(price);
    const nextErrors = {
      name: name.trim() ? "" : "Informe o nome do produto.",
      price: price.trim() && parsedPrice > 0 ? "" : "Informe um preço maior que zero.",
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.price) return;

    setSubmitting(true);
    try {
      if (isEdit && product) {
        await api.updateSupplierProduct(product.id, { name: name.trim(), current_price: parsedPrice });
        // Mesma regra do backend (app/modules/suppliers/service.py::
        // update_product): só registra uma SupplierPriceChange quando o
        // preço realmente muda — reaproveita a lógica local já existente no
        // reducer em vez de duplicar via um objeto completo da API.
        dispatch({ type: "UPDATE_SUPPLIER_PRODUCT", productId: product.id, name: name.trim(), price: parsedPrice });
        toast.success(`Produto ${name.trim()} atualizado.`);
      } else {
        const created = mapSupplierProduct(
          await api.createSupplierProduct(supplierId, { name: name.trim(), current_price: parsedPrice }),
        );
        dispatch({ type: "ADD_SUPPLIER_PRODUCT", product: created });
        toast.success(`Produto ${created.name} adicionado.`);
      }
      handleOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao salvar produto.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize o nome e o preço deste produto."
              : "Adiciona um produto ao catálogo deste fornecedor."}
          </DialogDescription>
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
            <Label htmlFor="product-price">{isEdit ? "Preço*" : "Preço inicial*"}</Label>
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
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando…" : isEdit ? "Salvar alterações" : "Adicionar produto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
