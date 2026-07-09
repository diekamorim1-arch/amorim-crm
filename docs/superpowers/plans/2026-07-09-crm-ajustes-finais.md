# Ajustes Finais do CRM (Leva 1.2) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar as 5 melhorias de frontend aprovadas em `docs/superpowers/specs/2026-07-09-crm-ajustes-finais-design.md`: editar produto de fornecedor, editar valor da venda, duplo-clique para editar (Pipeline/Fornecedores), aba de anexos/comprovantes na ficha do cliente, e catálogo de fornecedores nos dialogs de criação de lead/negócio.

**Architecture:** Todas as mudanças são no frontend `amorim-crm` (React 19 + TypeScript + Vite), sobre a base de store/reducer + localStorage já existente. Task 1 estende o modelo de dados (tipo `Attachment`, novas actions do reducer) — pré-requisito de todas as demais. Tasks 2-5 são independentes entre si e consomem o que a Task 1 produziu. Task 6 é a verificação final ponta a ponta.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui, Vitest, react-router, sonner (toast), lucide-react.

## Global Constraints

- 100% frontend — nenhuma mudança no backend `amorim-crm-backend`.
- Seguir o padrão dual-mode já estabelecido em `SupplierFormDialog.tsx` para `SupplierProductDialog.tsx` (prop opcional, `isEdit = !!entity`, `useEffect` com deps `[open, entity?.id]`).
- Anexos: base64 em `localStorage`, limite de **5MB por arquivo** validado antes da leitura via `FileReader`.
- Nenhum botão novo é adicionado para editar produto de fornecedor — só duplo-clique (decisão já aprovada no spec).
- Upload de anexo não tem seletor de negócio — `dealId` fica sempre `undefined`.
- `contact.interests` fica como array vazio ao criar lead via `AddLeadDialog` (não mapeamos produto de fornecedor → `ProductLine`).
- Rodar `npm test` (vitest run) após qualquer mudança em `lib/store.tsx`, `lib/selectors.ts` ou `lib/seed.ts` — todos os testes existentes devem continuar passando.
- Rodar `npm run build` (typecheck) após cada task para garantir que nenhum consumidor ficou com tipos quebrados.
- Commitar ao final de cada task.

---

## Task 1: Modelo de dados — `Attachment`, novas actions do reducer, seed e selectors

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/store.tsx`
- Modify: `src/lib/selectors.ts`
- Modify: `src/lib/seed.ts`
- Test: `src/lib/store.test.ts`

**Interfaces:**
- Produces: `Attachment` interface (`id, tenantId, contactId, dealId?, fileName, fileType, dataUrl, uploadedBy, uploadedAt`); `CrmState.attachments: Attachment[]`; actions `ADD_ATTACHMENT { attachment }`, `REMOVE_ATTACHMENT { attachmentId }`, `UPDATE_SUPPLIER_PRODUCT { productId, name, price }`; `UPDATE_DEAL_FINANCIALS` payload estendido com `value: number`; `tenantScope(state).attachments: Attachment[]`.
- Consumes: nada de tasks anteriores (esta é a base).

- [ ] **Step 1: Adicionar o tipo `Attachment` e `attachments` ao `CrmState` em `src/lib/types.ts`**

Em `src/lib/types.ts`, adicionar a interface `Attachment` logo após `WhatsAppConnection` (antes de `Session`):

```ts
export interface Attachment {
  id: string;
  tenantId: string;
  contactId: string;
  dealId?: string;
  fileName: string;
  fileType: string;
  dataUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}
```

E adicionar `attachments: Attachment[];` a `CrmState` (após `supplierPriceChanges`):

```ts
export interface CrmState {
  tenants: Tenant[];
  users: User[];
  contacts: Contact[];
  deals: Deal[];
  conversations: Conversation[];
  messages: Message[];
  appointments: Appointment[];
  activities: Activity[];
  connections: WhatsAppConnection[];
  suppliers: Supplier[];
  supplierProducts: SupplierProduct[];
  supplierPriceChanges: SupplierPriceChange[];
  attachments: Attachment[];
  session: Session | null;
}
```

- [ ] **Step 2: Escrever os testes que falham para as novas actions em `src/lib/store.test.ts`**

Adicionar `Attachment` ao import de tipos (linha 6):

```ts
import type { Attachment, Contact, Conversation, CrmState, Deal, Supplier, SupplierPriceChange, SupplierProduct, Tenant, User } from "./types";
```

Em `baseState()`, adicionar `attachments: []` ao objeto retornado (logo após `supplierPriceChanges: []`, antes de `session`):

```ts
  return {
    tenants: [tenant],
    users: [owner],
    contacts: [contact],
    deals: [deal],
    conversations: [conversation],
    messages: [],
    appointments: [],
    activities: [],
    connections: [],
    suppliers: [],
    supplierProducts: [],
    supplierPriceChanges: [],
    attachments: [],
    session: { userId: owner.id, tenantId: tenant.id, role: "atendente" },
  };
