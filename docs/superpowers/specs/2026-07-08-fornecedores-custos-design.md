# Fornecedores e Custos do Negócio — Design (Leva 1.1)

**Data:** 08/07/2026
**Status:** Design aprovado — pronto para plano de implementação
**Contexto:** Adição ao protótipo Amorim CRM (leva 1, já concluída e revisada — 12 tasks, `docs/2026-07-07-amorim-crm-prototype.md`). Este documento cobre duas features novas pedidas pelo usuário após a entrega da leva 1.

---

## 1. Objetivo

Hoje o Pipeline mostra só o valor de venda do negócio. O usuário precisa saber o **ganho líquido** real (venda − custo do fornecedor − valor de brindes), e precisa de um lugar para manter a lista de preços dos fornecedores — que chega por WhatsApp diariamente e hoje não tem onde morar no sistema.

Duas adições:
1. **Campos de custo no negócio** (`Deal`): valor do fornecedor + valor dos brindes, com ganho líquido calculado, visível somente ao gestor.
2. **Aba Fornecedores**: cadastro de fornecedores com contato completo e lista de produtos com preço atual + histórico de alterações.

## 2. Modelo de dados

Três entidades novas, seguindo o padrão de coleções planas já usado em todo o `CrmState` (mesma forma de `contacts`, `deals`, `activities` — nada de arrays aninhados dentro de outra entidade):

```ts
interface Supplier {
  id: string; tenantId: string;
  name: string; whatsapp: string;
  contactName?: string; email?: string; notes?: string;
  createdAt: string;
}

interface SupplierProduct {
  id: string; tenantId: string; supplierId: string;
  name: string; currentPrice: number; updatedAt: string; createdAt: string;
}

interface SupplierPriceChange {
  id: string; tenantId: string; supplierProductId: string;
  price: number; changedAt: string;
}
```

`SupplierPriceChange` é um log append-only: cada edição de preço cria uma nova linha; `SupplierProduct.currentPrice`/`updatedAt` sempre espelham a entrada mais recente. Não há edição/exclusão de entradas antigas.

`Deal` ganha 3 campos:

```ts
supplierProductId?: string;   // produto do fornecedor vinculado (opcional)
supplierValue: number;         // default 0 — pré-preenchido do produto escolhido, editável
giftValue: number;             // default 0 — valor de brindes, livre
```

Ganho líquido **não é armazenado** — é sempre `value - supplierValue - giftValue`, calculado on-the-fly onde exibido (DealCard/EditDealDialog/Dashboard).

`CrmAction` ganha: `ADD_SUPPLIER`, `UPDATE_SUPPLIER`, `ADD_SUPPLIER_PRODUCT`, `UPDATE_SUPPLIER_PRODUCT_PRICE` (cria a `SupplierPriceChange` e atualiza `currentPrice`/`updatedAt` do produto num só dispatch), `UPDATE_DEAL_FINANCIALS` (seta `supplierProductId`/`supplierValue`/`giftValue` de um deal existente).

## 3. Tela Fornecedores

- **Rota `/fornecedores`** (lista) + **`/fornecedores/:supplierId`** (detalhe) — mesmo padrão lista+detalhe já usado em Clientes (Task 5 da leva 1).
- Nova entrada na sidebar, visível para **atendente e gestor**.
- **Lista**: busca por nome; card/linha com nome, WhatsApp, nome do contato, contagem de produtos. Botão "Novo fornecedor" (nome*, WhatsApp*, contato, e-mail, observações) — visível só ao gestor.
- **Detalhe**: cabeçalho com dados de contato completos + "Editar" (gestor); tabela de produtos (nome, preço atual em `font-mono tabular-nums`, "atualizado há X" via `relativeTime`); cada linha tem "Editar preço" (gestor — abre dialog simples valor+confirma, grava `SupplierPriceChange`) e "Ver histórico" (todos os papéis — lista cronológica de preços/datas anteriores). "Novo produto" (gestor).
- **Atendente**: acesso de leitura total (inclusive histórico de preços — ele precisa consultar para negociar); todo controle de escrita (novo fornecedor/produto, editar contato/preço) fica oculto para esse papel.

## 4. Campos financeiros no Deal, Pipeline e Dashboard

- **DealCard (Pipeline)**: menu ganha "Editar negócio" — item visível **somente para gestor**. Abre `EditDealDialog`: select de fornecedor → select de produto (auto-preenche `supplierValue` com `currentPrice`, editável depois), campo "Valor dos brindes" (R$), linha "Ganho líquido: R$ X" recalculada ao vivo a cada mudança nos campos. Mesma dialog reaproveitada na aba **Negócios** da `ContactDetailPage` (leva 1, Task 5), também restrita ao gestor.
- **Atendente**: não vê a opção "Editar negócio" no menu, nem qualquer valor de custo/líquido em nenhuma tela (DealCard, ficha, tabelas) — continua vendo só o valor de venda, como hoje.
- **Dashboard**: novo 5º `MetricCard` "Lucro líquido no mês" = soma de `(value - supplierValue - giftValue)` de todos os deals com `outcome: "ganho"` cujo `stageChangedAt` cai no mês corrente (mesma janela temporal que a métrica "Receita no mês" já usa). Rota já é gestor-only, então não precisa de guard extra.

## 5. Seed

Adicionar ao tenant "Amorim Imports": 2-3 fornecedores plausíveis (ex.: distribuidor de iPhones importados, distribuidor de acessórios) com 3-5 produtos cada e 2-3 entradas de histórico de preço por produto (datas relativas via `daysAgo`). Preencher `supplierValue`/`giftValue` em alguns dos deals `ganho` já existentes no seed (não em todos — realista ter negócios sem custo registrado ainda) para que o Dashboard mostre um "Lucro líquido no mês" diferente de zero desde o primeiro load.

## 6. Fora de escopo

- Vínculo automático entre criação de lead/negócio e produto do fornecedor no momento da abertura (o vínculo só acontece ao editar o negócio depois).
- Edição/remoção de entradas antigas do histórico de preço.
- Notificação ou importação automática da lista de preços via WhatsApp (permanece entrada manual).
- Permissão granular por campo a nível de reducer — a restrição atendente/gestor é feita na camada de UI, seguindo o mesmo padrão já usado para a conexão WhatsApp (leva 1, Task 10) e o Dashboard (rota gestor-only).

## 7. Testes

Cobertura em `store.test.ts`: `UPDATE_SUPPLIER_PRODUCT_PRICE` cria uma `SupplierPriceChange` e atualiza `currentPrice`/`updatedAt`; `UPDATE_DEAL_FINANCIALS` seta os 3 campos corretamente; um selector `dashboardMetrics().netProfitMonth` (ou equivalente) calculado corretamente a partir do seed; seed tem FKs válidas para as 3 novas coleções (mesma sweep de integridade já existente).
