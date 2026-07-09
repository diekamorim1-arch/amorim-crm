# Ajustes Finais do CRM — Leva 1.2

**Data:** 09/07/2026
**Status:** Design aprovado — pronto para plano de implementação
**Contexto:** Cinco melhorias no frontend do Amorim CRM (`amorim-crm`), sobre a base já entregue nas levas 1 (12 tasks) e 1.1 (Fornecedores/Custos, 6 tasks). Todas as mudanças são no frontend (localStorage/reducer); nenhuma toca o backend FastAPI+Supabase construído em paralelo.

---

## 1. Editar produtos de fornecedor (nome + preço)

**Hoje:** `SupplierProductDialog.tsx` só cria (`ADD_SUPPLIER_PRODUCT`); `EditPriceDialog.tsx` edita só o preço (`UPDATE_SUPPLIER_PRODUCT_PRICE`, cria um `SupplierPriceChange`). Não existe forma de renomear um produto já cadastrado.

**Mudança:**
- `SupplierProductDialog` vira dual-mode via prop opcional `product?: SupplierProduct` — mesmo padrão de `SupplierFormDialog.tsx` (`isEdit = !!product`, reset dos valores no `useEffect` por `open`/`product?.id`, título/texto do botão condicionais).
- Nova action no reducer (`lib/store.tsx`): `UPDATE_SUPPLIER_PRODUCT { productId, name, price }`. Regra: atualiza `name` sempre; compara `price` com o `currentPrice` atual do produto — se forem diferentes, atualiza `currentPrice`/`updatedAt` **e** cria uma nova entrada em `supplierPriceChanges` (mesma lógica já usada por `UPDATE_SUPPLIER_PRODUCT_PRICE`, que continua existindo sem mudança).
- `EditPriceDialog` e o botão "Editar preço" em `SupplierDetailPage.tsx` **permanecem inalterados** — continuam sendo o atalho rápido só-preço.
- Nenhum botão novo é adicionado à linha do produto. A forma de abrir o dialog em modo edição é o duplo-clique (ver Seção 3).

## 2. Editar o valor da venda (`deal.value`)

**Hoje:** `EditDealDialog.tsx` edita `supplierValue`/`giftValue` (custo) via `UPDATE_DEAL_FINANCIALS`. Não há campo para editar `deal.value` (o valor cobrado do cliente).

**Mudança:**
- Novo campo "Valor da venda" no `EditDealDialog`, editável, pré-preenchido com `deal.value` atual.
- "Ganho líquido" (`deal.value - supplierValue - giftValue`) recalculado ao vivo a cada mudança em qualquer um dos 3 campos (valor da venda, custo, brindes) — já é assim para os 2 campos existentes, só estende a mesma lógica.
- `UPDATE_DEAL_FINANCIALS` (reducer) passa a aceitar e persistir `value` além de `supplierProductId`/`supplierValue`/`giftValue`.
- Dialog compartilhado entre `PipelinePage.tsx` (card do Kanban) e `ContactDetailPage.tsx` (aba Negócios) — a mudança vale para os dois automaticamente, sem tocar nesses dois arquivos além do já necessário para o item 3.

## 3. Duplo-clique para editar (Pipeline e Fornecedores)

**Regra geral:** duplo-clique é sempre um atalho adicional — nunca substitui um controle já clicável/navegável existente.

- **`DealCard.tsx`:** `onDoubleClick` no `<div>` raiz do card chama `onEditDeal(deal)` quando a prop existir (mesma condição que já rege o item "Editar negócio" do menu "⋮" — ambos só aparecem/funcionam para gestor, decidido pelos pais). O menu "⋮" continua exatamente como está. Verificar que o `draggable`/`onDragStart` nativo não conflita com o duplo-clique (o HTML5 DnD não impede `onDoubleClick` de disparar normalmente).
- **`SuppliersPage.tsx`:** card do fornecedor ganha `onDoubleClick` abrindo `SupplierFormDialog` em modo edição; o clique único continua navegando para `/fornecedores/:id` como hoje.
- **`SupplierDetailPage.tsx`:** cada linha de produto ganha `onDoubleClick` abrindo `SupplierProductDialog` em modo edição (item 1). "Editar preço" continua ao lado, inalterado.

## 4. Aba de anexos (comprovante de pagamento) na ficha do lead