```

Substituir o teste `"UPDATE_DEAL_FINANCIALS seta supplierProductId/supplierValue/giftValue sem mexer no estágio"` (dentro de `describe("crmReducer — fornecedores e custos", ...)`, por volta da linha 324) por esta versão, que também cobre `value`:

```ts
  it("UPDATE_DEAL_FINANCIALS seta value/supplierProductId/supplierValue/giftValue sem mexer no estágio", () => {
    const { state, product } = stateWithSupplier();
    const dealId = state.deals[0].id;
    const originalStage = state.deals[0].stage;

    const next = crmReducer(state, {
      type: "UPDATE_DEAL_FINANCIALS",
      dealId,
      value: 5200,
      supplierProductId: product.id,
      supplierValue: 3800,
      giftValue: 150,
    });

    const updated = next.deals.find((d) => d.id === dealId);
    expect(updated?.value).toBe(5200);
    expect(updated?.supplierProductId).toBe(product.id);
    expect(updated?.supplierValue).toBe(3800);
    expect(updated?.giftValue).toBe(150);
    expect(updated?.stage).toBe(originalStage);
  });

  it("UPDATE_SUPPLIER_PRODUCT atualiza o nome sem mexer no preço quando o preço não muda", () => {
    const { state, product } = stateWithSupplier();
    const next = crmReducer(state, {
      type: "UPDATE_SUPPLIER_PRODUCT",
      productId: product.id,
      name: "iPhone 15 128GB (Azul)",
      price: product.currentPrice,
    });

    const updated = next.supplierProducts.find((p) => p.id === product.id);
    expect(updated?.name).toBe("iPhone 15 128GB (Azul)");
    expect(updated?.currentPrice).toBe(product.currentPrice);
    expect(updated?.updatedAt).toBe(product.updatedAt);
    expect(next.supplierPriceChanges).toHaveLength(0);
  });

  it("UPDATE_SUPPLIER_PRODUCT cria uma SupplierPriceChange quando o preço muda", () => {
    const { state, product } = stateWithSupplier();
    const next = crmReducer(state, {
      type: "UPDATE_SUPPLIER_PRODUCT",
      productId: product.id,
      name: product.name,
      price: 4100,
    });

    const updated = next.supplierProducts.find((p) => p.id === product.id);
    expect(updated?.currentPrice).toBe(4100);
    expect(updated?.updatedAt).not.toBe(product.updatedAt);
    expect(next.supplierPriceChanges).toHaveLength(1);
    expect(next.supplierPriceChanges[0]).toMatchObject({ supplierProductId: product.id, price: 4100 });
  });
```

Adicionar um novo `describe` para anexos, logo após o fechamento do `describe("crmReducer — fornecedores e custos", ...)` (após a chave `});` da linha ~343):

```ts
describe("crmReducer — anexos", () => {
  it("ADD_ATTACHMENT adiciona um anexo", () => {
    const base = baseState();
    const attachment: Attachment = {
      id: "attachment_1",
      tenantId: base.tenants[0].id,
      contactId: base.contacts[0].id,
      fileName: "comprovante.png",
      fileType: "image/png",
      dataUrl: "data:image/png;base64,AAAA",
      uploadedBy: base.users[0].id,
      uploadedAt: new Date().toISOString(),
    };
    const next = crmReducer(base, { type: "ADD_ATTACHMENT", attachment });
    expect(next.attachments).toContainEqual(attachment);
  });

  it("REMOVE_ATTACHMENT remove o anexo pelo id", () => {
    const base = baseState();
    const attachment: Attachment = {
      id: "attachment_1",
      tenantId: base.tenants[0].id,
      contactId: base.contacts[0].id,
      fileName: "comprovante.png",
      fileType: "image/png",
      dataUrl: "data:image/png;base64,AAAA",
      uploadedBy: base.users[0].id,
      uploadedAt: new Date().toISOString(),
    };
    const withAttachment = { ...base, attachments: [attachment] };
    const next = crmReducer(withAttachment, { type: "REMOVE_ATTACHMENT", attachmentId: attachment.id });
    expect(next.attachments).toHaveLength(0);
  });
});
```

Por fim, no `describe("isValidPersistedState — migração de localStorage legado", ...)`, atualizar o teste `"aceita um estado que tem todas as coleções novas como arrays (mesmo vazios)"` para incluir `attachments: []`:

```ts
  it("aceita um estado que tem todas as coleções novas como arrays (mesmo vazios)", () => {
    const upToDateState = {
      tenants: [],
      users: [],
      contacts: [],
      deals: [],
      conversations: [],
      messages: [],
      appointments: [],
      activities: [],
      connections: [],
      session: null,
      suppliers: [],
      supplierProducts: [],
      supplierPriceChanges: [],
      attachments: [],
    };

    expect(isValidPersistedState(upToDateState)).toBe(true);
  });
