// Gerador de id único, isolado num módulo próprio sem dependências.

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}
