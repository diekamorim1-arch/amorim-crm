import { describe, expect, it } from "vitest";
import { daysAgo } from "./format";
import { crmReducer } from "./store";
import { dashboardMetrics, dealsByStage, isStale, lostDeals, priceHistoryForProduct } from "./selectors";
import type { Attachment, Contact, Conversation, CrmState, Deal, Expense, Supplier, SupplierPriceChange, SupplierProduct, Tenant, User } from "./types";

function baseState(): CrmState {
  const now = new Date().toISOString();
  const tenant: Tenant = {
    id: "tenant_1",
    name: "Loja Teste",
    slug: "loja-teste",
    plan: "pro",
    status: "ativo",
    createdAt: now,
    billingStatus: "em_dia",
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
    isActive: true,
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
    expenses: [],
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

describe("crmReducer — UPDATE_DEAL", () => {
  it("substitui o deal pelo objeto informado, sem tocar em outros deals", () => {
    const state = baseState();
    const secondDeal: Deal = { ...state.deals[0], id: "deal_2", value: 999 };
    const withSecond = { ...state, deals: [...state.deals, secondDeal] };

    const updatedDeal: Deal = { ...state.deals[0], value: 7500, stage: "fechamento" };
    const next = crmReducer(withSecond, { type: "UPDATE_DEAL", deal: updatedDeal });

    expect(next.deals.find((d) => d.id === "deal_1")).toEqual(updatedDeal);
    expect(next.deals.find((d) => d.id === "deal_2")).toEqual(secondDeal);
  });

  it("usada pra reverter uma atualização otimista: reaplicar o deal original desfaz a mudança", () => {
    const state = baseState();
    const original = state.deals[0];
    const optimistic = crmReducer(state, { type: "MOVE_DEAL", dealId: "deal_1", stage: "pos_venda" });
    const reverted = crmReducer(optimistic, { type: "UPDATE_DEAL", deal: original });

    expect(reverted.deals.find((d) => d.id === "deal_1")).toEqual(original);
  });
});

describe("crmReducer — REMOVE_DEAL", () => {
  it("remove só o deal informado, sem tocar em outros deals nem no contato", () => {
    const state = baseState();
    const secondDeal: Deal = { ...state.deals[0], id: "deal_2" };
    const withSecond = { ...state, deals: [...state.deals, secondDeal] };

    const next = crmReducer(withSecond, { type: "REMOVE_DEAL", dealId: "deal_1" });

    expect(next.deals.find((d) => d.id === "deal_1")).toBeUndefined();
    expect(next.deals.find((d) => d.id === "deal_2")).toEqual(secondDeal);
    expect(next.contacts).toEqual(state.contacts);
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

describe("crmReducer — REMOVE_USER", () => {
  it("remove o usuário pelo id sem afetar os demais", () => {
    const base = baseState();
    const next = crmReducer(base, { type: "REMOVE_USER", userId: base.users[0].id });
    expect(next.users.find((u) => u.id === base.users[0].id)).toBeUndefined();
    expect(next.users).toHaveLength(base.users.length - 1);
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

describe("crmReducer — gastos", () => {
  it("ADD_EXPENSE adiciona um gasto", () => {
    const base = baseState();
    const expense: Expense = {
      id: "expense_1",
      tenantId: base.tenants[0].id,
      description: "Caixas de embalagem",
      value: 120,
      userId: base.users[0].id,
      createdAt: new Date().toISOString(),
    };
    const next = crmReducer(base, { type: "ADD_EXPENSE", expense });
    expect(next.expenses).toContainEqual(expense);
  });

  it("REMOVE_EXPENSE remove o gasto pelo id", () => {
    const base = baseState();
    const expense: Expense = {
      id: "expense_1",
      tenantId: base.tenants[0].id,
      description: "Caixas de embalagem",
      value: 120,
      userId: base.users[0].id,
      createdAt: new Date().toISOString(),
    };
    const withExpense = { ...base, expenses: [expense] };
    const next = crmReducer(withExpense, { type: "REMOVE_EXPENSE", expenseId: expense.id });
    expect(next.expenses).toHaveLength(0);
  });

  it("SET_EXPENSES substitui a lista inteira, sem acumular em remontagens repetidas", () => {
    const base = baseState();
    const stale: Expense = {
      id: "expense_stale", tenantId: base.tenants[0].id, description: "Gasto antigo",
      value: 50, userId: base.users[0].id, createdAt: new Date().toISOString(),
    };
    const fresh: Expense = {
      id: "expense_fresh", tenantId: base.tenants[0].id, description: "Gasto atual",
      value: 80, userId: base.users[0].id, createdAt: new Date().toISOString(),
    };
    const withStale = { ...base, expenses: [stale] };
    const next = crmReducer(withStale, { type: "SET_EXPENSES", expenses: [fresh] });
    expect(next.expenses).toEqual([fresh]);
  });
});

describe("crmReducer — SET_AUTH_SESSION (login real via Supabase Auth)", () => {
  it("adiciona um usuário novo (nunca visto) e seta a sessão a partir dele", () => {
    const base = baseState();
    const user: User = {
      id: "auth-user-1",
      tenantId: base.tenants[0].id,
      name: "Dieka Morim",
      email: "diekamorim1@gmail.com",
      role: "gestor",
      avatarColor: "#4f46e5",
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const next = crmReducer(base, { type: "SET_AUTH_SESSION", user });

    expect(next.users).toContainEqual(user);
    expect(next.session).toEqual({ userId: user.id, tenantId: user.tenantId, role: user.role });
  });

  it("atualiza (não duplica) um usuário já presente em state.users", () => {
    const base = baseState();
    const updatedOwner: User = { ...base.users[0], name: "Nome Atualizado" };

    const next = crmReducer(base, { type: "SET_AUTH_SESSION", user: updatedOwner });

    expect(next.users).toHaveLength(base.users.length);
    expect(next.users.find((u) => u.id === updatedOwner.id)?.name).toBe("Nome Atualizado");
    expect(next.session).toEqual({
      userId: updatedOwner.id,
      tenantId: updatedOwner.tenantId,
      role: updatedOwner.role,
    });
  });

  it("admin_saas (tenantId null) vira session.tenantId string vazia", () => {
    const base = baseState();
    const admin: User = {
      id: "auth-admin-1",
      tenantId: null,
      name: "Admin Real",
      email: "admin@amorimcrm.com.br",
      role: "admin_saas",
      avatarColor: "#0f172a",
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const next = crmReducer(base, { type: "SET_AUTH_SESSION", user: admin });
    expect(next.session).toEqual({ userId: admin.id, tenantId: "", role: "admin_saas" });
  });
});

describe("crmReducer — impersonação (ENTER_TENANT_AS_GESTOR / EXIT_IMPERSONATION)", () => {
  function stateWithAdmin(): CrmState {
    const base = baseState();
    const admin: User = {
      id: "admin_1",
      tenantId: null,
      name: "Admin Real",
      email: "admin@amorimcrm.com.br",
      role: "admin_saas",
      avatarColor: "#0f172a",
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    return {
      ...base,
      users: [...base.users, admin],
      session: { userId: admin.id, tenantId: "", role: "admin_saas" },
    };
  }

  it("ENTER_TENANT_AS_GESTOR vira session.role gestor no tenant escolhido, preservando userId do admin", () => {
    const base = stateWithAdmin();
    const next = crmReducer(base, {
      type: "ENTER_TENANT_AS_GESTOR",
      tenantId: "tenant_1",
      tenantName: "Loja Teste",
    });

    expect(next.session).toEqual({
      userId: "admin_1",
      tenantId: "tenant_1",
      role: "gestor",
      tenantName: "Loja Teste",
    });
    // state.users continua com o perfil real do admin intacto — é isso que
    // permite EXIT_IMPERSONATION reconstruir a sessão real depois.
    expect(next.users.find((u) => u.id === "admin_1")?.role).toBe("admin_saas");
  });

  it("ignora ENTER_TENANT_AS_GESTOR quando a sessão atual não é admin_saas", () => {
    const base = baseState(); // session.role === "atendente"
    const next = crmReducer(base, {
      type: "ENTER_TENANT_AS_GESTOR",
      tenantId: "tenant_1",
      tenantName: "Loja Teste",
    });
    expect(next).toBe(base);
  });

  it("EXIT_IMPERSONATION restaura a sessão real do admin a partir de state.users", () => {
    const base = stateWithAdmin();
    const impersonating = crmReducer(base, {
      type: "ENTER_TENANT_AS_GESTOR",
      tenantId: "tenant_1",
      tenantName: "Loja Teste",
    });

    const next = crmReducer(impersonating, { type: "EXIT_IMPERSONATION" });
    expect(next.session).toEqual({ userId: "admin_1", tenantId: "", role: "admin_saas" });
  });

  it("SET_AUTH_SESSION (re-sync/TOKEN_REFRESHED) preserva o tenant impersonado", () => {
    const base = stateWithAdmin();
    const impersonating = crmReducer(base, {
      type: "ENTER_TENANT_AS_GESTOR",
      tenantId: "tenant_1",
      tenantName: "Loja Teste",
    });

    // onAuthStateChange busca o profile real de novo (admin_saas) — sem a
    // guarda de wasImpersonating, isso derrubaria a sessão de volta pro
    // painel do admin no meio do trabalho dentro da loja.
    const realAdminProfile: User = impersonating.users.find((u) => u.id === "admin_1")!;
    const next = crmReducer(impersonating, { type: "SET_AUTH_SESSION", user: realAdminProfile });

    expect(next.session).toEqual({
      userId: "admin_1",
      tenantId: "tenant_1",
      role: "gestor",
      tenantName: "Loja Teste",
    });
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
    const base = baseState();
    const now = new Date().toISOString();

    // 4 contatos de origem "indicacao": thiago (sem venda), eduardo (1
    // venda), marcelo e fernanda (2 vendas cada, ou seja, clientes
    // recorrentes) — testa que won conta contatos distintos, não deals.
    const makeContact = (id: string, name: string): Contact => ({
      ...base.contacts[0],
      id,
      name,
      origin: "indicacao",
    });
    const thiago = makeContact("contact_thiago", "Thiago");
    const eduardo = makeContact("contact_eduardo", "Eduardo");
    const marcelo = makeContact("contact_marcelo", "Marcelo");
    const fernanda = makeContact("contact_fernanda", "Fernanda");

    const makeDeal = (id: string, contactId: string, outcome: Deal["outcome"]): Deal => ({
      ...base.deals[0],
      id,
      contactId,
      outcome,
      stage: outcome === "ganho" ? "pos_venda" : base.deals[0].stage,
      stageChangedAt: now,
    });

    const deals: Deal[] = [
      makeDeal("deal_thiago", thiago.id, "aberto"),
      makeDeal("deal_eduardo", eduardo.id, "ganho"),
      makeDeal("deal_marcelo_1", marcelo.id, "ganho"),
      makeDeal("deal_marcelo_2", marcelo.id, "ganho"),
      makeDeal("deal_fernanda_1", fernanda.id, "ganho"),
      makeDeal("deal_fernanda_2", fernanda.id, "ganho"),
    ];

    const state: CrmState = {
      ...base,
      contacts: [thiago, eduardo, marcelo, fernanda],
      deals,
    };

    const metrics = dashboardMetrics(state);

    // Nenhum canal pode "ganhar" mais contatos do que tem — mesmo quando um
    // contato recorrente (marcelo, fernanda) tem 2+ negócios ganhos.
    expect(metrics.byChannel.every((row) => row.won <= row.total)).toBe(true);

    const indicacao = metrics.byChannel.find((row) => row.origin === "indicacao")!;
    expect(indicacao.total).toBe(4);
    // eduardo (1 ganho), marcelo (2 ganhos) e fernanda (2 ganhos) contam uma
    // vez cada; thiago (em aberto, sem ganho) não conta.
    expect(indicacao.won).toBe(3);
  });
});

describe("crmReducer — SET_REMOTE_DATA e LOGOUT", () => {
  it("SET_REMOTE_DATA substitui contacts/deals/appointments/suppliers preservando o resto do state", () => {
    const base = baseState();
    const newContact: Contact = { ...base.contacts[0], id: "contact_remote", name: "Cliente Remoto" };
    const newDeal: Deal = { ...base.deals[0], id: "deal_remote", contactId: newContact.id };
    const newSupplier: Supplier = {
      id: "supplier_remote", tenantId: base.tenants[0].id, name: "Fornecedor Remoto",
      whatsapp: "+5511900000099", createdAt: new Date().toISOString(),
    };

    const next = crmReducer(base, {
      type: "SET_REMOTE_DATA",
      contacts: [newContact],
      deals: [newDeal],
      appointments: [],
      users: [],
      suppliers: [newSupplier],
      supplierProducts: [],
    });

    expect(next.contacts).toEqual([newContact]);
    expect(next.deals).toEqual([newDeal]);
    expect(next.appointments).toEqual([]);
    expect(next.suppliers).toEqual([newSupplier]);
    expect(next.tenants).toBe(base.tenants);
    expect(next.session).toBe(base.session);
  });

  it("SET_REMOTE_DATA substitui users só do tenant ativo, preservando usuários de outros tenants", () => {
    const base = baseState();
    const otherTenantUser: User = { ...base.users[0], id: "user_other_tenant", tenantId: "outro-tenant" };
    const withOtherUser = { ...base, users: [...base.users, otherTenantUser] };

    const freshUser: User = { ...base.users[0], name: "Nome Atualizado do Backend" };
    const next = crmReducer(withOtherUser, {
      type: "SET_REMOTE_DATA",
      contacts: [],
      deals: [],
      appointments: [],
      users: [freshUser],
      suppliers: [],
      supplierProducts: [],
    });

    expect(next.users).toContainEqual(freshUser);
    expect(next.users).toContainEqual(otherTenantUser);
    expect(next.users.find((u) => u.id === base.users[0].id && u.name === base.users[0].name)).toBeUndefined();
  });

  it("LOGOUT zera a sessão sem mexer nas demais coleções", () => {
    const base = baseState();
    const next = crmReducer(base, { type: "LOGOUT" });
    expect(next.session).toBeNull();
    expect(next.users).toBe(base.users);
    expect(next.contacts).toBe(base.contacts);
  });

});