```

E adicionar um novo teste logo abaixo dele, cobrindo o blob salvo entre a Leva 1.1 e a Leva 1.2 (tem fornecedores, mas não tem `attachments`):

```ts
  it("rejeita um estado pós-fornecedores (Leva 1.1) que ainda não tem attachments (Leva 1.2)", () => {
    const preAttachmentsState = {
      tenants: [],
      users: [],
      contacts: [],
      deals: [],
      conversations: [],
      messages: [],
      appointments: [],
      activities: [],
      connections: [],
      suppliers: [],
      supplierProducts: [],
      supplierPriceChanges: [],
      session: null,
      // sem attachments
    };

    expect(isValidPersistedState(preAttachmentsState)).toBe(false);
  });
```

- [ ] **Step 2b: Rodar os testes para confirmar que falham**

Run: `npm test`
Expected: FAIL — erros de tipo (`UPDATE_SUPPLIER_PRODUCT`/`value` em `UPDATE_DEAL_FINANCIALS` não existem na union `CrmAction`) e/ou testes de `ADD_ATTACHMENT`/`REMOVE_ATTACHMENT` falhando por action desconhecida.

- [ ] **Step 3: Implementar as novas actions em `src/lib/store.tsx`**

Adicionar `Attachment` ao import de tipos (linha 13-29):

```ts
import type {
  Activity,
  Appointment,
  Attachment,
  Contact,
  ConnectionStatus,
  Conversation,
  CrmState,
  Deal,
  LossReason,
  Message,
  Stage,
  Supplier,
  SupplierPriceChange,
  SupplierProduct,
  Tenant,
  User,
} from "./types";
```

Estender a união `CrmAction` (substituir as duas últimas linhas antes de `RESET_DEMO`):

```ts
  | { type: "ADD_SUPPLIER_PRODUCT"; product: SupplierProduct }
  | { type: "UPDATE_SUPPLIER_PRODUCT_PRICE"; productId: string; price: number }
  | { type: "UPDATE_SUPPLIER_PRODUCT"; productId: string; name: string; price: number }
  | { type: "UPDATE_DEAL_FINANCIALS"; dealId: string; value: number; supplierProductId?: string; supplierValue: number; giftValue: number }
  | { type: "ADD_ATTACHMENT"; attachment: Attachment }
  | { type: "REMOVE_ATTACHMENT"; attachmentId: string }
  | { type: "RESET_DEMO" };
```

Substituir o case `UPDATE_DEAL_FINANCIALS` existente (por volta da linha 330) para persistir `value`:

```ts
    case "UPDATE_DEAL_FINANCIALS": {
      const deal = state.deals.find((d) => d.id === action.dealId);
      if (!deal) return state;
      const deals = state.deals.map((d) =>
        d.id === action.dealId
          ? {
              ...d,
              value: action.value,
              supplierProductId: action.supplierProductId,
              supplierValue: action.supplierValue,
              giftValue: action.giftValue,
            }
          : d,
      );
      return { ...state, deals };
    }
```

Adicionar o case `UPDATE_SUPPLIER_PRODUCT` logo depois do case `UPDATE_SUPPLIER_PRODUCT_PRICE` existente:

```ts
    case "UPDATE_SUPPLIER_PRODUCT": {
      const product = state.supplierProducts.find((p) => p.id === action.productId);
      if (!product) return state;
      const priceChanged = action.price !== product.currentPrice;
      const now = new Date().toISOString();

      const supplierProducts = state.supplierProducts.map((p) =>
        p.id === product.id
          ? { ...p, name: action.name, currentPrice: action.price, updatedAt: priceChanged ? now : p.updatedAt }
          : p,
      );

      if (!priceChanged) {
        return { ...state, supplierProducts };
      }

      const priceChange: SupplierPriceChange = {
        id: newId("pricechg"),
        tenantId: product.tenantId,
        supplierProductId: product.id,
        price: action.price,
        changedAt: now,
      };

      return { ...state, supplierProducts, supplierPriceChanges: [...state.supplierPriceChanges, priceChange] };
    }
```

Adicionar os cases `ADD_ATTACHMENT`/`REMOVE_ATTACHMENT` logo antes do case `RESET_DEMO`:

```ts
    case "ADD_ATTACHMENT": {
      return { ...state, attachments: [...state.attachments, action.attachment] };
    }

    case "REMOVE_ATTACHMENT": {
      return { ...state, attachments: state.attachments.filter((a) => a.id !== action.attachmentId) };
    }
