// Dados de demonstração do Amorim CRM: duas lojas (multi-tenant) com contatos,
// negociações, conversas de WhatsApp, agenda e atividades realistas.
//
// Todas as datas são relativas a "agora" via daysAgo()/hoursAgo(), então a
// demo sempre parece atual, não importa quando for aberta.

import { daysAgo, hoursAgo } from "./format";
import type {
  Activity,
  ActivityType,
  Appointment,
  Contact,
  Conversation,
  CrmState,
  Deal,
  Message,
  Tenant,
  User,
  WhatsAppConnection,
} from "./types";

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

/** Soma minutos a um ISO string — usado para derivar `endsAt` a partir de `startsAt`. */
function plusMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

// ---------------------------------------------------------------------------
// Tenants
// ---------------------------------------------------------------------------

function buildTenants(): { tenant1: Tenant; tenant2: Tenant } {
  const tenant1: Tenant = {
    id: newId("tenant"),
    name: "Amorim Imports",
    slug: "amorim-imports",
    plan: "pro",
    status: "ativo",
    createdAt: daysAgo(400),
    settings: {
      tags: ["vip", "troca", "indicação", "quente", "combo", "negociando"],
      lossReasons: ["preco", "prazo_entrega", "sem_modelo", "concorrencia", "sem_resposta", "desistiu"],
      businessHours: "Seg a Sex 09h-19h, Sáb 09h-14h",
    },
  };

  const tenant2: Tenant = {
    id: newId("tenant"),
    name: "TechStore SP",
    slug: "techstore-sp",
    plan: "starter",
    status: "ativo",
    createdAt: daysAgo(120),
    settings: {
      tags: ["novo"],
      lossReasons: ["preco", "prazo_entrega", "sem_modelo", "concorrencia", "sem_resposta", "desistiu"],
      businessHours: "Seg a Sex 10h-18h",
    },
  };

  return { tenant1, tenant2 };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

function buildUsers(tenant1Id: string, tenant2Id: string) {
  const rafael: User = {
    id: newId("user"),
    tenantId: tenant1Id,
    name: "Rafael Amorim",
    email: "rafael@amorimimports.com.br",
    role: "gestor",
    avatarColor: "#1D4ED8",
    createdAt: daysAgo(400),
  };
  const juliana: User = {
    id: newId("user"),
    tenantId: tenant1Id,
    name: "Juliana Costa",
    email: "juliana@amorimimports.com.br",
    role: "atendente",
    avatarColor: "#DB2777",
    createdAt: daysAgo(380),
  };
  const samuel: User = {
    id: newId("user"),
    tenantId: tenant1Id,
    name: "Samuel Ferreira",
    email: "samuel@amorimimports.com.br",
    role: "atendente",
    avatarColor: "#059669",
    createdAt: daysAgo(300),
  };
  const marcos: User = {
    id: newId("user"),
    tenantId: tenant2Id,
    name: "Marcos Lima",
    email: "marcos@techstoresp.com.br",
    role: "gestor",
    avatarColor: "#EA580C",
    createdAt: daysAgo(120),
  };
  const ana: User = {
    id: newId("user"),
    tenantId: tenant2Id,
    name: "Ana Souza",
    email: "ana@techstoresp.com.br",
    role: "atendente",
    avatarColor: "#7C3AED",
    createdAt: daysAgo(100),
  };
  const diego: User = {
    id: newId("user"),
    tenantId: null,
    name: "Diego Amorim",
    email: "diego@amorimcrm.com.br",
    role: "admin_saas",
    avatarColor: "#0F172A",
    createdAt: daysAgo(500),
  };

  return { rafael, juliana, samuel, marcos, ana, diego };
}

// ---------------------------------------------------------------------------
// Tenant 1 — Amorim Imports — Contatos
// ---------------------------------------------------------------------------

function buildTenant1Contacts(tenantId: string, u: ReturnType<typeof buildUsers>) {
  const bruno: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Bruno Tavares",
    whatsapp: "+55 11 98211-4432",
    instagram: "@bruno.tavares",
    origin: "instagram_ads",
    interests: ["iphone"],
    tags: ["quente"],
    journeyStatus: "lead",
    ownerId: u.juliana.id,
    firstContactAt: daysAgo(1),
    lastInteractionAt: hoursAgo(2),
    createdAt: daysAgo(1),
  };
  const larissa: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Larissa Menezes",
    whatsapp: "+55 11 97754-2201",
    origin: "instagram_organico",
    interests: ["watch"],
    tags: [],
    journeyStatus: "lead",
    ownerId: u.samuel.id,
    firstContactAt: hoursAgo(6),
    lastInteractionAt: hoursAgo(1),
    createdAt: hoursAgo(6),
  };
  const diegoRocha: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Diego Rocha",
    whatsapp: "+55 11 96632-8890",
    origin: "whatsapp_direto",
    interests: ["ipad"],
    tags: ["troca"],
    journeyStatus: "lead",
    ownerId: u.juliana.id,
    firstContactAt: daysAgo(5),
    lastInteractionAt: hoursAgo(4),
    createdAt: daysAgo(5),
  };
  const camila: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Camila Duarte",
    whatsapp: "+55 11 95521-7743",
    instagram: "@camiladuarte",
    origin: "instagram_ads",
    interests: ["mac"],
    tags: [],
    journeyStatus: "lead",
    ownerId: u.samuel.id,
    firstContactAt: daysAgo(2),
    lastInteractionAt: hoursAgo(4),
    createdAt: daysAgo(2),
  };
  const thiago: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Thiago Nunes",
    whatsapp: "+55 11 94487-3321",
    origin: "indicacao",
    interests: ["iphone"],
    tags: ["indicação"],
    journeyStatus: "lead",
    ownerId: u.juliana.id,
    firstContactAt: daysAgo(3),
    lastInteractionAt: hoursAgo(3),
    createdAt: daysAgo(3),
  };
  const patricia: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Patrícia Lemos",
    whatsapp: "+55 11 93356-9012",
    email: "patricia.lemos@gmail.com",
    origin: "instagram_organico",
    interests: ["iphone"],
    tags: ["negociando"],
    journeyStatus: "cliente",
    ownerId: u.rafael.id,
    firstContactAt: daysAgo(20),
    lastInteractionAt: daysAgo(4),
    createdAt: daysAgo(20),
  };
  const felipe: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Felipe Andrade",
    whatsapp: "+55 11 92214-5567",
    origin: "whatsapp_direto",
    interests: ["mac"],
    tags: [],
    journeyStatus: "cliente",
    ownerId: u.samuel.id,
    firstContactAt: daysAgo(15),
    lastInteractionAt: hoursAgo(6),
    createdAt: daysAgo(15),
  };
  const renata: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Renata Cardoso",
    whatsapp: "+55 11 91109-8823",
    instagram: "@renatacardoso",
    origin: "instagram_ads",
    interests: ["airpods", "iphone"],
    tags: ["combo"],
    journeyStatus: "cliente",
    ownerId: u.juliana.id,
    firstContactAt: daysAgo(10),
    lastInteractionAt: hoursAgo(5),
    createdAt: daysAgo(10),
  };
  const eduardo: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Eduardo Barros",
    whatsapp: "+55 11 90087-2214",
    cpf: "345.211.678-09",
    origin: "indicacao",
    interests: ["iphone"],
    tags: [],
    journeyStatus: "cliente",
    ownerId: u.samuel.id,
    firstContactAt: daysAgo(30),
    lastInteractionAt: daysAgo(6),
    createdAt: daysAgo(30),
  };
  const vanessa: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Vanessa Ribeiro",
    whatsapp: "+55 11 98765-1122",
    email: "vanessa.ribeiro@outlook.com",
    origin: "instagram_organico",
    interests: ["watch"],
    tags: [],
    journeyStatus: "cliente",
    ownerId: u.rafael.id,
    firstContactAt: daysAgo(40),
    lastInteractionAt: daysAgo(10),
    createdAt: daysAgo(40),
  };
  const marcelo: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Marcelo Teixeira",
    whatsapp: "+55 11 99887-3345",
    cpf: "128.554.902-31",
    origin: "indicacao",
    interests: ["iphone", "ipad"],
    tags: ["vip"],
    journeyStatus: "recorrente",
    ownerId: u.juliana.id,
    firstContactAt: daysAgo(180),
    lastInteractionAt: daysAgo(15),
    createdAt: daysAgo(180),
  };
  const debora: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Débora Prado",
    whatsapp: "+55 11 97632-9981",
    instagram: "@deboraprado",
    origin: "instagram_organico",
    interests: ["mac", "watch"],
    tags: ["vip"],
    journeyStatus: "recorrente",
    ownerId: u.samuel.id,
    firstContactAt: daysAgo(220),
    lastInteractionAt: daysAgo(25),
    createdAt: daysAgo(220),
  };
  const rodrigo: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Rodrigo Salles",
    whatsapp: "+55 11 96541-2287",
    origin: "whatsapp_direto",
    interests: ["iphone"],
    tags: ["vip"],
    journeyStatus: "recorrente",
    ownerId: u.rafael.id,
    firstContactAt: daysAgo(150),
    lastInteractionAt: daysAgo(20),
    createdAt: daysAgo(150),
  };
  const fernanda: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Fernanda Boaventura",
    whatsapp: "+55 11 95487-6612",
    email: "fernanda.boaventura@gmail.com",
    origin: "indicacao",
    interests: ["airpods", "acessorios"],
    tags: ["vip"],
    journeyStatus: "recorrente",
    ownerId: u.juliana.id,
    firstContactAt: daysAgo(300),
    lastInteractionAt: daysAgo(30),
    createdAt: daysAgo(300),
  };

  const all = [
    bruno,
    larissa,
    diegoRocha,
    camila,
    thiago,
    patricia,
    felipe,
    renata,
    eduardo,
    vanessa,
    marcelo,
    debora,
    rodrigo,
    fernanda,
  ];

  return {
    all,
    bruno,
    larissa,
    diegoRocha,
    camila,
    thiago,
    patricia,
    felipe,
    renata,
    eduardo,
    vanessa,
    marcelo,
    debora,
    rodrigo,
    fernanda,
  };
}

