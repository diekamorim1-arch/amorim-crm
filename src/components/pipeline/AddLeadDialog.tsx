// Dialog de quick-add de lead — valida nome e WhatsApp (obrigatórios) e delega
// a criação de Contact + Deal + Activity para quem consome o onSubmit.

import { useState, type FormEvent } from "react";

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
import { ORIGIN_LABELS } from "@/lib/constants";
import { tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import type { Origin, User } from "@/lib/types";

export interface AddLeadFormValues {
  name: string;
  whatsapp: string;
  origin: Origin;
  supplierProductId?: string;
  supplierProductName?: string;
  supplierValue?: number;
  value: number;
  ownerId: string;
}

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
  defaultOwnerId: string;
  onSubmit: (values: AddLeadFormValues) => void;
}

const EMPTY_ERRORS = { name: "", whatsapp: "" };

export function AddLeadDialog({ open, onOpenChange, users, defaultOwnerId, onSubmit }: AddLeadDialogProps) {
  const { state } = useCrm();
  const { suppliers, supplierProducts } = tenantScope(state);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [origin, setOrigin] = useState<Origin>("whatsapp_direto");
  const [supplierId, setSupplierId] = useState("");
  const [supplierProductId, setSupplierProductId] = useState("");
  const [value, setValue] = useState("");
  const [ownerId, setOwnerId] = useState(defaultOwnerId);
  const [errors, setErrors] = useState(EMPTY_ERRORS);

  const productsForSupplier = supplierProducts.filter((p) => p.supplierId === supplierId);

  function reset() {
    setName("");
    setWhatsapp("");
    setOrigin("whatsapp_direto");
    setSupplierId("");
    setSupplierProductId("");
    setValue("");
    setOwnerId(defaultOwnerId);
    setErrors(EMPTY_ERRORS);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSupplierChange(nextSupplierId: string) {
    setSupplierId(nextSupplierId);
    // Fornecedor mudou: o produto selecionado antes pertencia a outro
    // fornecedor, então não deve permanecer selecionado.
    setSupplierProductId("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const nextErrors = {
      name: name.trim() ? "" : "Informe o nome do cliente.",
      whatsapp: whatsapp.trim() ? "" : "Informe o WhatsApp do cliente.",
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.whatsapp) return;

    const product = supplierProducts.find((p) => p.id === supplierProductId);

    onSubmit({
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      origin,
      supplierProductId: product?.id,
      supplierProductName: product?.name,
      supplierValue: product?.currentPrice,
      value: Number(value) || 0,
      ownerId: ownerId || defaultOwnerId,
    });
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo lead</DialogTitle>
          <DialogDescription>Cria um contato e um negócio em Novo Lead.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-name">Nome*</Label>
            <Input
              id="lead-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={!!errors.name}
              placeholder="Nome do cliente"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lead-whatsapp">WhatsApp*</Label>
            <Input
              id="lead-whatsapp"
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              aria-invalid={!!errors.whatsapp}
              placeholder="+55 11 90000-0000"
            />
            {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Origem</Label>
            <Select value={origin} onValueChange={(v) => setOrigin(v as Origin)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ORIGIN_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              <Label>Produto de interesse</Label>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lead-value">Valor estimado</Label>
              <Input
                id="lead-value"
                type="number"
                min={0}
                step="0.01"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="0,00"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Responsável</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
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
            <Button type="submit">Criar lead</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