```

Atualizar `isValidPersistedState` para exigir `attachments` como array:

```ts
export function isValidPersistedState(parsed: unknown): parsed is CrmState {
  if (!parsed || typeof parsed !== "object") return false;
  const candidate = parsed as Partial<CrmState>;
  return (
    Array.isArray(candidate.tenants) &&
    Array.isArray(candidate.suppliers) &&
    Array.isArray(candidate.supplierProducts) &&
    Array.isArray(candidate.supplierPriceChanges) &&
    Array.isArray(candidate.attachments)
  );
}
```

- [ ] **Step 4: Adicionar `attachments` ao `tenantScope` em `src/lib/selectors.ts`**

Adicionar `Attachment` ao import de tipos (linha 2-18):

```ts
import type {
  Activity,
  Appointment,
  Attachment,
  Contact,
  Conversation,
  CrmState,
  Deal,
  LossReason,
  Message,
  Origin,
  Stage,
  Supplier,
  SupplierPriceChange,
  SupplierProduct,
  User,
  WhatsAppConnection,
} from "./types";
```

Adicionar `attachments: Attachment[];` ao tipo de retorno de `tenantScope`:

```ts
export function tenantScope(state: CrmState): {
  contacts: Contact[];
  deals: Deal[];
  conversations: Conversation[];
  messages: Message[];
  appointments: Appointment[];
  activities: Activity[];
  connections: WhatsAppConnection[];
  users: User[];
  suppliers: Supplier[];
  supplierProducts: SupplierProduct[];
  supplierPriceChanges: SupplierPriceChange[];
  attachments: Attachment[];
} {
```

Adicionar `attachments: [],` ao branch vazio (sem sessão):

```ts
  const tenantId = state.session?.tenantId;
  if (!tenantId) {
    return {
      contacts: [],
      deals: [],
      conversations: [],
      messages: [],
      appointments: [],
      activities: [],
      connections: [],
      users: [],
      suppliers: [],
      supplierProducts: [],
      supplierPriceChanges: [],
      attachments: [],
    };
  }
```

Adicionar a linha filtrada ao branch com sessão:

```ts
  return {
    contacts: state.contacts.filter((c) => c.tenantId === tenantId),
    deals: state.deals.filter((d) => d.tenantId === tenantId),
    conversations: state.conversations.filter((c) => c.tenantId === tenantId),
    messages: state.messages.filter((m) => m.tenantId === tenantId),
    appointments: state.appointments.filter((a) => a.tenantId === tenantId),
    activities: state.activities.filter((a) => a.tenantId === tenantId),
    connections: state.connections.filter((c) => c.tenantId === tenantId),
    users: state.users.filter((u) => u.tenantId === tenantId),
    suppliers: state.suppliers.filter((s) => s.tenantId === tenantId),
    supplierProducts: state.supplierProducts.filter((p) => p.tenantId === tenantId),
    supplierPriceChanges: state.supplierPriceChanges.filter((p) => p.tenantId === tenantId),
    attachments: state.attachments.filter((a) => a.tenantId === tenantId),
  };
```

- [ ] **Step 5: Adicionar `attachments: []` ao seed em `src/lib/seed.ts`**

No `return` final de `buildSeed()` (por volta da linha 1518), adicionar `attachments: []` logo antes de `session: null`:

```ts
  return {
    tenants: [tenant1, tenant2],
    users: [users.rafael, users.juliana, users.samuel, users.marcos, users.ana, users.diego],
    contacts: [...tenant1Contacts.all, ...tenant2Data.contacts],
    deals: [...tenant1Deals.all, ...tenant2Data.deals],
    conversations: [...tenant1Conversations.all, ...tenant2Data.conversations],
    messages: [...tenant1Conversations.messages, ...tenant2Data.messages],
    appointments: [...tenant1Appointments, ...tenant2Data.appointments],
    activities: [...tenant1Activities, ...tenant2Data.activities],
    connections: tenant1Connections,
    suppliers: tenant1Suppliers.suppliers,
    supplierProducts: tenant1Suppliers.supplierProducts,
    supplierPriceChanges: tenant1Suppliers.supplierPriceChanges,
    attachments: [],
    session: null,
  };
}
```

- [ ] **Step 6: Rodar os testes e o build para confirmar que passam**

Run: `npm test`
Expected: PASS — todos os testes de `store.test.ts`, incluindo os novos.

Run: `npm run build`
Expected: sem erros de tipo.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/store.tsx src/lib/selectors.ts src/lib/seed.ts src/lib/store.test.ts
git commit -m "feat: adiciona modelo de Attachment e novas actions do reducer (produto de fornecedor, valor da venda, anexos)"
```

---

## Task 2: `SupplierProductDialog` dual-mode + duplo-clique em Fornecedores

**Files:**
- Modify: `src/components/suppliers/SupplierProductDialog.tsx`
- Modify: `src/pages/SupplierDetailPage.tsx`
- Modify: `src/pages/SuppliersPage.tsx`

**Interfaces:**
- Consumes: action `UPDATE_SUPPLIER_PRODUCT { productId, name, price }` (Task 1).
- Produces: `SupplierProductDialogProps.product?: SupplierProduct` (dual-mode, mesmo padrão de `SupplierFormDialogProps.supplier?`).

- [ ] **Step 1: Converter `SupplierProductDialog` para dual-mode**

Substituir o conteúdo completo de `src/components/suppliers/SupplierProductDialog.tsx`:

