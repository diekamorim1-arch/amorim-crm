// Dropdown de troca de sessão — lista todos os usuários seed agrupados por
// loja (tenant) + Admin do SaaS. Trocar dispara SWITCH_SESSION; a navegação
// para a rota correta fica a cargo do guard em AppShell.

import { useState } from "react";
import { useNavigate } from "react-router";
import { Check, ChevronsUpDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { currentUser } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/constants";
import type { User } from "@/lib/types";

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
  const { state, dispatch } = useCrm();
  const navigate = useNavigate();
  const me = currentUser(state);
  const [resetOpen, setResetOpen] = useState(false);

  const groups: { label: string; users: User[] }[] = [
    ...state.tenants.map((tenant) => ({
      label: tenant.name,
      users: state.users.filter((u) => u.tenantId === tenant.id),
    })),
    { label: "Admin do SaaS", users: state.users.filter((u) => !u.tenantId) },
  ].filter((group) => group.users.length > 0);

  function handleSwitch(userId: string) {
    dispatch({ type: "SWITCH_SESSION", userId });
    navigate("/");
  }

  function handleResetDemo() {
    dispatch({ type: "RESET_DEMO" });
    setResetOpen(false);
    toast.success("Demo resetada para o estado inicial.");
    navigate("/");
  }

  if (!me) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <Avatar size="sm">
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
          {groups.map((group, index) => (
            <div key={group.label}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
              <DropdownMenuGroup>
                {group.users.map((user) => (
                  <DropdownMenuItem
                    key={user.id}
                    onSelect={() => handleSwitch(user.id)}
                    className="gap-2"
                  >
                    <Avatar size="sm">
                      <AvatarFallback style={{ backgroundColor: user.avatarColor, color: "#fff" }}>
                        {initials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex flex-1 flex-col leading-tight">
                      <span>{user.name}</span>
                      <span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
                    </span>
                    {user.id === me.id && <Check className="size-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </div>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setResetOpen(true)} className="gap-2">
            <RotateCcw className="size-4" />
            Resetar demo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar demo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso descarta todas as alterações feitas nesta demonstração (negócios, contatos, conversas, agenda) e
              restaura os dados originais das lojas. Sua sessão atual é mantida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetDemo}>Resetar demo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