// ---------------------------------------------------------------------------
// Tenant 1 — Deals
// ---------------------------------------------------------------------------

function buildTenant1Deals(tenantId: string, c: ReturnType<typeof buildTenant1Contacts>, u: ReturnType<typeof buildUsers>) {
  const brunoDeal: Deal = {
    id: newId("deal"),
    tenantId,
    contactId: c.bruno.id,
    title: "iPhone 15 128GB Rosa",
    products: "iPhone 15 128GB Rosa",
    value: 4899,
    payment: "cartao_parcelado",
    tradeIn: false,
    stage: "novo_lead",
    outcome: "aberto",
    ownerId: u.juliana.id,
    expectedCloseAt: daysAgo(-5),
    stageChangedAt: daysAgo(1),
    createdAt: daysAgo(1),
  };
  const larissaDeal: Deal = {
    id: newId("deal"),
    tenantId,
    contactId: c.larissa.id,
    title: "Apple Watch Series 10",
    products: "Apple Watch Series 10 42mm Prata",
    value: 3799,
    payment: "pix",
    tradeIn: false,
    stage: "novo_lead",
    outcome: "aberto",
    ownerId: u.samuel.id,
    stageChangedAt: hoursAgo(5),
    createdAt: hoursAgo(6),
  };
  const diegoDeal: Deal = {
    id: newId("deal"),
    tenantId,
    contactId: c.diegoRocha.id,
    title: "iPad 10ª geração",
    products: "iPad 10ª geração 64GB Wi-Fi",
    value: 3599,
    payment: "cartao_parcelado",
    tradeIn: true,
    tradeInDesc: "iPad 6ª geração 32GB, bom estado",
    stage: "em_atendimento",
    outcome: "aberto",
    ownerId: u.juliana.id,
    stageChangedAt: daysAgo(2),
    createdAt: daysAgo(5),
  };
  const camilaDeal: Deal = {
    id: newId("deal"),
    tenantId,
    contactId: c.camila.id,
    title: "MacBook Air M2",
    products: "MacBook Air M2 256GB Cinza Espacial",
    value: 9299,
    payment: "boleto",
    tradeIn: false,
    stage: "em_atendimento",
    outcome: "aberto",
    ownerId: u.samuel.id,
    stageChangedAt: daysAgo(1),
    createdAt: daysAgo(2),
  };
  const thiagoDeal: Deal = {
    id: newId("deal"),
    tenantId,
    contactId: c.thiago.id,
    title: "iPhone 14 256GB",
    products: "iPhone 14 256GB Meia-noite",
    value: 5299,
    payment: "pix",
    tradeIn: true,
    tradeInDesc: "iPhone 12 128GB, tela trocada",
    stage: "negociacao",
    outcome: "aberto",
    ownerId: u.juliana.id,
    expectedCloseAt: daysAgo(-2),
    stageChangedAt: daysAgo(1),
    createdAt: daysAgo(3),
  };
  const patriciaDeal: Deal = {
    id: newId("deal"),
    tenantId,
    contactId: c.patricia.id,
    title: "iPhone 16 Pro 256GB",
    products: "iPhone 16 Pro 256GB Titânio Natural",
    value: 8999,
    payment: "cartao_parcelado",
    tradeIn: false,
    stage: "negociacao",
    outcome: "aberto",
    ownerId: u.rafael.id,
    expectedCloseAt: daysAgo(-3),
    stageChangedAt: daysAgo(4), // parado há 4 dias — dispara badge de stale
    createdAt: daysAgo(6),
  };
  const felipeDeal: Deal = {
    id: newId("deal"),
    tenantId,
    contactId: c.felipe.id,
    title: "Mac mini M4",
    products: "Mac mini M4 256GB",
    value: 5999,
    payment: "pix",
    tradeIn: false,
    stage: "fechamento",
    outcome: "aberto",
    ownerId: u.samuel.id,
    expectedCloseAt: daysAgo(0),
    stageChangedAt: hoursAgo(6),
    createdAt: daysAgo(2),
  };
  const renataDeal: Deal = {
    id: newId("deal"),
    tenantId,
    contactId: c.renata.id,
    title: "Combo iPhone 13 + AirPods Pro 2",
    products: "iPhone 13 128GB + AirPods Pro 2",
    value: 6799,
    payment: "cartao_parcelado",
    tradeIn: false,
    stage: "fechamento",
    outcome: "aberto",
    ownerId: u.juliana.id,
    expectedCloseAt: daysAgo(-1),
    stageChangedAt: daysAgo(1),
    createdAt: daysAgo(3),
  };
  const eduardoDeal: Deal = {
    id: newId("deal"),
    tenantId,
    contactId: c.eduardo.id,
    title: "iPhone 13 128GB",
    products: "iPhone 13 128GB Meia-noite",
    value: 3999,
    payment: "pix",
    tradeIn: true,
    tradeInDesc: "iPhone 11 64GB",
    stage: "pos_venda",
    outcome: "ganho",
    ownerId: u.samuel.id,
    stageChangedAt: daysAgo(6),
    createdAt: daysAgo(9),
  };
  const vanessaDeal: Deal = {
    id: newId("deal"),
    tenantId,
    contactId: c.vanessa.id,
    title: "Apple Watch Ultra 2",
    products: "Apple Watch Ultra 2 49mm Titânio",
    value: 6499,
    payment: "cartao_avista",
    tradeIn: false,
    stage: "pos_venda",
    outcome: "ganho",
    ownerId: u.rafael.id,
    stageChangedAt: daysAgo(10),
    createdAt: daysAgo(13),
  };
  const marceloDeal: Deal = {
    id: newId("deal"),
    tenantId,
    contactId: c.marcelo.id,
    title: "iPhone 15 Pro Max 256GB",
    products: "iPhone 15 Pro Max 256GB Titânio Azul",
    value: 9999,
    payment: "cartao_parcelado",
    tradeIn: false,
    stage: "negociacao",
    outcome: "perdido",
    lossReason: "preco",
    ownerId: u.juliana.id,
    stageChangedAt: daysAgo(15),
    createdAt: daysAgo(18),
  };
  const rodrigoDeal: Deal = {
    id: newId("deal"),
    tenantId,
    contactId: c.rodrigo.id,
    title: "iPad Air 5ª geração",
    products: "iPad Air 5ª geração 64GB",
    value: 4599,
    payment: "boleto",
    tradeIn: false,
    stage: "em_atendimento",
    outcome: "perdido",
    lossReason: "sem_resposta",
    ownerId: u.rafael.id,
    stageChangedAt: daysAgo(20),
    createdAt: daysAgo(25),
  };

  const all = [
    brunoDeal,
    larissaDeal,
    diegoDeal,
    camilaDeal,
    thiagoDeal,
    patriciaDeal,
    felipeDeal,
    renataDeal,
    eduardoDeal,
    vanessaDeal,
    marceloDeal,
    rodrigoDeal,
  ];

  return { all, brunoDeal, larissaDeal, diegoDeal, camilaDeal, thiagoDeal, patriciaDeal, felipeDeal, renataDeal, eduardoDeal, vanessaDeal, marceloDeal, rodrigoDeal };
}

