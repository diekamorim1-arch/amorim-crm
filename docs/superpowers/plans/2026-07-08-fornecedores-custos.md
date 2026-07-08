# Fornecedores e Custos do Negócio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ao Amorim CRM (já em produção-de-protótipo) custo do negócio (fornecedor + brindes → ganho líquido, visível só ao gestor) e uma tela de Fornecedores com catálogo de produtos e histórico de preço.

**Architecture:** Extensão do store existente (Context+reducer, `src/lib/store.tsx`) com 3 novas coleções planas (`suppliers`, `supplierProducts`, `supplierPriceChanges`) seguindo o padrão já usado por `contacts`/`deals`/`activities`. Duas telas novas (`/fornecedores`, `/fornecedores/:supplierId`) mirando o padrão lista+detalhe de Clientes. Um dialog compartilhado (`EditDealDialog`) reaproveitado no Pipeline e na ficha do cliente.

**Tech Stack:** Mesmo stack do projeto — React 19, TypeScript, Tailwind 4, shadcn/ui, vitest. Sem dependências novas.

## Global Constraints

- Repo: `D:\Skills Claude\amorim-crm` (path com espaço — sempre entre aspas nos comandos).
- Todo texto de UI em pt-BR, sentence case, verbos ativos; nome do botão consistente com o toast resultante.
- `Deal.supplierValue`/`Deal.giftValue` são **opcionais** (`number | undefined`) — todo ponto de leitura usa `?? 0`. Isso evita ter que editar as ~23 criações de `Deal` já existentes em `seed.ts`/`QuickDealDialog.tsx`/`PipelinePage.tsx`; só os poucos deals do seed que recebem custo de verdade (Task 2) precisam do valor explícito.
- Ganho líquido **nunca é armazenado** — sempre `deal.value - (deal.supplierValue ?? 0) - (deal.giftValue ?? 0)`, calculado onde exibido.
- Campos de custo/ganho líquido do negócio (Pipeline, ficha) e a opção "Editar negócio" são visíveis **somente para `role === "gestor"`**. A tela `/fornecedores` é visível para atendente e gestor, mas todo controle de escrita (novo fornecedor/produto, editar contato/preço) só aparece para gestor — mesmo padrão de gate por role já usado em `WhatsAppPage.tsx`/`Sidebar.tsx` (checagem via `currentUser(state)?.role`, sem alterar o reducer).
- Gate de cada task: `npm run build` (tsc -b + vite build) e `npx vitest run` limpos antes do commit.
- Toda entidade nova segue o padrão de FK: `id`, `tenantId`, mais as FKs específicas — sem exceção, para a sweep de integridade do teste de seed continuar cobrindo tudo.
- Ícone de navegação para Fornecedores: `Truck` (lucide-react, já disponível na versão instalada — mesma família de ícones de `Store`/`Users` já usados em `Sidebar.tsx`).

---

### Task 1: Modelo de dados, ações do store e testes do reducer

**Files:**
- Modify: `src/lib/types.ts` (adicionar `Supplier`, `SupplierProduct`, `SupplierPriceChange`; estender `Deal` e `CrmState`)
- Modify: `src/lib/store.tsx` (5 ações novas + casos do reducer)
- Modify: `src/lib/selectors.ts` (estender `tenantScope`, adicionar `priceHistoryForProduct`, estender `dashboardMetrics`)
- Modify: `src/lib/store.test.ts` (estender `baseState()`, novos testes)

**Interfaces (Produces — contrato para as próximas tasks):**

```ts
// types.ts
export interface Supplier {
  id: string; tenantId: string;
  name: string; whatsapp: string;
  contactName?: string; email?: string; notes?: string;
  createdAt: string;
}

export interface SupplierProduct {
  id: string; tenantId: string; supplierId: string;
  name: string; currentPrice: number; updatedAt: string; createdAt: string;
}

export interface SupplierPriceChange {
  id: string; tenantId: string; supplierProductId: string;
  price: number; changedAt: string;
}

// Deal ganha (todos opcionais — ver Global Constraints):
supplierProductId?: string;
supplierValue?: number;
giftValue?: number;

// CrmState ganha:
suppliers: Supplier[];
supplierProducts: SupplierProduct[];
supplierPriceChanges: SupplierPriceChange[];
```

```ts
// store.tsx — CrmAction ganha:
| { type: "ADD_SUPPLIER"; supplier: Supplier }
| { type: "UPDATE_SUPPLIER"; supplier: Supplier }
| { type: "ADD_SUPPLIER_PRODUCT"; product: SupplierProduct }
| { type: "UPDATE_SUPPLIER_PRODUCT_PRICE"; productId: string; price: number }
| { type: "UPDATE_DEAL_FINANCIALS"; dealId: string; supplierProductId?: string; supplierValue: number; giftValue: number }
```

