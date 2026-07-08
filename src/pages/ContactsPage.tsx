// ContactsPage — lista de clientes com busca e filtros combináveis. Tabela em
// telas médias/grandes, cards empilhados no mobile. Clicar numa linha/card
// abre a ficha do cliente; "Novo cliente" abre o ContactFormDialog em modo de
// criação.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Search } from "lucide-react";

import { JourneyBadge } from "@/components/contacts/JourneyBadge";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JOURNEY_STATUS_LABELS, ORIGIN_LABELS } from "@/lib/constants";
import { relativeTime } from "@/lib/format";
import { tenantScope } from "@/lib/selectors";
import { useCrm } from "@/lib/store";
import type { Contact, JourneyStatus, Origin } from "@/lib/types";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

type StatusFilter = "all" | JourneyStatus;
type TagFilter = "all" | string;
type OriginFilter = "all" | Origin;
type OwnerFilter = "all" | string;

export function ContactsPage() {
  const { state } = useCrm();
  const navigate = useNavigate();
  const { contacts, users } = tenantScope(state);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tagFilter, setTagFilter] = useState<TagFilter>("all");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const contact of contacts) {
      for (const tag of contact.tags) tags.add(tag);
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [contacts]);

  function ownerName(ownerId: string): string {
    return users.find((u) => u.id === ownerId)?.name ?? "—";
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts
      .filter((contact) => {
        if (!query) return true;
        const haystack = [contact.name, contact.whatsapp, contact.instagram ?? ""].join(" ").toLowerCase();
        return haystack.includes(query);
      })
      .filter((contact) => statusFilter === "all" || contact.journeyStatus === statusFilter)
      .filter((contact) => tagFilter === "all" || contact.tags.includes(tagFilter))
      .filter((contact) => originFilter === "all" || contact.origin === originFilter)
      .filter((contact) => ownerFilter === "all" || contact.ownerId === ownerFilter)
      .sort((a, b) => new Date(b.lastInteractionAt).getTime() - new Date(a.lastInteractionAt).getTime());
  }, [contacts, search, statusFilter, tagFilter, originFilter, ownerFilter]);

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || tagFilter !== "all" || originFilter !== "all" || ownerFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setTagFilter("all");
    setOriginFilter("all");
    setOwnerFilter("all");
  }

  function openContact(contact: Contact) {
    navigate(`/clientes/${contact.id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Clientes</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Novo cliente
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, WhatsApp ou @instagram"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger size="sm" className="w-full sm:w-auto">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(JOURNEY_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger size="sm" className="w-full sm:w-auto">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tags</SelectItem>
              {availableTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={originFilter} onValueChange={(v) => setOriginFilter(v as OriginFilter)}>
            <SelectTrigger size="sm" className="w-full sm:w-auto">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              {Object.entries(ORIGIN_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger size="sm" className="w-full sm:w-auto">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-foreground">Nenhum cliente encontrado</p>
          <p className="text-sm text-muted-foreground">Tente ajustar a busca ou os filtros aplicados.</p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
              Limpar filtros
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última interação</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((contact) => (
                  <TableRow
                    key={contact.id}
                    onClick={() => openContact(contact)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar size="sm">
                          <AvatarFallback>{initialsOf(contact.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{contact.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-muted-foreground">
                      {contact.whatsapp}
                    </TableCell>
                    <TableCell>
                      <JourneyBadge status={contact.journeyStatus} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{relativeTime(contact.lastInteractionAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{ownerName(contact.ownerId)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((contact) => (
              <button
                key={contact.id}
                type="button"
                onClick={() => openContact(contact)}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback>{initialsOf(contact.name)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium text-foreground">{contact.name}</span>
                  </div>
                  <JourneyBadge status={contact.journeyStatus} />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">{contact.whatsapp}</span>
                  <span>{relativeTime(contact.lastInteractionAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Responsável: {ownerName(contact.ownerId)}</p>
              </button>
            ))}
          </div>
        </>
      )}

      <ContactFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
