// fakeReply.ts — simula o "cliente do outro lado" no Inbox: agenda uma
// resposta plausível (3-6s depois de enviarmos uma mensagem) para dar a
// sensação de conversa viva no protótipo. Fire-and-forget: não há API de
// cancelamento porque o componente que dispara nunca precisa desfazer o
// efeito (o timer despacha uma única RECEIVE_MESSAGE e termina) — se no
// futuro o Inbox ganhar troca de conversa muito rápida ou testes que
// precisem de determinismo, vale revisitar isso com um clearTimeout.

import type { CrmAction, Dispatch } from "@/lib/store";

const FAKE_REPLIES = [
  "Consigo fechar por PIX com desconto?",
  "Tenho um iPhone 13 Pro pra dar de entrada, vocês aceitam na troca?",
  "Em quantas vezes consigo parcelar no cartão sem juros?",
  "Qual o prazo de entrega pra minha região?",
  "Ainda dá pra garantir esse valor até o fim de semana?",
  "Vocês têm em outra cor disponível?",
  "Consigo agendar a retirada pra amanhã de manhã?",
  "Só confirmando, esse valor já inclui a garantia da Apple?",
];

const MIN_DELAY_MS = 3000;
const MAX_DELAY_MS = 6000;

let lastIndex = -1;

function pickReply(): string {
  if (FAKE_REPLIES.length === 1) return FAKE_REPLIES[0];

  let index = Math.floor(Math.random() * FAKE_REPLIES.length);
  while (index === lastIndex) {
    index = Math.floor(Math.random() * FAKE_REPLIES.length);
  }
  lastIndex = index;
  return FAKE_REPLIES[index];
}

/**
 * Agenda uma resposta fake do cliente para a conversa indicada, entre 3 e 6
 * segundos a partir de agora. Nunca repete a última fala usada (em qualquer
 * conversa — controle simples de módulo, suficiente para este protótipo de
 * demonstração).
 */
export function scheduleFakeReply(dispatch: Dispatch<CrmAction>, conversationId: string): void {
  const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  setTimeout(() => {
    dispatch({ type: "RECEIVE_MESSAGE", conversationId, text: pickReply() });
  }, delay);
}