```tsx
// SupplierProductDialog — cria ou edita um produto do catálogo de um
// fornecedor. Em modo de criação (product === undefined) despacha
// ADD_SUPPLIER_PRODUCT; em modo de edição despacha UPDATE_SUPPLIER_PRODUCT,
// que só gera uma SupplierPriceChange quando o preço realmente muda. Segue o
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
import { newId, useCrm } from "@/lib/store";
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
  const { state, dispatch } = useCrm();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState(EMPTY_ERRORS);

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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!state.session) return;

    const parsedPrice = Number(price);
    const nextErrors = {
      name: name.trim() ? "" : "Informe o nome do produto.",
      price: price.trim() && parsedPrice > 0 ? "" : "Informe um preço maior que zero.",
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.price) return;

    if (isEdit && product) {
      dispatch({ type: "UPDATE_SUPPLIER_PRODUCT", productId: product.id, name: name.trim(), price: parsedPrice });
      toast.success(`Produto ${name.trim()} atualizado.`);
    } else {
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
    }

    handleOpenChange(false);
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
            <Button type="submit">{isEdit ? "Salvar alterações" : "Adicionar produto"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Duplo-clique na linha de produto em `SupplierDetailPage.tsx`**

Em `src/pages/SupplierDetailPage.tsx`, adicionar um novo estado `editProduct` (após a linha `const [historyProduct, setHistoryProduct] = useState<SupplierProduct | null>(null);`):

```tsx
  const [editOpen, setEditOpen] = useState(false);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<SupplierProduct | null>(null);
  const [priceProduct, setPriceProduct] = useState<SupplierProduct | null>(null);
  const [historyProduct, setHistoryProduct] = useState<SupplierProduct | null>(null);
```

Adicionar `onDoubleClick` na div da linha do produto (substituir a abertura da div do `.map`):

```tsx
            {products.map((product) => (
              <div
                key={product.id}
                onDoubleClick={() => setEditProduct(product)}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
              >
```

Adicionar uma segunda instância de `SupplierProductDialog` para o modo de edição, logo após a instância de criação já existente:

```tsx
      <SupplierFormDialog supplier={supplier} open={editOpen} onOpenChange={setEditOpen} />
      <SupplierProductDialog supplierId={supplier.id} open={newProductOpen} onOpenChange={setNewProductOpen} />
      <SupplierProductDialog
        supplierId={supplier.id}
        product={editProduct ?? undefined}
        open={!!editProduct}
        onOpenChange={(o) => !o && setEditProduct(null)}
      />
      <EditPriceDialog product={priceProduct} open={!!priceProduct} onOpenChange={(o) => !o && setPriceProduct(null)} />
```

- [ ] **Step 3: Duplo-clique no card do fornecedor em `SuppliersPage.tsx`**

Em `src/pages/SuppliersPage.tsx`, adicionar um novo estado `editSupplier` (após `const [createOpen, setCreateOpen] = useState(false);`):

```tsx
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
```

Adicionar `onDoubleClick` ao `<Card>` (mantendo o `onClick` de navegação já existente):

```tsx
            <Card
              key={supplier.id}
              role="button"
              tabIndex={0}
              onClick={() => openSupplier(supplier)}
              onDoubleClick={() => setEditSupplier(supplier)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openSupplier(supplier);
                }
              }}
              className="cursor-pointer rounded-xl transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
```

Adicionar uma segunda instância de `SupplierFormDialog` para edição, logo após a instância de criação já existente:

```tsx
      <SupplierFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <SupplierFormDialog
        supplier={editSupplier ?? undefined}
        open={!!editSupplier}
        onOpenChange={(o) => !o && setEditSupplier(null)}
      />
```

- [ ] **Step 4: Verificar tipos e testes**

Run: `npm run build`
Expected: sem erros de tipo.

Run: `npm test`
Expected: PASS (nenhum teste destas páginas, mas o reducer continua íntegro).

- [ ] **Step 5: Commit**

```bash
git add src/components/suppliers/SupplierProductDialog.tsx src/pages/SupplierDetailPage.tsx src/pages/SuppliersPage.tsx
git commit -m "feat: edita produto de fornecedor e fornecedor via duplo-clique"
```

---

## Task 3: Valor da venda no `EditDealDialog` + duplo-clique no `DealCard`

**Files:**
- Modify: `src/components/pipeline/EditDealDialog.tsx`
- Modify: `src/components/pipeline/DealCard.tsx`

**Interfaces:**
- Consumes: action `UPDATE_DEAL_FINANCIALS` com `value: number` (Task 1); prop existente `onEditDeal?: (deal: Deal) => void` de `DealCardProps` (já usada pelo menu "⋮", inalterada).
- Produces: nenhuma interface nova consumida por outras tasks.

- [ ] **Step 1: Adicionar o campo "Valor da venda" ao `EditDealDialog`**

Substituir o conteúdo completo de `src/components/pipeline/EditDealDialog.tsx`:

```tsx
// EditDealDialog — edita o valor da venda, o custo de fornecedor e o valor de
// brindes de um negócio, exibindo o ganho líquido recalculado ao vivo.
// Compartilhado entre o Pipeline (menu do card e duplo-clique) e a ficha do
// cliente (aba Negócios); só é renderizado com onEditDeal presente nos dois
// pais, que decidem a visibilidade (gestor) — este componente não checa role
// nenhuma.

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
  const { state, dispatch } = useCrm();
  const { suppliers, supplierProducts } = tenantScope(state);

  const [value, setValue] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [supplierProductId, setSupplierProductId] = useState("");
  const [supplierValue, setSupplierValue] = useState("");
  const [giftValue, setGiftValue] = useState("");

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
  const netGain = parsedValue - parsedSupplierValue - parsedGiftValue;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!deal) return;

    dispatch({
      type: "UPDATE_DEAL_FINANCIALS",
      dealId: deal.id,
      value: parsedValue,
      supplierProductId: supplierProductId || undefined,
      supplierValue: parsedSupplierValue,
      giftValue: parsedGiftValue,
    });
    toast.success(`Negócio ${deal.title} atualizado.`);

    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar negócio</DialogTitle>
          <DialogDescription>
            {deal
              ? `Valor da venda, custo de fornecedor e brindes de ${deal.title}.`
              : "Valor da venda, custo de fornecedor e brindes."}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deal-supplier-value">Valor do fornecedor</Label>
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
              <Label htmlFor="deal-gift-value">Valor dos brindes</Label>
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
```

- [ ] **Step 2: Duplo-clique no `DealCard`**

Em `src/components/pipeline/DealCard.tsx`, adicionar `onDoubleClick` à div raiz (o `draggable`/`onDragStart` do HTML5 DnD não impede `onDoubleClick` de disparar):

```tsx
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", deal.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onDoubleClick={() => onEditDeal?.(deal)}
      className="flex cursor-grab flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm transition-colors active:cursor-grabbing hover:border-primary/40"
    >
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run build`
Expected: sem erros de tipo.

- [ ] **Step 4: Commit**

```bash
git add src/components/pipeline/EditDealDialog.tsx src/components/pipeline/DealCard.tsx
git commit -m "feat: edita valor da venda no negócio e adiciona duplo-clique no card do Pipeline"
```

---

## Task 4: Aba "Comprovantes" na ficha do cliente

**Files:**
- Create: `src/components/contacts/AttachmentsTab.tsx`
- Modify: `src/pages/ContactDetailPage.tsx`

**Interfaces:**
- Consumes: `Attachment` type, actions `ADD_ATTACHMENT`/`REMOVE_ATTACHMENT`, `tenantScope(state).attachments` (Task 1).
- Produces: `AttachmentsTab({ contactId: string })` — componente usado só por `ContactDetailPage`.

- [ ] **Step 1: Criar `AttachmentsTab.tsx`**

```tsx
// AttachmentsTab — aba "Comprovantes" da ficha do cliente: upload de
// imagem/PDF convertido para base64 (persistido no localStorage via
// ADD_ATTACHMENT) e lista dos anexos já enviados, com remoção. Sem seletor de
// negócio: dealId fica sempre undefined neste momento (campo existe no tipo
// para uso futuro).