```ts
// selectors.ts — tenantScope ganha 3 campos no tipo de retorno E nos dois branches
// (vazio e filtrado): suppliers, supplierProducts, supplierPriceChanges.

export function priceHistoryForProduct(state: CrmState, productId: string): SupplierPriceChange[];
// retorna tenantScope(state).supplierPriceChanges filtradas por supplierProductId,
// ordenadas por changedAt decrescente (mais recente primeiro).

// dashboardMetrics(state) ganha no objeto de retorno:
netProfitMonth: number;
// soma de (d.value - (d.supplierValue ?? 0) - (d.giftValue ?? 0)) para os mesmos
// deals que já compõem revenueMonth (outcome "ganho" + isSameMonth(stageChangedAt, now)).
```

**Regras do reducer:**
1. `ADD_SUPPLIER`/`UPDATE_SUPPLIER`: append/replace-by-id, mesmo padrão de `ADD_TENANT`/`UPDATE_TENANT`.
2. `ADD_SUPPLIER_PRODUCT`: append simples.
3. `UPDATE_SUPPLIER_PRODUCT_PRICE`: cria uma nova `SupplierPriceChange` (`id: newId("pricechg")`, `tenantId` do produto, `changedAt: now`) E atualiza `currentPrice`/`updatedAt` do `SupplierProduct` correspondente — os dois num único dispatch/case.
4. `UPDATE_DEAL_FINANCIALS`: substitui `supplierProductId`/`supplierValue`/`giftValue` no deal por id; não mexe em `stage`/`outcome`/`stageChangedAt`.

- [ ] **Step 1: Escrever `types.ts`** — adicionar as 3 interfaces acima antes de `export interface Deal` (mesma ordem alfabética informal do arquivo não é obrigatória, mas mantenha perto de `Contact`/`Deal` por afinidade). Adicionar os 3 campos opcionais em `Deal` (depois de `stageChangedAt`). Adicionar os 3 arrays em `CrmState` (depois de `connections`).

- [ ] **Step 2: Escrever os testes do reducer primeiro (TDD)** — adicionar ao final de `src/lib/store.test.ts`, antes do `describe("isStale", ...)` existente:

```ts
describe("crmReducer — fornecedores e custos", () => {
  function stateWithSupplier(): { state: CrmState; supplier: Supplier; product: SupplierProduct } {
    const base = baseState();
    const supplier: Supplier = {
      id: "supplier_1",
      tenantId: base.tenants[0].id,
      name: "Import Fácil",
      whatsapp: "+55 11 98888-0000",
      createdAt: new Date().toISOString(),
    };
    const product: SupplierProduct = {
      id: "product_1",
      tenantId: base.tenants[0].id,
      supplierId: supplier.id,
      name: "iPhone 15 128GB",
      currentPrice: 3800,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    return {
      state: { ...base, suppliers: [supplier], supplierProducts: [product], supplierPriceChanges: [] },
      supplier,
      product,
    };
  }

  it("ADD_SUPPLIER adiciona um fornecedor", () => {
    const base = baseState();
    const supplier: Supplier = {
      id: "supplier_2",
      tenantId: base.tenants[0].id,
      name: "Distribuidora XP",
      whatsapp: "+55 11 97777-0000",
      createdAt: new Date().toISOString(),
    };
    const next = crmReducer(base, { type: "ADD_SUPPLIER", supplier });
    expect(next.suppliers).toContainEqual(supplier);
  });

  it("UPDATE_SUPPLIER_PRODUCT_PRICE cria uma SupplierPriceChange e atualiza currentPrice/updatedAt", () => {
    const { state, product } = stateWithSupplier();
    const next = crmReducer(state, {
      type: "UPDATE_SUPPLIER_PRODUCT_PRICE",
      productId: product.id,
      price: 3950,
    });

    const updated = next.supplierProducts.find((p) => p.id === product.id);
    expect(updated?.currentPrice).toBe(3950);
    expect(updated?.updatedAt).not.toBe(product.updatedAt);

    expect(next.supplierPriceChanges).toHaveLength(1);
    expect(next.supplierPriceChanges[0]).toMatchObject({
      supplierProductId: product.id,
      price: 3950,
    });
  });

  it("UPDATE_DEAL_FINANCIALS seta supplierProductId/supplierValue/giftValue sem mexer no estágio", () => {
    const { state, product } = stateWithSupplier();
    const dealId = state.deals[0].id;
    const originalStage = state.deals[0].stage;

    const next = crmReducer(state, {
      type: "UPDATE_DEAL_FINANCIALS",
      dealId,
      supplierProductId: product.id,
      supplierValue: 3800,
      giftValue: 150,
    });

    const updated = next.deals.find((d) => d.id === dealId);
    expect(updated?.supplierProductId).toBe(product.id);
    expect(updated?.supplierValue).toBe(3800);
    expect(updated?.giftValue).toBe(150);
    expect(updated?.stage).toBe(originalStage);
  });
});

describe("priceHistoryForProduct", () => {
  it("retorna as mudanças de preço do produto, mais recente primeiro", () => {
    const base = baseState();
    const supplier: Supplier = {
      id: "supplier_3",
      tenantId: base.tenants[0].id,
      name: "Fornecedor Teste",
      whatsapp: "+55 11 96666-0000",
      createdAt: new Date().toISOString(),
    };
    const product: SupplierProduct = {
      id: "product_2",
      tenantId: base.tenants[0].id,
      supplierId: supplier.id,
      name: "AirPods Pro",
      currentPrice: 1200,
      updatedAt: daysAgo(0),
      createdAt: daysAgo(10),
    };
    const changes: SupplierPriceChange[] = [
      { id: "chg_1", tenantId: base.tenants[0].id, supplierProductId: product.id, price: 1100, changedAt: daysAgo(5) },
      { id: "chg_2", tenantId: base.tenants[0].id, supplierProductId: product.id, price: 1200, changedAt: daysAgo(0) },
    ];
    const state: CrmState = {
      ...base,
      suppliers: [supplier],
      supplierProducts: [product],
      supplierPriceChanges: changes,
    };

    const history = priceHistoryForProduct(state, product.id);
    expect(history.map((c) => c.id)).toEqual(["chg_2", "chg_1"]);
  });
});

describe("dashboardMetrics — netProfitMonth", () => {
  it("soma (valor - fornecedor - brindes) só dos deals ganhos no mês", () => {
    const base = baseState();
    const wonThisMonth: Deal = {
      ...base.deals[0],
      id: "deal_won_1",
      outcome: "ganho",
      stage: "pos_venda",
      value: 5000,
      supplierValue: 3800,
      giftValue: 100,
      stageChangedAt: new Date().toISOString(),
    };
    const wonNoCost: Deal = {
      ...base.deals[0],
      id: "deal_won_2",
      outcome: "ganho",
      stage: "pos_venda",
      value: 2000,
      stageChangedAt: new Date().toISOString(),
    };
    const state: CrmState = { ...base, deals: [wonThisMonth, wonNoCost] };

    const metrics = dashboardMetrics(state);
    // (5000 - 3800 - 100) + (2000 - 0 - 0) = 1100 + 2000
    expect(metrics.netProfitMonth).toBe(3100);
  });
});
```

