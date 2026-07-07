// Navegação por papel — versão desktop (aside colapsável) e versão mobile
// (bottom-bar com sheet de itens extras), ambas derivadas da mesma lista de
// itens por role.

import { useState } from "react";
import { NavLink } from "react-router";
import {
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  Inbox as InboxIcon,
  KanbanSquare,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  Settings,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";

import amorimMarkBlack from "@/assets/amorim-mark-black.png";
import amorimMarkWhite from "@/assets/amorim-mark-white.png";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const ATENDENTE_ITEMS: NavItem[] = [
  { to: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/inbox", label: "Inbox", icon: InboxIcon },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
];

const GESTOR_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  ...ATENDENTE_ITEMS,
  { to: "/config", label: "Configurações", icon: Settings },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageSquare },
];

const ADMIN_ITEMS: NavItem[] = [{ to: "/admin", label: "Lojas", icon: Store }];

function itemsForRole(role: Role): NavItem[] {
  if (role === "gestor") return GESTOR_ITEMS;
  if (role === "admin_saas") return ADMIN_ITEMS;
  return ATENDENTE_ITEMS;
}

function navLinkClasses(isActive: boolean, collapsed: boolean): string {
  return cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
    collapsed && "justify-center px-0",
  );
}

export function Sidebar({ role }: { role: Role }) {
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useTheme();
  const items = itemsForRole(role);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex h-14 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
        <img
          src={theme === "dark" ? amorimMarkWhite : amorimMarkBlack}
          alt="Amorim CRM"
          className="h-6 w-auto"
        />
        {!collapsed && (
          <span className="font-display text-sm font-semibold tracking-[-0.02em] text-sidebar-foreground">
            Amorim CRM
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => navLinkClasses(isActive, collapsed)}
            title={collapsed ? label : undefined}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center justify-center gap-2 border-t border-sidebar-border px-3 py-3 text-xs font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        {!collapsed && <span>Recolher</span>}
      </button>
    </aside>
  );
}

const MOBILE_PRIMARY_COUNT = 4;

export function MobileBottomNav({ role }: { role: Role }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const items = itemsForRole(role);
  const primaryItems = items.slice(0, MOBILE_PRIMARY_COUNT);
  const overflowItems = items.slice(MOBILE_PRIMARY_COUNT);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border bg-card md:hidden">
      {primaryItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground transition-colors",
              isActive && "text-primary",
            )
          }
        >
          <Icon className="size-5" />
          {label}
        </NavLink>
      ))}

      {overflowItems.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground"
          >
            <MoreHorizontal className="size-5" />
            Mais
          </button>

          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Mais opções</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4 pb-4">
                {overflowItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
                        isActive && "bg-accent",
                      )
                    }
                  >
                    <Icon className="size-4" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </nav>
  );
}
