// MessageBubble — bolha estilo WhatsApp. Único lugar da tela onde o verde é
// decoração real: saída usa os tokens --bubble-sent (claro #D9FDD3, escuro
// #005C4B); entrada fica em superfície neutra (card), sem verde.

import { Check, CheckCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message }: { message: Message }) {
  const isOut = message.direction === "out";
  const doubleCheck = message.status === "entregue" || message.status === "lida";
  const readTick = message.status === "lida";

  return (
    <div className={cn("flex", isOut ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-1 rounded-xl px-3 py-2 text-sm shadow-sm",
          isOut
            ? "rounded-br-sm bg-bubble-sent text-bubble-sent-foreground"
            : "rounded-bl-sm border border-border bg-card text-card-foreground",
        )}
      >
        <p className="whitespace-pre-wrap break-words leading-snug">{message.text}</p>
        <span
          className={cn(
            "flex items-center justify-end gap-1 text-[11px]",
            isOut ? "text-bubble-sent-foreground/70" : "text-muted-foreground",
          )}
        >
          {timeOf(message.createdAt)}
          {isOut &&
            (doubleCheck ? (
              <CheckCheck className={cn("size-3.5", readTick && "text-whatsapp")} />
            ) : (
              <Check className="size-3.5" />
            ))}
        </span>
      </div>
    </div>
  );
}