Atualizar os imports no topo de `store.test.ts` para incluir os novos tipos e a nova função:

```ts
import { currentUser, dashboardMetrics, dealsByStage, isStale, lostDeals, priceHistoryForProduct, tenantScope } from "./selectors";
import type { Contact, Conversation, CrmState, Deal, Supplier, SupplierPriceChange, SupplierProduct, Tenant, User } from "./types";
```

E atualizar `baseState()` (linhas ~71-82) para incluir as 3 coleções vazias no objeto retornado:

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
    session: { userId: owner.id, tenantId: tenant.id, role: "atendente" },
  };
```

- [ ] **Step 3: Rodar os testes e confirmar que falham** (tipos/ações ainda não existem):

Run: `cd "D:\Skills Claude\amorim-crm" && npx vitest run`
Expected: FAIL — erros de compilação/tipo sobre `Supplier`, `priceHistoryForProduct`, `netProfitMonth`, `ADD_SUPPLIER` não existirem.

- [ ] **Step 4: Implementar `types.ts`, `store.tsx` e `selectors.ts`** conforme os contratos acima. Em `selectors.ts`, `tenantScope`'s branch vazio (linhas ~32-41) e o branch filtrado (linhas ~44-53) ganham `suppliers: []`/`state.suppliers.filter(...)`, idem para as outras duas coleções. Em `dashboardMetrics` (linhas ~120-126, junto de `revenueMonth`), adicionar:

```ts
  const netProfitMonth = wonDeals
    .filter((d) => isSameMonth(d.stageChangedAt, now))
    .reduce((sum, d) => sum + (d.value - (d.supplierValue ?? 0) - (d.giftValue ?? 0)), 0);
```

E incluir `netProfitMonth` no objeto retornado (junto de `revenueMonth`).

- [ ] **Step 5: Rodar os testes e confirmar que passam:**

Run: `npx vitest run`
Expected: PASS — todos os testes, incluindo os novos.

- [ ] **Step 6: `npm run build` limpo, depois commit:**

```bash
cd "D:\Skills Claude\amorim-crm"
npm run build
git add src/lib/types.ts src/lib/store.tsx src/lib/selectors.ts src/lib/store.test.ts
git commit -m "feat: modelo de dados e acoes de fornecedores/custos do negocio

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Seed de fornecedores e backfill de custo em deals ganhos

**Files:**
- Modify: `src/lib/seed.ts` (nova função `buildTenant1Suppliers`, wiring em `buildSeed()`, backfill de 4-5 deals ganhos existentes)
- Modify: `src/lib/store.test.ts` (estender a sweep de integridade de FK do `describe("buildSeed", ...)`)

**Interfaces:**
- Consumes: `Supplier`/`SupplierProduct`/`SupplierPriceChange` (Task 1), `newId` de `./id`, `daysAgo`/`hoursAgo` de `./format`.
- Produces: nada consumido por outras tasks (dados de demonstração apenas).

- [ ] **Step 1: Adicionar `buildTenant1Suppliers` em `seed.ts`**, logo antes de `buildTenant2` (linha ~1187). Cria 2 fornecedores plausíveis com 3 produtos cada e 2 entradas de histórico de preço por produto:

```ts
function buildTenant1Suppliers(
  tenantId: string,
): { suppliers: Supplier[]; supplierProducts: SupplierProduct[]; supplierPriceChanges: SupplierPriceChange[] } {
  const importFacil: Supplier = {
    id: newId("supplier"),
    tenantId,
    name: "Import Fácil Distribuidora",
    whatsapp: "+55 11 98212-4477",
    contactName: "Rogério Nakamura",
    email: "rogerio@importfacil.com.br",
    notes: "Prazo de entrega 3-5 dias úteis. Pedido mínimo de 2 unidades por modelo.",
    createdAt: daysAgo(240),
  };

  const techWholesale: Supplier = {
    id: newId("supplier"),
    tenantId,
    name: "TechWholesale Brasil",
    whatsapp: "+55 11 97455-9012",
    contactName: "Bianca Ferraz",
    email: "bianca@techwholesale.com.br",
    notes: "Pagamento à vista com 3% de desconto. Envia lista de preços toda manhã por WhatsApp.",
    createdAt: daysAgo(180),
  };

  function product(supplierId: string, name: string, price: number, createdAgo: number): SupplierProduct {
    return {
      id: newId("product"),
      tenantId,
      supplierId,
      name,
      currentPrice: price,
      updatedAt: daysAgo(1),
      createdAt: daysAgo(createdAgo),
    };
  }

  const iphone15 = product(importFacil.id, "iPhone 15 128GB", 3800, 220);
  const iphone15ProMax = product(importFacil.id, "iPhone 15 Pro Max 256GB", 6900, 220);
  const watchSeries9 = product(importFacil.id, "Apple Watch Series 9 GPS 41mm", 2100, 200);

  const airpodsPro = product(techWholesale.id, "AirPods Pro (2ª geração)", 1150, 160);
  const ipadAir = product(techWholesale.id, "iPad Air 128GB", 3400, 160);
  const macbookAirM2 = product(techWholesale.id, "MacBook Air M2 256GB", 6200, 150);

  function priceHistory(p: SupplierProduct, olderPrice: number, olderDaysAgo: number): SupplierPriceChange[] {
    return [
      { id: newId("pricechg"), tenantId, supplierProductId: p.id, price: olderPrice, changedAt: daysAgo(olderDaysAgo) },
      { id: newId("pricechg"), tenantId, supplierProductId: p.id, price: p.currentPrice, changedAt: daysAgo(1) },
    ];
  }

  const supplierPriceChanges = [
    ...priceHistory(iphone15, 3650, 18),
    ...priceHistory(iphone15ProMax, 6700, 18),
    ...priceHistory(watchSeries9, 1980, 25),
    ...priceHistory(airpodsPro, 1080, 12),
    ...priceHistory(ipadAir, 3250, 12),
    ...priceHistory(macbookAirM2, 5980, 30),
  ];

  return {
    suppliers: [importFacil, techWholesale],
    supplierProducts: [iphone15, iphone15ProMax, watchSeries9, airpodsPro, ipadAir, macbookAirM2],
    supplierPriceChanges,
  };
}
```

- [ ] **Step 2: Backfill de custo em deals já ganhos.** Em `buildTenant1Deals` (a função que retorna `{ all, brunoDeal, ..., vanessaDeal, marceloDeal, rodrigoDeal }`, linha ~378-768), a assinatura precisa passar a receber os IDs dos produtos criados no Step 1:

```ts
function buildTenant1Deals(
  tenantId: string,
  c: ReturnType<typeof buildTenant1Contacts>,
  u: ReturnType<typeof buildUsers>,
  supplierProductIds: { iphone15: string; iphone15ProMax: string; airpodsPro: string },
) {
```

Adicionar os 3 campos novos exatamente nestes 4 deals (localize cada um pelo nome da variável já existente no arquivo — não altere nenhum outro deal):

| Variável do deal | `supplierProductId` | `supplierValue` | `giftValue` |
|---|---|---|---|
| `eduardoDeal` | `supplierProductIds.iphone15ProMax` | `6700` | `150` |
| `vanessaDeal` | `supplierProductIds.airpodsPro` | `1080` | `0` (omitir o campo) |
| Primeiro deal `ganho` de `marceloDeal`'s histórico (a variável cujo `contactId` é o id de Marcelo e `outcome` é `"ganho"`) | `supplierProductIds.iphone15` | `3650` | `100` |
| Primeiro deal `ganho` do histórico de `rodrigoDeal` (a variável cujo `contactId` é o id de Rodrigo e `outcome` é `"ganho"`) | `supplierProductIds.iphone15ProMax` | `6700` | `0` (omitir o campo) |

Exemplo do literal resultante para `eduardoDeal`:

```ts
  const eduardoDeal: Deal = {
    // ...campos existentes inalterados...
    supplierProductId: supplierProductIds.iphone15ProMax,
    supplierValue: 6700,
    giftValue: 150,
  };
```

Todos os 4 mantêm margem positiva (`value > supplierValue + giftValue`) dado os valores de venda já existentes no seed. Os demais deals `ganho` do seed (incluindo os das outras jornadas `recorrente`/`cliente`) permanecem **sem** esses 3 campos — omitidos, não `undefined` explícito — para provar que "negócio sem custo registrado ainda" é um estado válido e visível no Pipeline/Dashboard.

- [ ] **Step 3: Wiring em `buildSeed()`** (linha ~1403-1434):

