// ID gerador único, isolado num módulo próprio sem dependências: tanto
// store.tsx quanto seed.ts precisam dele, e store.tsx já importa buildSeed de
// seed.ts — se newId vivesse em store.tsx, seed.ts importar de lá criaria um
// ciclo (store -> seed -> store). Mantendo aqui, os dois importam de um único
// lugar sem circularidade.

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}
