import { describe, expect, it } from "vitest";
import { daysAgo } from "./format";
import { crmReducer, isValidPersistedState } from "./store";
import { buildSeed } from "./seed";
import { currentUser, dashboardMetrics, dealsByStage, isStale, lostDeals, priceHistoryForProduct, tenantScope } from "./selectors";
import type { Attachment, Contact, Conversation, CrmState, Deal, Supplier, SupplierPriceChange, SupplierProduct, Tenant, User } from "./types";

function baseState(): CrmState {
  const now = new Date().toISOString();
  const tenant: Tenant = {
    id: "tenant_1",
    name: "Loja Teste",
    slug: "loja-teste",
    plan: "pro",
    status: "ativo",
    createdAt: now,
    settings: {
      tags: [],
      lossReasons: ["preco", "prazo_entrega", "sem_modelo", "concorrencia", "sem_resposta", "desistiu"],
      businessHours: "09:00-18:00",
    },
  };
  const owner: User = {
    id: "user_1",
    tenantId: tenant.id,
    name: "Atendente Teste",
    email: "atendente@teste.com.br",
    role: "atendente",
    avatarColor: "#4f46e5",
    createdAt: now,
  };
  const contact: Contact = {
    id: "contact_1",
    tenantId: tenant.id,
    name: "Cliente Teste",
    whatsapp: "+55 11 90000-0000",
    origin: "whatsapp_direto",
    interests: ["iphone"],
    tags: [],
    journeyStatus: "lead",
    ownerId: owner.id,
    firstContactAt: now,
    lastInteractionAt: now,
    createdAt: now,
  };
  const conversation: Conversation = {
    id: "conv_1",
    tenantId: tenant.id,
    contactId: contact.id,
    assigneeId: owner.id,
    status: "aberta",
    unread: 0,
    createdAt: now,
  };
  const deal: Deal = {
    id: "deal_1",
    tenantId: tenant.id,
    contactId: contact.id,
    title: "iPhone 15",
    products: "iPhone 15 128GB",
    value: 5000,
    payment: "pix",
    tradeIn: false,
    stage: "negociacao",
    outcome: "aberto",
    ownerId: owner.id,
    stageChangedAt: new Date(Date.now() - 60_000).toISOString(),
    createdAt: now,
  };

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
}

describe("crmReducer — MOVE_DEAL", () => {
  it("move para pos_venda seta outcome ganho, cria activity venda e promove contato a cliente", () => {
    const state = baseState();
    const next = crmReducer(state, { type: "MOVE_DEAL", dealId: "deal_1", stage: "pos_venda" });

    const deal = next.deals.find((d) => d.id === "deal_1")!;
    expect(deal.stage).toBe("pos_venda");
    expect(deal.outcome).toBe("ganho");
    expect(deal.stageChangedAt).not.toBe(state.deals[0].stageChangedAt);

    const contact = next.contacts.find((c) => c.id === "contact_1")!;
    expect(contact.journeyStatus).toBe("cliente");

    expect(next.activities.some((a) => a.type === "venda" && a.dealId === "deal_1")).toBe(true);
    expect(next.activities.some((a) => a.type === "mudanca_estagio" && a.dealId === "deal_1")).toBe(true);
  });

  it("qualquer movimentação atualiza stageChangedAt e cria activity mudanca_estagio", () => {
    const state = baseState();
    const next = crmReducer(state, { type: "MOVE_DEAL", dealId: "deal_1", stage: "fechamento" });
    const deal = next.deals.find((d) => d.id === "deal_1")!;
    expect(deal.stage).toBe("fechamento");
    expect(deal.outcome).toBe("aberto");
    expect(next.activities.some((a) => a.type === "mudanca_estagio" && a.dealId === "deal_1")).toBe(true);
  });

  it("segundo deal ganho do mesmo contato promove journeyStatus a recorrente", () => {
    let state = baseState();
    const secondDeal: Deal = { ...state.deals[0], id: "deal_2" };
    state = { ...state, deals: [...state.deals, secondDeal] };

    state = crmReducer(state, { type: "MOVE_DEAL", dealId: "deal_1", stage: "pos_venda" });
    let contact = state.contacts.find((c) => c.id === "contact_1")!;
    expect(contact.journeyStatus).toBe("cliente");

    state = crmReducer(state, { type: "MOVE_DEAL", dealId: "deal_2", stage: "pos_venda" });
    contact = state.contacts.find((c) => c.id === "contact_1")!;
    expect(contact.journeyStatus).toBe("recorrente");
  });
});