// ---------------------------------------------------------------------------
// Tenant 1 — Conversas & mensagens
// ---------------------------------------------------------------------------

type MsgSpec = { direction: "in" | "out"; text: string; when: string; authorId?: string };

function buildMessages(tenantId: string, conversationId: string, specs: MsgSpec[]): Message[] {
  return specs.map((spec) => ({
    id: newId("msg"),
    tenantId,
    conversationId,
    direction: spec.direction,
    text: spec.text,
    authorId: spec.authorId,
    status: spec.direction === "out" ? "lida" : "entregue",
    createdAt: spec.when,
  }));
}

function buildTenant1Conversations(
  tenantId: string,
  c: ReturnType<typeof buildTenant1Contacts>,
  u: ReturnType<typeof buildUsers>,
) {
  const bruno: Conversation = {
    id: newId("conv"),
    tenantId,
    contactId: c.bruno.id,
    assigneeId: u.juliana.id,
    status: "aberta",
    unread: 0,
    createdAt: daysAgo(1),
  };
  const larissa: Conversation = {
    id: newId("conv"),
    tenantId,
    contactId: c.larissa.id,
    assigneeId: u.samuel.id,
    status: "aberta",
    unread: 0,
    createdAt: hoursAgo(6),
  };
  const diegoRocha: Conversation = {
    id: newId("conv"),
    tenantId,
    contactId: c.diegoRocha.id,
    assigneeId: null,
    status: "aberta",
    unread: 3,
    createdAt: daysAgo(5),
  };
  const camila: Conversation = {
    id: newId("conv"),
    tenantId,
    contactId: c.camila.id,
    assigneeId: null,
    status: "aberta",
    unread: 2,
    createdAt: daysAgo(2),
  };
  const thiago: Conversation = {
    id: newId("conv"),
    tenantId,
    contactId: c.thiago.id,
    assigneeId: u.juliana.id,
    status: "aberta",
    unread: 1,
    createdAt: daysAgo(2),
  };
  const patricia: Conversation = {
    id: newId("conv"),
    tenantId,
    contactId: c.patricia.id,
    assigneeId: u.rafael.id,
    status: "aberta",
    unread: 0,
    createdAt: daysAgo(6),
  };
  const felipe: Conversation = {
    id: newId("conv"),
    tenantId,
    contactId: c.felipe.id,
    assigneeId: u.samuel.id,
    status: "aberta",
    unread: 0,
    createdAt: daysAgo(2),
  };
  const renata: Conversation = {
    id: newId("conv"),
    tenantId,
    contactId: c.renata.id,
    assigneeId: u.juliana.id,
    status: "aberta",
    unread: 1,
    createdAt: daysAgo(3),
  };

  const all = [bruno, larissa, diegoRocha, camila, thiago, patricia, felipe, renata];

  const messages: Message[] = [
    ...buildMessages(tenantId, bruno.id, [
      { direction: "in", text: "Oi, boa tarde! Vi o post de vocês do iPhone 15 no Instagram, ainda tem disponível?", when: daysAgo(1) },
      { direction: "out", text: "Boa tarde, Bruno! Tudo bem? Temos sim, iPhone 15 128GB na cor rosa. Você já pensou se prefere à vista ou parcelado?", when: daysAgo(1), authorId: u.juliana.id },
      { direction: "in", text: "Prefiro parcelar sim, em quantas vezes dá pra fazer sem juros?", when: daysAgo(1) },
      { direction: "out", text: "Conseguimos parcelar em até 10x sem juros no cartão. À vista no PIX sai por R$ 4.699, com desconto.", when: daysAgo(1), authorId: u.juliana.id },
      { direction: "in", text: "Legal! E vocês entregam ou só retirada?", when: hoursAgo(20) },
      { direction: "out", text: "Fazemos entrega em toda a região metropolitana, o frete fica em torno de R$ 25 dependendo do bairro. Retirada na loja é sem custo.", when: hoursAgo(19), authorId: u.juliana.id },
      { direction: "in", text: "Perfeito, me manda o link de pagamento então", when: hoursAgo(2) },
    ]),
    ...buildMessages(tenantId, larissa.id, [
      { direction: "in", text: "Oi! Vocês tem Apple Watch Series 10 42mm?", when: hoursAgo(6) },
      { direction: "out", text: "Oi Larissa, temos sim! Você procura em qual cor?", when: hoursAgo(6), authorId: u.samuel.id },
      { direction: "in", text: "Queria a prateada com pulseira esportiva", when: hoursAgo(5) },
      { direction: "out", text: "Temos disponível! O valor é R$ 3.799 à vista no PIX ou parcelado em até 8x.", when: hoursAgo(5), authorId: u.samuel.id },
      { direction: "in", text: "Consegue mandar foto?", when: hoursAgo(2) },
      { direction: "out", text: "Consigo sim, já te envio aqui 🙂", when: hoursAgo(1), authorId: u.samuel.id },
    ]),
    ...buildMessages(tenantId, diegoRocha.id, [
      { direction: "out", text: "Oi Diego! Recebemos sua mensagem, em breve um consultor vai te atender por aqui 🙂", when: daysAgo(5), authorId: u.juliana.id },
      { direction: "in", text: "Show, obrigado!", when: daysAgo(5) },
      { direction: "in", text: "Boa noite, tudo bem? Vi que vocês aceitam iPad usado na troca, é isso mesmo?", when: daysAgo(3) },
      { direction: "in", text: "Tenho um iPad 6ª geração 32GB, tá em bom estado", when: daysAgo(3) },
      { direction: "in", text: "Vi que o iPad 10ª geração tá em promoção, é isso mesmo?", when: daysAgo(2) },
      { direction: "in", text: "Alguém pode me passar como funciona a avaliação da troca?", when: daysAgo(1) },
      { direction: "in", text: "Oi, ainda estão aí?", when: hoursAgo(20) },
      { direction: "in", text: "Preciso decidir até esse fim de semana, será que dá pra me responder?", when: hoursAgo(4) },
    ]),
    ...buildMessages(tenantId, camila.id, [
      { direction: "in", text: "Oi, boa tarde! Vocês têm MacBook Air M2 disponível?", when: daysAgo(2) },
      { direction: "out", text: "Boa tarde, Camila! Temos sim, qual configuração você procura?", when: daysAgo(2), authorId: u.samuel.id },
      { direction: "in", text: "Queria a de 256GB, cinza espacial", when: daysAgo(2) },
      { direction: "in", text: "Qual o prazo de entrega pra São Paulo capital?", when: daysAgo(1) },
      { direction: "in", text: "E o frete, é grátis?", when: daysAgo(1) },
      { direction: "in", text: "Oi, será que consigo uma resposta hoje ainda?", when: hoursAgo(10) },
      { direction: "in", text: "Preciso fechar essa semana, me avisa por favor", when: hoursAgo(4) },
    ]),
    ...buildMessages(tenantId, thiago.id, [
      { direction: "in", text: "Oi Juliana, tudo bem? Consegui pensar aqui sobre a troca do meu iPhone 12", when: daysAgo(2) },
      { direction: "out", text: "Oi Thiago! Que bom. Você falou que ele tá com a tela trocada, certo? Isso pode influenciar um pouco no valor da avaliação.", when: daysAgo(2), authorId: u.juliana.id },
      { direction: "in", text: "Sim, troquei a tela em uma assistência não autorizada", when: daysAgo(2) },
      { direction: "out", text: "Entendi. Avaliando isso, conseguimos abater R$ 1.200 na troca pelo iPhone 14 256GB.", when: daysAgo(1), authorId: u.juliana.id },
      { direction: "in", text: "Fechado, mas consigo pagar via PIX o restante com desconto?", when: daysAgo(1) },
      { direction: "out", text: "Consegue sim! No PIX o valor final fica R$ 5.299 já com o abatimento da troca.", when: daysAgo(1), authorId: u.juliana.id },
      { direction: "in", text: "Perfeito, vou separar o dinheiro até sexta", when: hoursAgo(20) },
      { direction: "in", text: "Ainda dá pra garantir esse valor?", when: hoursAgo(3) },
    ]),
    ...buildMessages(tenantId, patricia.id, [
      { direction: "in", text: "Boa tarde, Rafael! Ainda tá de pé aquela condição do iPhone 16 Pro que você me passou?", when: daysAgo(6) },
      { direction: "out", text: "Boa tarde, Patrícia! Tá sim, R$ 8.999 parcelado em até 12x ou R$ 8.400 à vista no PIX.", when: daysAgo(6), authorId: u.rafael.id },
      { direction: "in", text: "Vou conversar com meu marido sobre o parcelamento e te retorno", when: daysAgo(5) },
      { direction: "out", text: "Sem problemas! Fico à disposição, qualquer dúvida me chama.", when: daysAgo(5), authorId: u.rafael.id },
      { direction: "in", text: "Oi, ainda estamos decidindo aqui, só mais um tempinho", when: daysAgo(4) },
      { direction: "out", text: "Tranquilo, sem pressa 🙂", when: daysAgo(4), authorId: u.rafael.id },
    ]),
    ...buildMessages(tenantId, felipe.id, [
      { direction: "in", text: "Samuel, já separei o valor do Mac mini, como faço o pagamento?", when: daysAgo(2) },
      { direction: "out", text: "Show, Felipe! Pode ser via PIX, te mando a chave aqui.", when: daysAgo(2), authorId: u.samuel.id },
      { direction: "in", text: "Já fiz o PIX, vou te mandar o comprovante", when: daysAgo(1) },
      { direction: "out", text: "Recebido! Muito obrigado, já vou confirmar aqui e organizar a entrega.", when: daysAgo(1), authorId: u.samuel.id },
      { direction: "in", text: "Qual o prazo pra chegar aí em casa?", when: hoursAgo(10) },
      { direction: "out", text: "Entregamos em até 2 dias úteis pra sua região, sem custo de frete.", when: hoursAgo(9), authorId: u.samuel.id },
      { direction: "in", text: "Perfeito, fico no aguardo!", when: hoursAgo(6) },
    ]),
    ...buildMessages(tenantId, renata.id, [
      { direction: "in", text: "Oi Juliana! Fechei que vou levar o combo iPhone 13 com os AirPods Pro, como fica o parcelamento?", when: daysAgo(3) },
      { direction: "out", text: "Que ótimo, Renata! Consigo parcelar em 10x no cartão, sem juros.", when: daysAgo(3), authorId: u.juliana.id },
      { direction: "in", text: "Perfeito, pode gerar o link em 10x então", when: daysAgo(2) },
      { direction: "out", text: "Já te mando aqui!", when: daysAgo(2), authorId: u.juliana.id },
      { direction: "in", text: "Consegui pagar, só a última parcela que fica pra depois do dia 10, tudo bem?", when: daysAgo(1) },
      { direction: "out", text: "Sem problemas, dá pra ajustar sim.", when: daysAgo(1), authorId: u.juliana.id },
      { direction: "in", text: "Combinado então, obrigada!", when: hoursAgo(5) },
    ]),
  ];

  return { all, messages };
}

