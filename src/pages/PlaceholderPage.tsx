// Página placeholder genérica — usada pelas rotas que ainda não foram
// implementadas. Cada task futura substitui a rota correspondente por uma
// tela real.

import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  task: number;
}

export function PlaceholderPage({ title, task }: PlaceholderPageProps) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <Construction className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Em construção — Task {task}.</p>
      </div>
    </div>
  );
}