describe("crmReducer — MARK_DEAL_LOST", () => {
  it("exige reason, marca outcome perdido e o deal some do board mas aparece em lostDeals", () => {
    const state = baseState();
    const next = crmReducer(state, { type: "MARK_DEAL_LOST", dealId: "deal_1", reason: "preco" });

    const deal = next.deals.find((d) => d.id === "deal_1")!;
    expect(deal.outcome).toBe("perdido");
    expect(deal.lossReason).toBe("preco");

    const byStage = dealsByStage(next);
    expect(byStage.negociacao.some((d) => d.id === "deal_1")).toBe(false);
    expect(lostDeals(next).some((d) => d.id === "deal_1")).toBe(true);
  });
});

describe("crmReducer — mensagens", () => {
  it("SEND_MESSAGE cria Message, atualiza lastInteractionAt do contato e cria Activity mensagem", () => {
    const state = baseState();
    const before = state.contacts[0].lastInteractionAt;

    const next = crmReducer(state, {
      type: "SEND_MESSAGE",
      conversationId: "conv_1",
      text: "Olá! Temos o iPhone disponível sim.",
      authorId: "user_1",
    });

    const contact = next.contacts.find((c) => c.id === "contact_1")!;
    expect(new Date(contact.lastInteractionAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
    expect(
      next.messages.some(
        (m) => m.conversationId === "conv_1" && m.direction === "out" && m.text.includes("iPhone disponível"),
      ),
    ).toBe(true);
    expect(next.activities.some((a) => a.type === "mensagem")).toBe(true);
  });

  it("RECEIVE_MESSAGE incrementa unread da conversa e também atualiza lastInteractionAt/Activity", () => {
    const state = baseState();
    const next = crmReducer(state, {
      type: "RECEIVE_MESSAGE",
      conversationId: "conv_1",
      text: "Oi, tudo bem? Quero saber sobre o iPhone.",
    });

    const conv = next.conversations.find((c) => c.id === "conv_1")!;
    expect(conv.unread).toBe(1);
    expect(next.messages.some((m) => m.conversationId === "conv_1" && m.direction === "in")).toBe(true);
    expect(next.activities.some((a) => a.type === "mensagem")).toBe(true);
  });
});

describe("crmReducer — RESET_DEMO", () => {
  // buildSeed() gera todos os ids via crypto.randomUUID() — não são estáveis
  // entre chamadas. Por isso a asserção antiga (`next.session).toEqual(state.session)`)
  // só passava porque o reducer fazia um blind copy de `state.session`, sem
  // validar que aqueles ids ainda existiam na seed nova — exatamente o bug:
  // currentUser()/tenantScope() ficavam vazios/null depois do reset. As
  // asserções abaixo re-resolvem por e-mail (estável) e verificam que a tela
  // não fica em branco.
  it("re-resolve a sessão de um usuário real da seed por e-mail: currentUser não fica null e tenantScope tem dados", () => {
    const seed = buildSeed();
    const tenant1 = seed.tenants.find((t) => t.slug === "amorim-imports")!;
    const rafael = seed.users.find((u) => u.name === "Rafael Amorim")!;
    const state: CrmState = { ...seed, session: { userId: rafael.id, tenantId: tenant1.id, role: "gestor" } };

    const next = crmReducer(state, { type: "RESET_DEMO" });

    expect(next.session).not.toBeNull();
    const me = currentUser(next);
    expect(me).not.toBeNull();
    expect(me?.email).toBe(rafael.email);
    expect(me?.role).toBe(rafael.role);

    expect(tenantScope(next).contacts.length).toBeGreaterThan(0);
    expect(next.tenants.length).toBeGreaterThan(0);
    expect(next.contacts.length).toBeGreaterThan(0);
  });

  it("sessão cujo e-mail não existe na seed nova (dados sintéticos de teste) cai com segurança para sessão nula, sem quebrar as coleções", () => {
    // baseState() usa ids e e-mail sintéticos que nunca existirão numa seed
    // real gerada por buildSeed(). Sem correspondência por e-mail, o reducer
    // não deve inventar uma sessão inválida: cai para `fresh` (session: null),
    // que redireciona ao /login com segurança em vez de deixar a UI presa
    // numa sessão-fantasma.
    const state = baseState();
    const next = crmReducer(state, { type: "RESET_DEMO" });
    expect(next.session).toBeNull();
    expect(next.tenants.length).toBeGreaterThan(0);
    expect(next.contacts.length).toBeGreaterThan(0);
  });

  it("sem sessão, apenas restaura o seed (sem tentar resolver usuário)", () => {
    const state = { ...baseState(), session: null };
    const next = crmReducer(state, { type: "RESET_DEMO" });
    expect(next.session).toBeNull();
    expect(next.tenants.length).toBeGreaterThan(0);
  });
});

describe("crmReducer — ADD_CONVERSATION", () => {
  it("adiciona uma conversa nova ao state", () => {
    const state = baseState();
    const conversation: Conversation = {
      id: "conv_new",
      tenantId: state.tenants[0].id,
      contactId: state.contacts[0].id,
      assigneeId: null,
      status: "aberta",
      unread: 0,
      createdAt: new Date().toISOString(),
    };

    const next = crmReducer(state, { type: "ADD_CONVERSATION", conversation });
    expect(next.conversations).toHaveLength(state.conversations.length + 1);
    expect(next.conversations.some((c) => c.id === "conv_new")).toBe(true);
  });
});

describe("crmReducer — ENTER_TENANT_AS_GESTOR (impersonação)", () => {
  it("assume tenantId + role gestor mantendo o userId do admin, e SWITCH_SESSION de volta restaura role admin_saas", () => {
    const seed = buildSeed();
    const admin = seed.users.find((u) => u.role === "admin_saas")!;
    const tenant = seed.tenants[0];
    const state: CrmState = { ...seed, session: { userId: admin.id, tenantId: "", role: "admin_saas" } };

    const impersonated = crmReducer(state, { type: "ENTER_TENANT_AS_GESTOR", tenantId: tenant.id });
    expect(impersonated.session).toEqual({ userId: admin.id, tenantId: tenant.id, role: "gestor" });

    const restored = crmReducer(impersonated, { type: "SWITCH_SESSION", userId: admin.id });
    expect(restored.session).toEqual({ userId: admin.id, tenantId: "", role: "admin_saas" });
  });
});

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
      // Backdatado (mesmo padrão de `deal.stageChangedAt` em baseState()):
      // evita flakiness na asserção `updatedAt` não igual a `now` do reducer,
      // que pode cair no mesmo milissegundo se não houver essa folga.
      updatedAt: new Date(Date.now() - 60_000).toISOString(),
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

  it("UPDATE_DEAL_FINANCIALS seta value/supplierProductId/supplierValue/giftValue/freightValue sem mexer no estágio", () => {
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
      freightValue: 80,
    });

    const updated = next.deals.find((d) => d.id === dealId);
    expect(updated?.value).toBe(5200);
    expect(updated?.supplierProductId).toBe(product.id);
    expect(updated?.supplierValue).toBe(3800);
    expect(updated?.giftValue).toBe(150);
    expect(updated?.freightValue).toBe(80);
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
});

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
  it("soma (valor - fornecedor - brindes - frete) só dos deals ganhos no mês", () => {
    const base = baseState();
    const wonThisMonth: Deal = {
      ...base.deals[0],
      id: "deal_won_1",
      outcome: "ganho",
      stage: "pos_venda",
      value: 5000,
      supplierValue: 3800,
      giftValue: 100,
      freightValue: 50,
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
    // (5000 - 3800 - 100 - 50) + (2000 - 0 - 0 - 0) = 1050 + 2000
    expect(metrics.netProfitMonth).toBe(3050);
  });
});