// ---------------------------------------------------------------------------
// Tenant 1 — Appointments
// ---------------------------------------------------------------------------

function buildTenant1Appointments(
  tenantId: string,
  c: ReturnType<typeof buildTenant1Contacts>,
  d: ReturnType<typeof buildTenant1Deals>,
  u: ReturnType<typeof buildUsers>,
): Appointment[] {
  const bruno = daysAgo(0, 9);
  const felipeStart = daysAgo(0, 15);
  const renataStart = daysAgo(-1, 11);
  const patriciaStart = daysAgo(-1, 14);
  const vanessaStart = daysAgo(-2, 10);
  const larissaStart = daysAgo(-2, 16);
  const thiagoStart = daysAgo(-3, 9);
  const eduardoStart = daysAgo(1, 10);
  const diegoStart = daysAgo(2, 13);
  const camilaStart = daysAgo(1, 16);

  return [
    {
      id: newId("appt"),
      tenantId,
      contactId: c.bruno.id,
      type: "atendimento",
      startsAt: bruno,
      endsAt: plusMinutes(bruno, 30),
      status: "agendado",
      ownerId: u.juliana.id,
      note: "Apresentar condições de parcelamento do iPhone 15.",
      createdAt: daysAgo(1),
    },
    {
      id: newId("appt"),
      tenantId,
      contactId: c.felipe.id,
      dealId: d.felipeDeal.id,
      type: "entrega",
      startsAt: felipeStart,
      endsAt: plusMinutes(felipeStart, 30),
      status: "agendado",
      ownerId: u.samuel.id,
      note: "Entregar Mac mini M4 já configurado.",
      createdAt: daysAgo(1),
    },
    {
      id: newId("appt"),
      tenantId,
      contactId: c.renata.id,
      dealId: d.renataDeal.id,
      type: "retirada",
      startsAt: renataStart,
      endsAt: plusMinutes(renataStart, 30),
      status: "agendado",
      ownerId: u.juliana.id,
      createdAt: daysAgo(1),
    },
    {
      id: newId("appt"),
      tenantId,
      contactId: c.patricia.id,
      dealId: d.patriciaDeal.id,
      type: "follow_up",
      startsAt: patriciaStart,
      endsAt: plusMinutes(patriciaStart, 30),
      status: "agendado",
      ownerId: u.rafael.id,
      note: "Retomar negociação do iPhone 16 Pro.",
      createdAt: daysAgo(4),
    },
    {
      id: newId("appt"),
      tenantId,
      contactId: c.vanessa.id,
      dealId: d.vanessaDeal.id,
      type: "retirada",
      startsAt: vanessaStart,
      endsAt: plusMinutes(vanessaStart, 30),
      status: "agendado",
      ownerId: u.rafael.id,
      note: "Retirada de pulseira extra do Watch Ultra.",
      createdAt: daysAgo(2),
    },
    {
      id: newId("appt"),
      tenantId,
      contactId: c.larissa.id,
      type: "atendimento",
      startsAt: larissaStart,
      endsAt: plusMinutes(larissaStart, 30),
      status: "agendado",
      ownerId: u.samuel.id,
      createdAt: hoursAgo(5),
    },
    {
      id: newId("appt"),
      tenantId,
      contactId: c.thiago.id,
      dealId: d.thiagoDeal.id,
      type: "follow_up",
      startsAt: thiagoStart,
      endsAt: plusMinutes(thiagoStart, 30),
      status: "agendado",
      ownerId: u.juliana.id,
      note: "Confirmar pagamento via PIX e agendar entrega.",
      createdAt: daysAgo(1),
    },
    {
      id: newId("appt"),
      tenantId,
      contactId: c.eduardo.id,
      dealId: d.eduardoDeal.id,
      type: "entrega",
      startsAt: eduardoStart,
      endsAt: plusMinutes(eduardoStart, 30),
      status: "concluido",
      ownerId: u.samuel.id,
      note: "Entrega realizada com sucesso.",
      createdAt: daysAgo(6),
    },
    {
      id: newId("appt"),
      tenantId,
      contactId: c.diegoRocha.id,
      type: "atendimento",
      startsAt: diegoStart,
      endsAt: plusMinutes(diegoStart, 30),
      status: "concluido",
      ownerId: u.juliana.id,
      createdAt: daysAgo(4),
    },
    {
      id: newId("appt"),
      tenantId,
      contactId: c.camila.id,
      type: "retirada",
      startsAt: camilaStart,
      endsAt: plusMinutes(camilaStart, 30),
      status: "cancelado",
      ownerId: u.samuel.id,
      note: "Cliente remarcou para outra data.",
      createdAt: daysAgo(2),
    },
  ];
}

