// QuickDealDialog — cria um negócio rápido a partir do Inbox, para o contato
// da conversa aberta. Produto vem do catálogo de fornecedores (cascata
// fornecedor → produto, mesma UX do EditDealDialog/AddLeadDialog); não cria
// contato (já existe) e por isso é interno a esta task — não é um export
// compartilhado para outras telas.

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ApiError, api, mapDeal } from "@/lib/apiClient";
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
import { PAYMENT_METHOD_LABELS, STAGES } from "@/lib/constants";
import { contactById, tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import type { PaymentMethod, Stage } from "@/lib/types";

interface QuickDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
}

export function QuickDealDialog({ open, onOpenChange, contactId }: QuickDealDialogProps) {
  const { state, dispatch } = useCrm();
  const contact = contactById(state, contactId);
  const { suppliers, supplierProducts } = tenantScope(state);

  const [supplierId, setSupplierId] = useState("");
  const [supplierProductId, setSupplierProductId] = useState("");
  const [value, setValue] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("pix");
  const [stage, setStage] = useState<Stage>("novo_lead");
  const [error, setError] = useState("");

  const productsForSupplier = supplierProducts.filter((p) => p.supplierId === supplierId);

  function reset() {
    setSupplierId("");
    setSupplierProductId("");
    setValue("");
    setPayment("pix");
    setStage("novo_lead");
    setError("");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSupplierChange(nextSupplierId: string) {
    setSupplierId(nextSupplierId);
    setSupplierProductId("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!state.session || !contact) return;

    if (!value || Number(value) <= 0) {
      setError("Informe um valor estimado maior que zero.");
      return;
    }

    const product = supplierProducts.find((p) => p.id === supplierProductId);
    const productLabel = product?.name ?? "Novo negócio";

    try {
      const createdDeal = mapDeal(
        await api.createDeal({
          contact_id: contact.id,
          title: productLabel,
          products: productLabel,
          value: Number(value),
          payment,
          trade_in: false,
          owner_id: contact.ownerId,
        }),
      );
      dispatch({ type: "ADD_DEAL", deal: createdDeal });

      if (stage !== "novo_lead") {
        const moved = await api.moveDeal(createdDeal.id, stage);
        dispatch({ type: "UPDATE_DEAL", deal: mapDeal(moved) });
      }
      if (product) {
        try {
          const withFinancials = await api.updateDealFinancials(createdDeal.id, {
            supplier_product_id: product.id,
            supplier_value: product.currentPrice,
            gift_value: 0,
            freight_value: 0,
          });
          dispatch({ type: "UPDATE_DEAL", deal: mapDeal(withFinancials) });
        } catch (financialsError) {
          toast.error(
            financialsError instanceof ApiError
              ? `Negócio criado, mas o custo do fornecedor não foi salvo: ${financialsError.message}`
              : "Negócio criado, mas o custo do fornecedor não foi salvo.",
          );
        }
      }
      // Fire-and-forget: só um registro informativo no histórico do
      // cliente, ninguém lê state.activities pra renderizar nada.
      void api.createActivity({
        contact_id: contact.id,
        deal_id: createdDeal.id,
        type: "mudanca_estagio",
        description: `Negócio criado pelo Inbox: ${productLabel}.`,
      });
      toast.success(`Negócio criado para ${contact.name}.`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Erro ao criar negócio.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo negócio</DialogTitle>
          <DialogDescription>
            {contact ? `Cria um negócio em aberto para ${contact.name}.` : "Cria um negócio em aberto."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Fornecedor</Label>
              <Select value={supplierId} onValueChange={handleSupplierChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione" />
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
              <Select value={supplierProductId} onValueChange={setSupplierProductId} disabled={!supplierId}>
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
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deal-value">Valor estimado*</Label>
            <Input
              id="deal-value"
              type="number"
              min={0}
              step="0.01"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="0,00"
              aria-invalid={!!error}
            />
          </div>
          {error && <p className="-mt-2 text-xs text-destructive">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Forma de pagamento</Label>
              <Select value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Estágio inicial</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Criar negócio</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