describe("isStale", () => {
  const minimalDeal: Deal = {
    id: "deal_x",
    tenantId: "tenant_1",
    contactId: "contact_1",
    title: "iPhone 15",
    products: "iPhone 15 128GB",
    value: 5000,
    payment: "pix",
    tradeIn: false,
    stage: "negociacao",
    outcome: "aberto",
    ownerId: "user_1",
    stageChangedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  it("true para deal parado há 4 dias com outcome aberto", () => {
    const deal: Deal = { ...minimalDeal, stageChangedAt: daysAgo(4) };
    expect(isStale(deal)).toBe(true);
  });

  it("false para deal parado há 1 dia", () => {
    const deal: Deal = { ...minimalDeal, stageChangedAt: daysAgo(1) };
    expect(isStale(deal)).toBe(false);
  });

  it("false quando outcome não é aberto, mesmo parado há muitos dias", () => {
    const deal: Deal = { ...minimalDeal, stageChangedAt: daysAgo(10), outcome: "ganho" };
    expect(isStale(deal)).toBe(false);
  });
});

describe("dashboardMetrics", () => {
  it("inNegotiationValue soma deals abertos em negociacao e em fechamento", () => {
    let state = baseState();
    // state.deals[0] já é negociacao/aberto, value 5000.
    const fechamentoDeal: Deal = { ...state.deals[0], id: "deal_2", stage: "fechamento", value: 3000 };
    state = { ...state, deals: [...state.deals, fechamentoDeal] };

    const metrics = dashboardMetrics(state);
    expect(metrics.inNegotiationValue).toBe(5000 + 3000);
  });

  it("byChannel.won conta contatos distintos com ao menos uma venda, nunca passando de total", () => {
    const seed = buildSeed();
    const tenant1 = seed.tenants.find((t) => t.slug === "amorim-imports")!;
    const rafael = seed.users.find((u) => u.name === "Rafael Amorim")!;
    const state: CrmState = { ...seed, session: { userId: rafael.id, tenantId: tenant1.id, role: "gestor" } };

    const metrics = dashboardMetrics(state);

    // Nenhum canal pode "ganhar" mais contatos do que tem — mesmo quando um
    // contato recorrente (marcelo, fernanda) tem 2+ negócios ganhos.
    expect(metrics.byChannel.every((row) => row.won <= row.total)).toBe(true);

    const indicacao = metrics.byChannel.find((row) => row.origin === "indicacao")!;
    expect(indicacao.total).toBe(4); // thiago, eduardo, marcelo, fernanda
    // eduardo (1 ganho), marcelo (2 ganhos) e fernanda (2 ganhos) contam uma
    // vez cada; thiago (em negociação, sem ganho) não conta.
    expect(indicacao.won).toBe(3);
  });
});

describe("buildSeed", () => {
  it("todo registro de cada coleção tem tenantId válido e FKs existentes", () => {
    const seed = buildSeed();

    const tenantIds = new Set(seed.tenants.map((t) => t.id));
    const userIds = new Set(seed.users.map((u) => u.id));
    const contactIds = new Set(seed.contacts.map((c) => c.id));
    const dealIds = new Set(seed.deals.map((d) => d.id));
    const conversationIds = new Set(seed.conversations.map((c) => c.id));

    expect(seed.users.every((u) => u.tenantId === null || tenantIds.has(u.tenantId))).toBe(true);

    for (const c of seed.contacts) {
      expect(tenantIds.has(c.tenantId)).toBe(true);
      expect(userIds.has(c.ownerId)).toBe(true);
    }
    for (const d of seed.deals) {
      expect(tenantIds.has(d.tenantId)).toBe(true);
      expect(contactIds.has(d.contactId)).toBe(true);
      expect(userIds.has(d.ownerId)).toBe(true);
      if (d.outcome === "perdido") expect(d.lossReason).toBeDefined();
    }
    for (const conv of seed.conversations) {
      expect(tenantIds.has(conv.tenantId)).toBe(true);
      expect(contactIds.has(conv.contactId)).toBe(true);
      if (conv.assigneeId) expect(userIds.has(conv.assigneeId)).toBe(true);
    }
    for (const m of seed.messages) {
      expect(tenantIds.has(m.tenantId)).toBe(true);
      expect(conversationIds.has(m.conversationId)).toBe(true);
      if (m.authorId) expect(userIds.has(m.authorId)).toBe(true);
    }
    for (const a of seed.appointments) {
      expect(tenantIds.has(a.tenantId)).toBe(true);
      expect(contactIds.has(a.contactId)).toBe(true);
      expect(userIds.has(a.ownerId)).toBe(true);
      if (a.dealId) expect(dealIds.has(a.dealId)).toBe(true);
    }
    for (const act of seed.activities) {
      expect(tenantIds.has(act.tenantId)).toBe(true);
      expect(contactIds.has(act.contactId)).toBe(true);
      expect(userIds.has(act.userId)).toBe(true);
      if (act.dealId) expect(dealIds.has(act.dealId)).toBe(true);
    }
    for (const conn of seed.connections) {
      expect(tenantIds.has(conn.tenantId)).toBe(true);
      expect(userIds.has(conn.userId)).toBe(true);
    }
  });

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

  it("respeita as quantidades do briefing por tenant e as marcas de isolamento", () => {
    const seed = buildSeed();
    const tenant1 = seed.tenants.find((t) => t.slug === "amorim-imports")!;
    const tenant2 = seed.tenants.find((t) => t.slug === "techstore-sp")!;
    expect(tenant1).toBeDefined();
    expect(tenant2).toBeDefined();

    const countFor = <T extends { tenantId: string }>(arr: T[], id: string) =>
      arr.filter((x) => x.tenantId === id).length;

    expect(countFor(seed.contacts, tenant1.id)).toBe(14);
    expect(countFor(seed.conversations, tenant1.id)).toBe(8);
    expect(countFor(seed.appointments, tenant1.id)).toBe(10);

    // Board: 2 deals abertos em cada estágio ativo; 2 perdidos; o restante são ganhos (histórico de compras).
    const tenant1Deals = seed.deals.filter((d) => d.tenantId === tenant1.id);
    const openByStage = (stage: string) =>
      tenant1Deals.filter((d) => d.outcome === "aberto" && d.stage === stage).length;
    expect(openByStage("novo_lead")).toBe(2);
    expect(openByStage("em_atendimento")).toBe(2);
    expect(openByStage("negociacao")).toBe(2);
    expect(openByStage("fechamento")).toBe(2);
    expect(tenant1Deals.filter((d) => d.outcome === "perdido").length).toBe(2);
    expect(tenant1Deals.filter((d) => d.outcome === "ganho").length).toBe(13);
    expect(tenant1Deals.length).toBe(23);

    expect(countFor(seed.contacts, tenant2.id)).toBe(4);
    expect(countFor(seed.deals, tenant2.id)).toBe(3);
    expect(countFor(seed.conversations, tenant2.id)).toBe(2);
    expect(countFor(seed.appointments, tenant2.id)).toBe(2);

    const leads = seed.contacts.filter((c) => c.tenantId === tenant1.id && c.journeyStatus === "lead");
    const clientes = seed.contacts.filter((c) => c.tenantId === tenant1.id && c.journeyStatus === "cliente");
    const recorrentes = seed.contacts.filter((c) => c.tenantId === tenant1.id && c.journeyStatus === "recorrente");
    expect(leads.length).toBe(5);
    expect(clientes.length).toBe(5);
    expect(recorrentes.length).toBe(4);

    // journeyStatus lastreado no histórico de compras: lead = 0 ganhos, cliente = 1, recorrente ≥ 2
    const wonCountFor = (contactId: string) =>
      seed.deals.filter((d) => d.contactId === contactId && d.outcome === "ganho").length;
    for (const lead of leads) expect(wonCountFor(lead.id)).toBe(0);
    for (const cliente of clientes) expect(wonCountFor(cliente.id)).toBe(1);
    for (const recorrente of recorrentes) expect(wonCountFor(recorrente.id)).toBeGreaterThanOrEqual(2);

    const unassignedUnread = seed.conversations.filter(
      (c) => c.tenantId === tenant1.id && c.assigneeId === null && c.unread > 0,
    );
    expect(unassignedUnread.length).toBe(2);

    const staleDeals = seed.deals.filter((d) => d.tenantId === tenant1.id && isStale(d));
    expect(staleDeals.length).toBe(1);

    const lostReasons = seed.deals
      .filter((d) => d.tenantId === tenant1.id && d.outcome === "perdido")
      .map((d) => d.lossReason);
    expect(lostReasons.sort()).toEqual(["preco", "sem_resposta"]);

    // admin_saas não pertence a nenhum tenant
    const admin = seed.users.find((u) => u.role === "admin_saas")!;
    expect(admin.tenantId).toBeNull();

    // isolamento: nenhum contato/deal/conversa do tenant 2 referencia um usuário do tenant 1
    const tenant1UserIds = new Set(seed.users.filter((u) => u.tenantId === tenant1.id).map((u) => u.id));
    const tenant2Contacts = seed.contacts.filter((c) => c.tenantId === tenant2.id);
    expect(tenant2Contacts.every((c) => !tenant1UserIds.has(c.ownerId))).toBe(true);
  });
});

describe("isValidPersistedState — migração de localStorage legado", () => {
  it("rejeita um estado legado (anterior à Task 1) que tem tenants mas não tem as coleções de fornecedores", () => {
    // Formato de um blob salvo por uma sessão de browser ANTES da Task 1
    // introduzir suppliers/supplierProducts/supplierPriceChanges: `tenants`
    // existe e é array (passaria numa checagem fraca de "Array.isArray(tenants)"),
    // mas as 3 coleções novas não existem em lugar nenhum do objeto.
    const legacyState = {
      tenants: [{ id: "tenant_1", name: "Loja Legada" }],
      users: [],
      contacts: [],
      deals: [],
      conversations: [],
      messages: [],
      appointments: [],
      activities: [],
      connections: [],
      session: null,
      // sem suppliers / supplierProducts / supplierPriceChanges
    };

    expect(isValidPersistedState(legacyState)).toBe(false);
  });

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

  it("rejeita valores não-objeto (null, undefined, string, array solto)", () => {
    expect(isValidPersistedState(null)).toBe(false);
    expect(isValidPersistedState(undefined)).toBe(false);
    expect(isValidPersistedState("not an object")).toBe(false);
    expect(isValidPersistedState([])).toBe(false);
  });
});