```ts
export function buildSeed(): CrmState {
  const { tenant1, tenant2 } = buildTenants();
  const users = buildUsers(tenant1.id, tenant2.id);
  const tenant1Suppliers = buildTenant1Suppliers(tenant1.id);

  const supplierProductIds = {
    iphone15: tenant1Suppliers.supplierProducts[0].id,
    iphone15ProMax: tenant1Suppliers.supplierProducts[1].id,
    airpodsPro: tenant1Suppliers.supplierProducts[3].id,
  };

  const tenant1Contacts = buildTenant1Contacts(tenant1.id, users);
  const tenant1Deals = buildTenant1Deals(tenant1.id, tenant1Contacts, users, supplierProductIds);
  // ... (resto inalterado)

  return {
    // ... (campos existentes inalterados)
    suppliers: tenant1Suppliers.suppliers,
    supplierProducts: tenant1Suppliers.supplierProducts,
    supplierPriceChanges: tenant1Suppliers.supplierPriceChanges,
    session: null,
  };
}
```

TechStore SP (tenant 2) não recebe fornecedores — arrays vazios para esse tenant, provando o isolamento (nenhuma outra mudança em `buildTenant2`).

- [ ] **Step 4: Estender a sweep de integridade de FK** no `describe("buildSeed", ...)` existente em `store.test.ts` — adicionar ao mesmo teste (ou um novo `it`, o que já existir de mais natural no arquivo):

```ts
  it("fornecedores, produtos e histórico de preço têm FKs válidas", () => {
    const seed = buildSeed();
    const supplierIds = new Set(seed.suppliers.map((s) => s.id));
    const productIds = new Set(seed.supplierProducts.map((p) => p.id));

    for (const product of seed.supplierProducts) {
      expect(supplierIds.has(product.supplierId)).toBe(true);
    }
    for (const change of seed.supplierPriceChanges) {
      expect(productIds.has(change.supplierProductId)).toBe(true);
    }
    for (const deal of seed.deals) {
      if (deal.supplierProductId) expect(productIds.has(deal.supplierProductId)).toBe(true);
    }

    // Isolamento: TechStore SP não tem fornecedores.
    const tenant2 = seed.tenants.find((t) => t.slug !== "amorim-imports")!;
    expect(seed.suppliers.every((s) => s.tenantId !== tenant2.id)).toBe(true);
  });
```

- [ ] **Step 5: Rodar os testes e o build:**

Run: `npx vitest run`
Expected: PASS — todos, incluindo o novo teste de FK.

Run: `npm run build`
Expected: build limpo.

- [ ] **Step 6: Commit:**