**Hoje:** não existe conceito de anexo em `lib/types.ts` nem no reducer. `ContactDetailPage.tsx` tem as abas Dados, Negócios, Compras, Agendamentos, Timeline.

**Mudança:**
- Novo tipo em `lib/types.ts`:
  ```ts
  interface Attachment {
    id: string; tenantId: string; contactId: string; dealId?: string;
    fileName: string; fileType: string; dataUrl: string;
    uploadedBy: string; uploadedAt: string;
  }
  ```
- `attachments: Attachment[]` adicionado ao `CrmState`, ao seed (`lib/seed.ts` — arrays vazios são suficientes, sem necessidade de popular dados de exemplo) e ao `tenantScope` (`lib/selectors.ts`).
- Novas actions no reducer: `ADD_ATTACHMENT { attachment }`, `REMOVE_ATTACHMENT { attachmentId }`.
- `isValidPersistedState` (guard de migração do localStorage, `lib/store.tsx`) passa a exigir `attachments` como array — mesma proteção já existente para `suppliers`/`supplierProducts`/`supplierPriceChanges`, evitando que uma sessão de navegador anterior a esta leva quebre ao carregar.
- Nova aba "Comprovantes" em `ContactDetailPage.tsx`: input de arquivo (`accept="image/*,.pdf"`), conversão para base64 via `FileReader`, **limite de 5MB por arquivo** (validação antes da leitura, com mensagem de erro clara se exceder — o limite prático do localStorage por origem já foi aceito pelo usuário para o total acumulado, mas um teto por arquivo evita que um único PDF grande consuma esse orçamento de uma vez). Lista de anexos com miniatura/preview (imagem real para `image/*`, ícone genérico para PDF), nome do arquivo, data (`relativeTime`), nome de quem enviou (via `users` do `tenantScope`) e botão remover.
- O formulário de upload **não** tem seletor de negócio — `dealId` fica sempre `undefined` neste momento (campo existe no tipo para uso futuro, sem UI para preenchê-lo agora).

## 5. Seleção de produto do catálogo de fornecedores nos leads

**Hoje:** `AddLeadDialog.tsx` e `QuickDealDialog.tsx` usam um `Select` genérico de `ProductLine` (`PRODUCT_LINE_LABELS`), sem ler `supplierProducts`. `EditDealDialog.tsx` já tem a cascata fornecedor→produto, mas só para vincular custo depois que o negócio existe.

**Mudança:**
- Em ambos os dialogs, o `Select` de "Produto de interesse"/"Produto" é substituído pela mesma cascata fornecedor→produto do `EditDealDialog` (2 `Select`s: fornecedor, depois produto filtrado por `supplierId`), lendo `tenantScope(state).suppliers`/`supplierProducts` via `useCrm()`. Lista todos os produtos cadastrados — sem filtro de disponibilidade (confirmado: nenhum produto cadastrado é considerado indisponível).
- Ao escolher um produto: `deal.title`/`deal.products` recebem o nome do produto; `deal.supplierProductId` é gravado; `deal.supplierValue` é preenchido com `product.currentPrice` (custo).
- O campo "Valor estimado" (`deal.value`, preço de venda) **continua editável separadamente e nunca é sobrescrito automaticamente** pela escolha do produto — são conceitos diferentes (custo vs. venda).
- Em `AddLeadDialog`, como o `Select` de `ProductLine` é removido, `contact.interests` deixa de ser preenchido na criação do lead (antes vinha do `productLine` escolhido) — fica como array vazio. Não foi pedido mapear produto de fornecedor → `ProductLine`, então isso é aceito como está por ora. `QuickDealDialog` nunca preencheu `interests` (não cria contato), então não é afetado por essa mudança.
- `ProductLine`/`PRODUCT_LINE_LABELS` continuam existindo no código (usados em outros lugares, ex.: exibição de `interests` na aba Dados) — só deixam de aparecer nesses 2 dialogs.

## 6. Fora de escopo

- Campo `availableToday`/disponibilidade de produto (decidido: não criar).
- Seletor de negócio no upload de anexo (campo `dealId` existe no tipo, sem UI).
- Mapeamento produto de fornecedor → `ProductLine`/`contact.interests`.
- Qualquer mudança no backend Python/FastAPI — esta leva é 100% frontend.