// ---------------------------------------------------------------------------
// Tenant 1 — Activities
// ---------------------------------------------------------------------------

function buildTenant1Activities(
  tenantId: string,
  d: ReturnType<typeof buildTenant1Deals>,
  conv: ReturnType<typeof buildTenant1Conversations>,
  appts: Appointment[],
  u: ReturnType<typeof buildUsers>,
): Activity[] {
  const dealActivities: Activity[] = d.all.map((deal) => {
    const type: ActivityType = deal.outcome === "ganho" ? "venda" : deal.outcome === "perdido" ? "nota" : "mudanca_estagio";
    const description =
      deal.outcome === "ganho"
        ? `Venda concluída: ${deal.products}.`
        : deal.outcome === "perdido"
          ? `Negociação perdida (${deal.lossReason}): ${deal.products}.`
          : `Deal em ${deal.stage}: ${deal.products}.`;
    return {
      id: newId("activity"),
      tenantId,
      contactId: deal.contactId,
      dealId: deal.id,
      userId: deal.ownerId,
      type,
      description,
      createdAt: deal.stageChangedAt,
    };
  });

  const conversationActivities: Activity[] = conv.all.map((conversation) => {
    const lastMessage = [...conv.messages]
      .filter((m) => m.conversationId === conversation.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .at(-1);
    return {
      id: newId("activity"),
      tenantId,
      contactId: conversation.contactId,
      userId: conversation.assigneeId ?? u.rafael.id,
      type: "mensagem",
      description: lastMessage ? `Última mensagem: "${lastMessage.text.slice(0, 60)}"` : "Conversa iniciada.",
      createdAt: lastMessage?.createdAt ?? conversation.createdAt,
    };
  });

  const appointmentActivities: Activity[] = appts.map((appt) => ({
    id: newId("activity"),
    tenantId,
    contactId: appt.contactId,
    dealId: appt.dealId,
    userId: appt.ownerId,
    type: "agendamento",
    description: `Agendamento de ${appt.type} em ${appt.startsAt.slice(0, 10)}.`,
    createdAt: appt.createdAt,
  }));

  return [...dealActivities, ...conversationActivities, ...appointmentActivities];
}

// ---------------------------------------------------------------------------
// Tenant 1 — Conexões WhatsApp
// ---------------------------------------------------------------------------

function buildTenant1Connections(tenantId: string, u: ReturnType<typeof buildUsers>): WhatsAppConnection[] {
  return [
    {
      id: newId("conn"),
      tenantId,
      userId: u.juliana.id,
      phone: "+55 11 98800-1234",
      status: "conectado",
      connectedAt: hoursAgo(3),
      createdAt: daysAgo(60),
    },
    {
      id: newId("conn"),
      tenantId,
      userId: u.samuel.id,
      phone: "+55 11 98800-5678",
      status: "desconectado",
      createdAt: daysAgo(60),
    },
  ];
}

// ---------------------------------------------------------------------------
// Tenant 2 — TechStore SP
// ---------------------------------------------------------------------------

function buildTenant2(tenantId: string, u: ReturnType<typeof buildUsers>) {
  const gabriel: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Gabriel Souza",
    whatsapp: "+55 11 98123-4455",
    origin: "instagram_ads",
    interests: ["iphone"],
    tags: [],
    journeyStatus: "lead",
    ownerId: u.ana.id,
    firstContactAt: daysAgo(2),
    lastInteractionAt: hoursAgo(3),
    createdAt: daysAgo(2),
  };
  const isabela: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Isabela Martins",
    whatsapp: "+55 11 97654-3322",
    origin: "whatsapp_direto",
    interests: ["watch"],
    tags: [],
    journeyStatus: "lead",
    ownerId: u.ana.id,
    firstContactAt: daysAgo(4),
    lastInteractionAt: daysAgo(1),
    createdAt: daysAgo(4),
  };
  const rafaelNogueira: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Rafael Nogueira",
    whatsapp: "+55 11 96543-2211",
    origin: "indicacao",
    interests: ["mac"],
    tags: [],
    journeyStatus: "cliente",
    ownerId: u.marcos.id,
    firstContactAt: daysAgo(25),
    lastInteractionAt: daysAgo(5),
    createdAt: daysAgo(25),
  };
  const beatriz: Contact = {
    id: newId("contact"),
    tenantId,
    name: "Beatriz Farias",
    whatsapp: "+55 11 95432-1198",
    origin: "instagram_organico",
    interests: ["ipad"],
    tags: ["vip"],
    journeyStatus: "recorrente",
    ownerId: u.ana.id,
    firstContactAt: daysAgo(90),
    lastInteractionAt: daysAgo(20),
    createdAt: daysAgo(90),
  };

  const contacts = [gabriel, isabela, rafaelNogueira, beatriz];

  const gabrielDeal: Deal = {
    id: newId("deal"),
    tenantId,
    contactId: gabriel.id,
    title: "iPhone 14 128GB",
    products: "iPhone 14 128GB Estelar",
    value: 4199,
    payment: "pix",
    tradeIn: false,
    stage: "novo_lead",
    outcome: "aberto",
    ownerId: u.ana.id,
    stageChangedAt: hoursAgo(3),
    createdAt: daysAgo(2),
  };
  const isabelaDeal: Deal = {
    id: newId("deal"),
    tenantId,
    contactId: isabela.id,
    title: "Apple Watch SE",
    products: "Apple Watch SE 40mm",
    value: 2399,
    payment: "cartao_parcelado",
    tradeIn: false,
    stage: "negociacao",
    outcome: "aberto",
    ownerId: u.ana.id,
    stageChangedAt: daysAgo(1),
    createdAt: daysAgo(4),
  };
  const rafaelDeal: Deal = {
    id: newId("deal"),
    tenantId,
    contactId: rafaelNogueira.id,
    title: "Mac mini",
    products: "Mac mini M2 256GB",
    value: 5499,
    payment: "cartao_avista",
    tradeIn: false,
    stage: "pos_venda",
    outcome: "ganho",
    ownerId: u.marcos.id,
    stageChangedAt: daysAgo(5),
    createdAt: daysAgo(10),
  };

  const deals = [gabrielDeal, isabelaDeal, rafaelDeal];

  const gabrielConv: Conversation = {
    id: newId("conv"),
    tenantId,
    contactId: gabriel.id,
    assigneeId: u.ana.id,
    status: "aberta",
    unread: 0,
    createdAt: daysAgo(2),
  };
  const isabelaConv: Conversation = {
    id: newId("conv"),
    tenantId,
    contactId: isabela.id,
    assigneeId: u.ana.id,
    status: "aberta",
    unread: 1,
    createdAt: daysAgo(4),
  };
  const conversations = [gabrielConv, isabelaConv];

  const messages: Message[] = [
    ...buildMessages(tenantId, gabrielConv.id, [
      { direction: "in", text: "Oi, boa tarde! Qual o valor do iPhone 14 128GB à vista?", when: daysAgo(2) },
      { direction: "out", text: "Boa tarde, Gabriel! Fica R$ 4.199, e no PIX conseguimos fechar em R$ 3.999.", when: daysAgo(2), authorId: u.ana.id },
      { direction: "in", text: "Boa, e tem entrega pra Zona Sul?", when: daysAgo(1) },
      { direction: "out", text: "Temos sim! O frete pra sua região é R$ 20 e o prazo é de 1 dia útil.", when: daysAgo(1), authorId: u.ana.id },
      { direction: "in", text: "Fechado, vou fazer o PIX ainda hoje", when: hoursAgo(4) },
      { direction: "out", text: "Show, fico no aguardo do comprovante!", when: hoursAgo(3), authorId: u.ana.id },
    ]),
    ...buildMessages(tenantId, isabelaConv.id, [
      { direction: "in", text: "Oi! Vocês parcelam o Apple Watch SE?", when: daysAgo(4) },
      { direction: "out", text: "Oi Isabela! Parcelamos sim, em até 6x sem juros no cartão.", when: daysAgo(4), authorId: u.ana.id },
      { direction: "in", text: "E se eu der uma entrada, reduz o valor da parcela?", when: daysAgo(2) },
      { direction: "out", text: "Reduz sim, me fala quanto você pensa em dar de entrada que calculo pra você.", when: daysAgo(2), authorId: u.ana.id },
      { direction: "in", text: "Consigo dar uns R$ 500 de entrada", when: daysAgo(1) },
      { direction: "in", text: "Ainda dá pra fechar essa condição?", when: hoursAgo(8) },
    ]),
  ];

  const rafaelApptStart = daysAgo(0, 11);
  const gabrielApptStart = daysAgo(-1, 14);
  const appointments: Appointment[] = [
    {
      id: newId("appt"),
      tenantId,
      contactId: rafaelNogueira.id,
      dealId: rafaelDeal.id,
      type: "entrega",
      startsAt: rafaelApptStart,
      endsAt: plusMinutes(rafaelApptStart, 30),
      status: "agendado",
      ownerId: u.marcos.id,
      createdAt: daysAgo(5),
    },
    {
      id: newId("appt"),
      tenantId,
      contactId: gabriel.id,
      dealId: gabrielDeal.id,
      type: "atendimento",
      startsAt: gabrielApptStart,
      endsAt: plusMinutes(gabrielApptStart, 30),
      status: "agendado",
      ownerId: u.ana.id,
      createdAt: daysAgo(1),
    },
  ];

  const activities: Activity[] = [
    {
      id: newId("activity"),
      tenantId,
      contactId: rafaelNogueira.id,
      dealId: rafaelDeal.id,
      userId: u.marcos.id,
      type: "venda",
      description: `Venda concluída: ${rafaelDeal.products}.`,
      createdAt: rafaelDeal.stageChangedAt,
    },
    {
      id: newId("activity"),
      tenantId,
      contactId: isabela.id,
      dealId: isabelaDeal.id,
      userId: u.ana.id,
      type: "mudanca_estagio",
      description: `Deal em negociação: ${isabelaDeal.products}.`,
      createdAt: isabelaDeal.stageChangedAt,
    },
    {
      id: newId("activity"),
      tenantId,
      contactId: gabriel.id,
      dealId: gabrielDeal.id,
      userId: u.ana.id,
      type: "mudanca_estagio",
      description: `Novo lead: ${gabrielDeal.products}.`,
      createdAt: gabrielDeal.stageChangedAt,
    },
  ];

  return { contacts, deals, conversations, messages, appointments, activities };
}

// ---------------------------------------------------------------------------
// buildSeed
// ---------------------------------------------------------------------------

export function buildSeed(): CrmState {
  const { tenant1, tenant2 } = buildTenants();
  const users = buildUsers(tenant1.id, tenant2.id);

  const tenant1Contacts = buildTenant1Contacts(tenant1.id, users);
  const tenant1Deals = buildTenant1Deals(tenant1.id, tenant1Contacts, users);
  const tenant1Conversations = buildTenant1Conversations(tenant1.id, tenant1Contacts, users);
  const tenant1Appointments = buildTenant1Appointments(tenant1.id, tenant1Contacts, tenant1Deals, users);
  const tenant1Activities = buildTenant1Activities(
    tenant1.id,
    tenant1Deals,
    tenant1Conversations,
    tenant1Appointments,
    users,
  );
  const tenant1Connections = buildTenant1Connections(tenant1.id, users);

  const tenant2Data = buildTenant2(tenant2.id, users);

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
    session: null,
  };
}
