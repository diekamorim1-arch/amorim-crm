// Menu da conta logada: avatar+nome, "Minha conta" e "Sair". Sem troca entre
// contas — cada usuário só entra na própria sessão via login real
// (e-mail/senha do Supabase Auth).

import { useNavigate } from "react-router";
import { ChevronsUpDown, LogOut, UserCircle } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { currentUser } from "@/lib/selectors";
import { supabase } from "@/lib/supabaseClient";
import { useCrm } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/constants";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function SessionSwitcher() {
  const { state } = useCrm();
  const navigate = useNavigate();
  const me = currentUser(state);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  if (!me) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <Avatar size="sm">
          {me.avatarUrl && <AvatarImage src={me.avatarUrl} alt={me.name} />}
          <AvatarFallback style={{ backgroundColor: me.avatarColor, color: "#fff" }}>
            {initials(me.name)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden flex-col items-start leading-tight sm:flex">
          <span className="font-medium text-foreground">{me.name}</span>
          <span className="text-xs text-muted-foreground">{ROLE_LABELS[me.role]}</span>
        </span>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onSelect={() => navigate("/conta")} className="gap-2">
          <UserCircle className="size-4" />
          Minha conta
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleSignOut} className="gap-2">
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