```bash
git add src/lib/seed.ts src/lib/store.test.ts
git commit -m "feat: seed de fornecedores/produtos/historico de preco e backfill de custo

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Tela Fornecedores

**Files:**
- Create: `src/pages/SuppliersPage.tsx`, `src/pages/SupplierDetailPage.tsx`
- Create: `src/components/suppliers/SupplierFormDialog.tsx`, `src/components/suppliers/SupplierProductDialog.tsx`, `src/components/suppliers/EditPriceDialog.tsx`, `src/components/suppliers/PriceHistorySheet.tsx`
- Modify: `src/App.tsx` (2 rotas), `src/components/layout/AppShell.tsx` (guard do atendente), `src/components/layout/Sidebar.tsx` (item de navegação)

**Interfaces:**
- Consumes: `useCrm`, `tenantScope` (`.suppliers`, `.supplierProducts`), `currentUser`, `priceHistoryForProduct` (Task 1); ações `ADD_SUPPLIER`/`UPDATE_SUPPLIER`/`ADD_SUPPLIER_PRODUCT`/`UPDATE_SUPPLIER_PRODUCT_PRICE`; `newId` de `@/lib/store`; `brl`/`relativeTime` de `@/lib/format`; `EmptyState` de `@/components/EmptyState`.
- Produces: nada consumido por outras tasks nesta leva (Task 4 usa `Supplier`/`SupplierProduct` diretamente do state via `tenantScope`, não componentes desta task).

**Comportamento:**

- **Rota `/fornecedores`** (lista) e **`/fornecedores/:supplierId`** (detalhe) — mesmo padrão de `/clientes` + `/clientes/:contactId`.
- **SuppliersPage**: busca por nome (filtro client-side simples); grid de cards (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) — cada card mostra nome, WhatsApp, nome do contato, contagem de produtos (`tenantScope(state).supplierProducts.filter(p => p.supplierId === s.id).length`); clique navega para o detalhe. Botão "Novo fornecedor" (abre `SupplierFormDialog` em modo criação) **só renderiza se `currentUser(state)?.role === "gestor"`**. `EmptyState` quando não há fornecedores ainda ou a busca não bate com nada.
- **SupplierDetailPage**: header com nome, WhatsApp, nome do contato, e-mail, observações + botão "Editar" (abre `SupplierFormDialog` em modo edição) — só gestor. Tabela/lista de produtos: nome, preço atual (`font-mono tabular-nums`), "atualizado {relativeTime}"; cada linha tem "Editar preço" (só gestor, abre `EditPriceDialog`) e "Ver histórico" (todos os papéis, abre `PriceHistorySheet`). Botão "Novo produto" (abre `SupplierProductDialog`) — só gestor. `EmptyState` quando o fornecedor ainda não tem produto cadastrado.
- **SupplierFormDialog** (dual-mode como `ContactFormDialog`): `export function SupplierFormDialog({ supplier, open, onOpenChange }: { supplier?: Supplier; open: boolean; onOpenChange: (o: boolean) => void })`. Campos: nome* (erro inline se vazio), WhatsApp* (erro inline se vazio), nome do contato, e-mail, observações (textarea). Cria via `ADD_SUPPLIER` (`id: newId("supplier")`, `tenantId` da sessão, `createdAt: now`) ou atualiza via `UPDATE_SUPPLIER`. Toast "Fornecedor {nome} criado." / "Fornecedor {nome} atualizado."
- **SupplierProductDialog**: `export function SupplierProductDialog({ supplierId, open, onOpenChange }: { supplierId: string; open: boolean; onOpenChange: (o: boolean) => void })`. Campos: nome do produto* (erro inline), preço inicial* (numérico, > 0, erro inline). Dispatcha `ADD_SUPPLIER_PRODUCT` (`currentPrice` = preço informado, `updatedAt`/`createdAt` = now) — **não** cria uma `SupplierPriceChange` na criação (histórico só nasce a partir da 1ª edição de preço). Toast "Produto {nome} adicionado."
- **EditPriceDialog**: `export function EditPriceDialog({ product, open, onOpenChange }: { product: SupplierProduct | null; open: boolean; onOpenChange: (o: boolean) => void })`. Um campo numérico pré-preenchido com `product.currentPrice`, validação > 0. Dispatcha `UPDATE_SUPPLIER_PRODUCT_PRICE`. Toast "Preço de {nome do produto} atualizado."
- **PriceHistorySheet**: `export function PriceHistorySheet({ product, open, onOpenChange }: { product: SupplierProduct | null; open: boolean; onOpenChange: (o: boolean) => void })`. Sheet lateral com lista cronológica (mais recente primeiro) de `priceHistoryForProduct(state, product.id)` — cada linha: preço (`brl`, `font-mono`) + data (`relativeTime`). `EmptyState` se a lista vier vazia (produto nunca teve o preço editado, só o valor de criação).

- [ ] **Step 1: Implementar os 4 componentes e as 2 páginas** conforme acima, reaproveitando os componentes shadcn já usados no projeto (`Card`, `Dialog`, `Input`, `Label`, `Textarea`, `Sheet`, `Button`, `Badge`) e o padrão de validação inline já usado em `ContactFormDialog.tsx`/`AddLeadDialog.tsx` (mensagem de erro abaixo do campo, sem `alert`/toast para erro de validação).

- [ ] **Step 2: Adicionar as rotas em `src/App.tsx`** (dentro do `<Route element={<AppShell />}>`, junto das rotas de clientes):

```tsx
        <Route path="/fornecedores" element={<SuppliersPage />} />
        <Route path="/fornecedores/:supplierId" element={<SupplierDetailPage />} />
```

E os imports correspondentes no topo do arquivo.

- [ ] **Step 3: Atualizar o guard do atendente em `AppShell.tsx`** — adicionar `"/fornecedores"` ao array `ATENDENTE_ALLOWED_BASES` (linha 11):

```ts
const ATENDENTE_ALLOWED_BASES = ["/pipeline", "/inbox", "/clientes", "/agenda", "/whatsapp", "/fornecedores"];
```

- [ ] **Step 4: Adicionar o item de navegação em `Sidebar.tsx`** — no array `ATENDENTE_ITEMS` (linha 35-41), inserir depois de "Agenda" e antes de "WhatsApp" (mantém os 4 primeiros itens mobile — Pipeline/Inbox/Clientes/Agenda — inalterados; Fornecedores e WhatsApp caem no overflow "Mais" do mobile, igual já acontece hoje com WhatsApp):

```ts
const ATENDENTE_ITEMS: NavItem[] = [
  { to: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/inbox", label: "Inbox", icon: InboxIcon },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/fornecedores", label: "Fornecedores", icon: Truck },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageSquare },
];
```

E adicionar `Truck` ao import de ícones do `lucide-react` no topo do arquivo (junto de `CalendarDays`, `KanbanSquare` etc.).

- [ ] **Step 5: Verificar via preview** (`preview_start`, config `amorim-crm`): logar como gestor, abrir Fornecedores, ver os 2 fornecedores do seed com produtos; criar um fornecedor novo e um produto; editar um preço e conferir que "Ver histórico" mostra a entrada nova no topo; logar como atendente, confirmar que vê a mesma lista mas sem nenhum botão de escrita (nem "Novo fornecedor", nem "Editar", nem "Editar preço"), e que "Ver histórico" continua funcionando para ele. Testar mobile 375px (grid vira 1 coluna, item aparece no menu "Mais"). Parar o preview.

- [ ] **Step 6: `npm run build` limpo; `npx vitest run` verde (sem mudança nos testes desta task). Commit:**

```bash
git add src/pages/SuppliersPage.tsx src/pages/SupplierDetailPage.tsx src/components/suppliers/ src/App.tsx src/components/layout/AppShell.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: tela de fornecedores com catalogo de produtos e historico de preco

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Editar negócio (custo/ganho líquido) no Pipeline e na ficha do cliente