import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { FileText, Paperclip, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/format";
import { tenantScope } from "@/lib/selectors";
import { newId, useCrm } from "@/lib/store";
import type { Attachment } from "@/lib/types";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface AttachmentsTabProps {
  contactId: string;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AttachmentsTab({ contactId }: AttachmentsTabProps) {
  const { state, dispatch } = useCrm();
  const { attachments, users } = tenantScope(state);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const contactAttachments = attachments
    .filter((a) => a.contactId === contactId)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  function uploaderName(userId: string): string {
    return users.find((u) => u.id === userId)?.name ?? "—";
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !state.session) return;

    if (file.size > MAX_FILE_BYTES) {
      setError("Arquivo maior que 5MB. Escolha um arquivo menor.");
      return;
    }
    setError("");

    const dataUrl = await readAsDataUrl(file);
    const attachment: Attachment = {
      id: newId("attachment"),
      tenantId: state.session.tenantId,
      contactId,
      fileName: file.name,
      fileType: file.type,
      dataUrl,
      uploadedBy: state.session.userId,
      uploadedAt: new Date().toISOString(),
    };
    dispatch({ type: "ADD_ATTACHMENT", attachment });
    toast.success(`Comprovante ${file.name} anexado.`);
  }

  function handleRemove(attachment: Attachment) {
    dispatch({ type: "REMOVE_ATTACHMENT", attachmentId: attachment.id });
    toast.success(`Comprovante ${attachment.fileName} removido.`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileSelected} />
        <Button type="button" variant="outline" className="w-fit" onClick={() => inputRef.current?.click()}>
          <Paperclip />
          Anexar comprovante
        </Button>
        <p className="text-xs text-muted-foreground">Imagens ou PDF, até 5MB por arquivo.</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {contactAttachments.length === 0 ? (
        <EmptyState icon={Paperclip} title="Nenhum comprovante anexado ainda" />
      ) : (
        <div className="flex flex-col gap-2">
          {contactAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                {attachment.fileType.startsWith("image/") ? (
                  <img
                    src={attachment.dataUrl}
                    alt={attachment.fileName}
                    className="size-10 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <FileText className="size-10 shrink-0 text-muted-foreground" />
                )}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-foreground">{attachment.fileName}</span>
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(attachment.uploadedAt)} · {uploaderName(attachment.uploadedBy)}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon-xs" aria-label="Remover comprovante" onClick={() => handleRemove(attachment)}>
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Adicionar a aba "Comprovantes" em `ContactDetailPage.tsx`**

Adicionar o import (após o import de `EditDealDialog`):

```tsx
import { AttachmentsTab } from "@/components/contacts/AttachmentsTab";
```

Adicionar o `TabsTrigger` (após o de "timeline"):

```tsx
          <TabsTrigger value="timeline" className="flex-none">
            Timeline
          </TabsTrigger>
          <TabsTrigger value="comprovantes" className="flex-none">
            Comprovantes
          </TabsTrigger>
        </TabsList>
```

Adicionar o `TabsContent` (após o de "timeline", antes do fechamento de `</Tabs>`):

```tsx
        <TabsContent value="timeline" className="mt-4">
          <ActivityTimeline contactId={contact.id} />
        </TabsContent>

        <TabsContent value="comprovantes" className="mt-4">
          <AttachmentsTab contactId={contact.id} />
        </TabsContent>
      </Tabs>
```

- [ ] **Step 3: Verificar tipos**

Run: `npm run build`
Expected: sem erros de tipo.

- [ ] **Step 4: Commit**

```bash
git add src/components/contacts/AttachmentsTab.tsx src/pages/ContactDetailPage.tsx
git commit -m "feat: adiciona aba de comprovantes (anexos) na ficha do cliente"
```

---

## Task 5: Catálogo de fornecedores em `AddLeadDialog` e `QuickDealDialog`

**Files:**
- Modify: `src/components/pipeline/AddLeadDialog.tsx`
- Modify: `src/pages/PipelinePage.tsx`
- Modify: `src/components/inbox/QuickDealDialog.tsx`

**Interfaces:**
- Consumes: `tenantScope(state).suppliers`/`supplierProducts` (já existentes desde a Leva 1.1).
- Produces: `AddLeadFormValues` estendido com `supplierProductId?`, `supplierProductName?`, `supplierValue?` (substituindo `productLine?`) — consumido por `PipelinePage.handleCreateLead`.

- [ ] **Step 1: Substituir o `Select` de produto por cascata fornecedor→produto em `AddLeadDialog.tsx`**

Substituir o conteúdo completo de `src/components/pipeline/AddLeadDialog.tsx`:

```tsx
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
```

- [ ] **Step 2: Atualizar `PipelinePage.handleCreateLead` para consumir os novos campos**

Em `src/pages/PipelinePage.tsx`, remover `PRODUCT_LINE_LABELS` do import de constants (não é mais usado nesta página):

```tsx
import { STAGES } from "@/lib/constants";
```

Substituir a função `handleCreateLead` inteira:

```tsx
  function handleCreateLead(values: AddLeadFormValues) {
    if (!state.session) return;
    const tenantId = state.session.tenantId;
    const now = new Date().toISOString();
    const contactId = newId("contact");
    const dealId = newId("deal");
    const productLabel = values.supplierProductName ?? "Novo negócio";

    const contact: Contact = {
      id: contactId,
      tenantId,
      name: values.name,
      whatsapp: values.whatsapp,
      origin: values.origin,
      interests: [],
      tags: [],
      journeyStatus: "lead",
      ownerId: values.ownerId,
      firstContactAt: now,
      lastInteractionAt: now,
      createdAt: now,
    };

    const deal: Deal = {
      id: dealId,
      tenantId,
      contactId,
      title: productLabel,
      products: productLabel,
      value: values.value,
      payment: "pix",
      tradeIn: false,
      stage: "novo_lead",
      outcome: "aberto",
      ownerId: values.ownerId,
      stageChangedAt: now,
      createdAt: now,
      supplierProductId: values.supplierProductId,
      supplierValue: values.supplierValue,
    };

    const activity: Activity = {
      id: newId("activity"),
      tenantId,
      contactId,
      dealId,
      userId: values.ownerId,
      type: "mudanca_estagio",
      description: `Novo lead criado: ${productLabel}.`,
      createdAt: now,
    };

    dispatch({ type: "ADD_CONTACT", contact });
    dispatch({ type: "ADD_DEAL", deal });
    dispatch({ type: "ADD_ACTIVITY", activity });

    toast.success(`Lead ${contact.name} criado.`);
    setAddOpen(false);
  }
```

- [ ] **Step 3: Substituir o `Select` de produto por cascata fornecedor→produto em `QuickDealDialog.tsx`**

Substituir o conteúdo completo de `src/components/inbox/QuickDealDialog.tsx`:

```tsx
// QuickDealDialog — cria um negócio rápido a partir do Inbox, para o contato
// da conversa aberta. Produto vem do catálogo de fornecedores (cascata
// fornecedor → produto, mesma UX do EditDealDialog/AddLeadDialog); não cria
// contato (já existe) e por isso é interno a esta task — não é um export
// compartilhado para outras telas.

import { useState, type FormEvent } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHOD_LABELS, STAGES } from "@/lib/constants";
import { contactById, tenantScope } from "@/lib/selectors";
import { newId, useCrm } from "@/lib/store";
import type { Activity, Deal, PaymentMethod, Stage } from "@/lib/types";

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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!state.session || !contact) return;

    if (!value || Number(value) <= 0) {
      setError("Informe um valor estimado maior que zero.");
      return;
    }

    const product = supplierProducts.find((p) => p.id === supplierProductId);
    const productLabel = product?.name ?? "Novo negócio";
    const now = new Date().toISOString();

    const deal: Deal = {
      id: newId("deal"),
      tenantId: state.session.tenantId,
      contactId: contact.id,
      title: productLabel,
      products: productLabel,
      value: Number(value),
      payment,
      tradeIn: false,
      stage,
      outcome: "aberto",
      ownerId: contact.ownerId,
      stageChangedAt: now,
      createdAt: now,
      supplierProductId: product?.id,
      supplierValue: product?.currentPrice,
    };

    const activity: Activity = {
      id: newId("activity"),
      tenantId: state.session.tenantId,
      contactId: contact.id,
      dealId: deal.id,
      userId: state.session.userId,
      type: "mudanca_estagio",
      description: `Negócio criado pelo Inbox: ${productLabel}.`,
      createdAt: now,
    };

    dispatch({ type: "ADD_DEAL", deal });
    dispatch({ type: "ADD_ACTIVITY", activity });
    toast.success(`Negócio criado para ${contact.name}.`);
    reset();
    onOpenChange(false);
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
```

- [ ] **Step 4: Verificar tipos**

Run: `npm run build`
Expected: sem erros de tipo (confirma que nenhum consumidor de `AddLeadFormValues.productLine` sobrou fora do que foi atualizado).

- [ ] **Step 5: Commit**

```bash
git add src/components/pipeline/AddLeadDialog.tsx src/pages/PipelinePage.tsx src/components/inbox/QuickDealDialog.tsx
git commit -m "feat: seleciona produto do catálogo de fornecedores ao criar lead/negócio"
```

---

## Task 6: Verificação final ponta a ponta

**Files:** nenhum arquivo novo — apenas verificação.

**Interfaces:** nenhuma (task de verificação).

- [ ] **Step 1: Rodar a suíte de testes completa**

Run: `npm test`
Expected: todos os testes passam (incluindo os 6+ novos da Task 1).

- [ ] **Step 2: Rodar o build de produção**

Run: `npm run build`
Expected: build conclui sem erros de tipo.

- [ ] **Step 3: Rodar o lint**

Run: `npm run lint`
Expected: sem erros novos introduzidos por esta leva.

- [ ] **Step 4: Verificação manual no navegador (dev server)**

Subir o dev server e, logado como gestor, verificar manualmente cada um dos 5 itens:

1. **Editar produto de fornecedor:** em Fornecedores → abrir um fornecedor → duplo-clique numa linha de produto → dialog abre em modo edição com nome/preço atuais → mudar só o nome → salvar → nome atualizado, sem nova entrada no histórico de preço. Repetir mudando o preço → nova entrada aparece em "Ver histórico".
2. **Editar valor da venda:** no Pipeline, abrir "Editar negócio" (menu "⋮" ou duplo-clique no card) → campo "Valor da venda" pré-preenchido com `deal.value` → mudar valor/custo/brindes → "Ganho líquido" recalcula ao vivo → salvar → valor refletido no card do Kanban.
3. **Duplo-clique:** confirmar que o duplo-clique no card do Pipeline abre o EditDealDialog (gestor) e que o menu "⋮" continua funcionando; confirmar que o duplo-clique no card de Fornecedores abre a edição e o clique único continua navegando para o detalhe.
4. **Anexos:** na ficha do cliente, aba "Comprovantes" → anexar uma imagem pequena (miniatura aparece) e tentar anexar um arquivo >5MB (mensagem de erro clara, sem quebrar a UI) → remover um anexo.
5. **Catálogo nos leads:** em "Novo lead" (Pipeline) e "Novo negócio" (Inbox), selecionar fornecedor → produto filtrado aparece → valor estimado continua editável independentemente → criar o lead/negócio → conferir que o negócio criado tem `supplierProductId`/`supplierValue` preenchidos (visível no EditDealDialog do negócio recém-criado) e que o valor de venda não foi sobrescrito pelo custo do produto.

Reportar quaisquer problemas encontrados e corrigir antes de finalizar.

- [ ] **Step 5: Commit final (se houver ajustes da verificação manual)**

```bash
git add -A
git commit -m "chore: ajustes finais da verificação ponta a ponta (Leva 1.2)"
```

(Pular este commit se a verificação não exigiu nenhuma mudança de código.)