**Files:**
- Create: `src/components/pipeline/EditDealDialog.tsx`
- Modify: `src/components/pipeline/DealCard.tsx`, `src/components/pipeline/KanbanColumn.tsx`, `src/pages/PipelinePage.tsx`, `src/pages/ContactDetailPage.tsx`

**Interfaces:**
- Consumes: `Supplier`/`SupplierProduct`/`Deal` (Task 1); `tenantScope(state).suppliers`/`.supplierProducts`; ação `UPDATE_DEAL_FINANCIALS` (Task 1); `currentUser(state)` (`@/lib/selectors`); `brl` (`@/lib/format`).
- Produces (consumido nesta mesma task, por 2 telas): `src/components/pipeline/EditDealDialog.tsx` exporta `export function EditDealDialog({ deal, open, onOpenChange }: { deal: Deal | null; open: boolean; onOpenChange: (o: boolean) => void })`.

**Comportamento:**

- **EditDealDialog**: ao abrir, se `deal.supplierProductId` já setado, pré-seleciona fornecedor (derivado do produto) e produto; senão vazio. Select de fornecedor (`tenantScope(state).suppliers`) → select de produto (`tenantScope(state).supplierProducts.filter(p => p.supplierId === fornecedorSelecionado)`, ao escolher preenche o campo "Valor do fornecedor" com `product.currentPrice`, mas o campo continua editável depois). Campo "Valor dos brindes" (numérico, R$, default `deal.giftValue ?? 0`). Linha "Ganho líquido: {brl(deal.value - supplierValue - giftValue)}" recalculada a cada mudança nos dois campos numéricos (`font-mono tabular-nums`, cor `text-success` se positivo, `text-destructive` se negativo). Dispatcha `UPDATE_DEAL_FINANCIALS` no submit. Toast "Custos de {deal.title} atualizados."
- **DealCard**: ganha prop opcional `onEditDeal?: (deal: Deal) => void`. O menu do card (`DropdownMenuContent`) ganha, **só quando `onEditDeal` é passado**, um item "Editar negócio" logo acima do separador que antecede "Marcar como perdido":

```tsx
{onEditDeal && (
  <>
    <DropdownMenuItem onSelect={() => onEditDeal(deal)}>Editar negócio</DropdownMenuItem>
    <DropdownMenuSeparator />
  </>
)}
```

- **KanbanColumn**: ganha prop opcional `onEditDeal?: (deal: Deal) => void`, repassada para cada `DealCard`.
- **PipelinePage**: calcula `const isGestor = currentUser(state)?.role === "gestor";`, estado `const [editDealTarget, setEditDealTarget] = useState<Deal | null>(null);`, passa `onEditDeal={isGestor ? setEditDealTarget : undefined}` para cada `<KanbanColumn>`, e renderiza `<EditDealDialog deal={editDealTarget} open={!!editDealTarget} onOpenChange={(o) => !o && setEditDealTarget(null)} />` no final do JSX (junto dos outros dialogs).
- **ContactDetailPage** (`NegociosSection`): ganha prop opcional `onEditDeal?: (deal: Deal) => void`; cada linha de negócio ganha um botão "Editar" (ícone `Pencil`, `variant="ghost" size="icon-xs"`) que só renderiza quando `onEditDeal` é passado. `ContactDetailPage` calcula `isGestor` do mesmo jeito, passa `onEditDeal={isGestor ? setEditDealTarget : undefined}` para `<NegociosSection>`, e renderiza o mesmo `<EditDealDialog>` (novo estado local `editDealTarget`, mesmo padrão de `apptOpen`/`editOpen` já existentes no arquivo).
- **Atendente**: como `onEditDeal` nunca é passado (fica `undefined`), o item de menu/botão simplesmente não aparece — nenhuma checagem de role dentro de `DealCard`/`NegociosSection`, a decisão fica só no pai (`PipelinePage`/`ContactDetailPage`), evitando duplicar a regra de permissão em componente de apresentação.

- [ ] **Step 1: Implementar `EditDealDialog.tsx`** conforme acima.

- [ ] **Step 2: Editar `DealCard.tsx`** — adicionar `onEditDeal?: (deal: Deal) => void` à interface `DealCardProps` e à desestruturação dos props, e inserir o `DropdownMenuItem` condicional descrito acima.

- [ ] **Step 3: Editar `KanbanColumn.tsx`** — adicionar `onEditDeal?: (deal: Deal) => void` à interface `KanbanColumnProps`, repassar para `<DealCard onEditDeal={onEditDeal} .../>`.

- [ ] **Step 4: Editar `PipelinePage.tsx`** — importar `currentUser` de `@/lib/selectors` e `EditDealDialog`; adicionar `isGestor`, `editDealTarget`/`setEditDealTarget`; passar `onEditDeal={isGestor ? setEditDealTarget : undefined}` em cada `<KanbanColumn>`; renderizar `<EditDealDialog>` no final do JSX (depois de `<LostDealsSheet>`).

- [ ] **Step 5: Editar `ContactDetailPage.tsx`** — importar `currentUser`; em `NegociosSection`, adicionar a prop opcional `onEditDeal` e o botão "Editar" por linha; no componente principal, calcular `isGestor`, adicionar `editDealTarget`/`setEditDealTarget`, passar `onEditDeal={isGestor ? setEditDealTarget : undefined}` para `<NegociosSection deals={openDeals} onEditDeal={...} />`, e renderizar `<EditDealDialog>` junto dos outros dialogs já existentes (`ContactFormDialog`, `AppointmentDialog`).

- [ ] **Step 6: Verificar via preview**: como gestor, abrir o menu de um card no Pipeline → "Editar negócio" aparece; selecionar fornecedor/produto pré-preenche o valor; mudar brindes recalcula o ganho líquido ao vivo; salvar e reabrir confirma persistência. Repetir a partir da aba Negócios da ficha de um cliente com negócio aberto. Logar como atendente: confirmar que "Editar negócio" NÃO aparece no menu do card nem na ficha, e que nenhum valor de custo/líquido é visível em lugar nenhum. Parar o preview.

- [ ] **Step 7: `npm run build` limpo; `npx vitest run` verde. Commit:**

```bash
git add src/components/pipeline/EditDealDialog.tsx src/components/pipeline/DealCard.tsx src/components/pipeline/KanbanColumn.tsx src/pages/PipelinePage.tsx src/pages/ContactDetailPage.tsx
git commit -m "feat: editar negocio com custo de fornecedor e brindes (somente gestor)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Métrica de lucro líquido no Dashboard

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `metrics.netProfitMonth` (Task 1, já calculado por `dashboardMetrics`), `MetricCard` (já existe), `brl`.

**Comportamento:**

- 5º `MetricCard` "Lucro líquido no mês" na mesma linha dos outros 4 (grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — o 5º item naturalmente quebra para uma nova linha sozinho, sem precisar mudar o grid). Valor: `brl(metrics.netProfitMonth)`, `valueClassName="font-mono tabular-nums text-xl"`. Sem `delta` (não há requisito de comparação com mês anterior para esta métrica nesta leva).

- [ ] **Step 1: Editar `DashboardPage.tsx`** — adicionar depois do `<MetricCard label="Taxa de conversão" ... />` existente (linha ~72-76):

```tsx
        <MetricCard
          label="Lucro líquido no mês"
          value={brl(metrics.netProfitMonth)}
          valueClassName="font-mono tabular-nums text-xl"
        />
```

- [ ] **Step 2: Verificar via preview**: como gestor, o card aparece com um valor diferente de zero (graças ao backfill da Task 2); ganhar um novo negócio com custo preenchido no Pipeline (via "Editar negócio" antes de mover para Pós-venda) atualiza o valor ao voltar ao Dashboard. Mobile 375px: card empilha corretamente na 2ª linha sozinho. Parar o preview.

- [ ] **Step 3: `npm run build` limpo; `npx vitest run` verde. Commit:**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat: card de lucro liquido no mes no dashboard

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Verificação final de ponta a ponta

**Files:** nenhum arquivo novo — task de verificação apenas (pode gerar pequenos fixes pontuais se algo quebrar).

- [ ] **Step 1: Corredor de validação completo via preview** (`preview_start`, config `amorim-crm`): login gestor → `/fornecedores`, criar fornecedor "Fornecedor Teste E2E" com 1 produto a R$ 1.000 → `/pipeline`, abrir um negócio em aberto, "Editar negócio", selecionar o fornecedor/produto recém-criados, valor do fornecedor pré-preenchido em R$ 1.000, brindes R$ 50, conferir ganho líquido = valor do negócio − 1050 calculado corretamente na tela → salvar → reabrir o mesmo negócio e confirmar que os valores persistiram → mover o negócio para Pós-venda (venda ganha) → `/` (Dashboard), confirmar que "Lucro líquido no mês" refletiu a nova venda → trocar sessão para atendente (SessionSwitcher): confirmar que `/fornecedores` ainda abre (somente leitura, sem nenhum botão de escrita) e que o Pipeline/ficha do cliente não mostram "Editar negócio" nem nenhum valor de custo em lugar nenhum.
- [ ] **Step 2: Responsivo (375/768/1280) e dark mode** nas 2 telas novas (`/fornecedores`, detalhe) e nos pontos modificados (card do Pipeline com o novo item de menu, aba Negócios da ficha, Dashboard com o 5º card).
- [ ] **Step 3: `npm run build` limpo, `npx vitest run` verde (contagem final de testes), `npm run lint` limpo.**
- [ ] **Step 4: Se qualquer verificação acima revelar um problema real**, corrigir e repetir os Steps 1-3 antes de prosseguir — não commitar com o corredor quebrado.
- [ ] **Step 5: Commit final (só se algo foi ajustado nos Steps anteriores; se tudo já passou limpo desde a Task 5, este step não gera commit):**

```bash
git add -A
git commit -m "fix: ajustes finais da verificacao ponta a ponta (fornecedores/custos)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
