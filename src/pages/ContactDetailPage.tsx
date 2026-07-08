// ContactDetailPage — ficha completa do cliente: header com identidade e
// ações rápidas, e abas para dados cadastrais, negócios em aberto, histórico
// de compras, agendamentos e timeline de atividades.

import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { CalendarDays, CalendarX, MessageCircle, Pencil, ShoppingBag, Wallet } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { AppointmentDialog } from "@/components/agenda/AppointmentDialog";
import { ActivityTimeline } from "@/components/contacts/ActivityTimeline";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import { JourneyBadge } from "@/components/contacts/JourneyBadge";
import { EditDealDialog } from "@/components/pipeline/EditDealDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  APPOINTMENT_TYPE_LABELS,
  ORIGIN_LABELS,
  PAYMENT_METHOD_LABELS,
  PRODUCT_LINE_LABELS,
  STAGE_LABELS,
} from "@/lib/constants";
import { brl, relativeTime } from "@/lib/format";
import { contactById, conversationWithContact, currentUser, tenantScope } from "@/lib/selectors";
import { newId, useCrm } from "@/lib/store";
import type { Appointment, Conversation, Deal } from "@/lib/types";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return `${first}${last}`.toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ContactDetailPage() {
  const { contactId } = useParams<{ contactId: string }>();
  const { state, dispatch } = useCrm();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [apptOpen, setApptOpen] = useState(false);
  const [editDealTarget, setEditDealTarget] = useState<Deal | null>(null);

  const isGestor = currentUser(state)?.role === "gestor";

  const contact = contactId ? contactById(state, contactId) : undefined;

  if (!contact) {
    return <Navigate to="/clientes" replace />;
  }

  const { deals, appointments, users } = tenantScope(state);
  const contactDeals = deals.filter((d) => d.contactId === contact.id);
  const openDeals = contactDeals.filter((d) => d.outcome === "aberto");
  const purchases = contactDeals
    .filter((d) => d.outcome === "ganho")
    .sort((a, b) => new Date(b.stageChangedAt).getTime() - new Date(a.stageChangedAt).getTime());
  const totalSpent = purchases.reduce((sum, d) => sum + d.value, 0);

  const contactAppointments = appointments
    .filter((a) => a.contactId === contact.id)
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  const now = Date.now();
  const upcomingAppointments = contactAppointments
    .filter((a) => new Date(a.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const pastAppointments = contactAppointments.filter((a) => new Date(a.startsAt).getTime() < now);

  function ownerName(ownerId: string): string {
    return users.find((u) => u.id === ownerId)?.name ?? "—";
  }

  function handleOpenConversation() {
    const existing = conversationWithContact(state, contact!.id);
    if (existing) {
      navigate(`/inbox/${existing.id}`);
      return;
    }

    if (!state.session) return;
    const conversation: Conversation = {
      id: newId("conv"),
      tenantId: state.session.tenantId,
      contactId: contact!.id,
      assigneeId: null,
      status: "aberta",
      unread: 0,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: "ADD_CONVERSATION", conversation });
    navigate(`/inbox/${conversation.id}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar size="lg" className="size-14">
            <AvatarFallback className="text-lg">{initialsOf(contact.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">{contact.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <JourneyBadge status={contact.journeyStatus} />
              <Badge variant="outline">{ORIGIN_LABELS[contact.origin]}</Badge>
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleOpenConversation}>
            <MessageCircle />
            Abrir conversa
          </Button>
          <Button variant="outline" onClick={() => setApptOpen(true)}>
            <CalendarDays />
            Agendar
          </Button>
          <Button onClick={() => setEditOpen(true)}>
            <Pencil />
            Editar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dados">
        <TabsList className="max-w-full justify-start overflow-x-auto overflow-y-hidden">
          <TabsTrigger value="dados" className="flex-none">
            Dados
          </TabsTrigger>
          <TabsTrigger value="negocios" className="flex-none">
            Negócios
          </TabsTrigger>
          <TabsTrigger value="compras" className="flex-none">
            Compras
          </TabsTrigger>
          <TabsTrigger value="agendamentos" className="flex-none">
            Agendamentos
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex-none">
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-4">
          <DadosSection contact={contact} ownerName={ownerName(contact.ownerId)} />
        </TabsContent>

        <TabsContent value="negocios" className="mt-4">
          <NegociosSection deals={openDeals} onEditDeal={isGestor ? setEditDealTarget : undefined} />
        </TabsContent>

        <TabsContent value="compras" className="mt-4">
          <ComprasSection purchases={purchases} totalSpent={totalSpent} />
        </TabsContent>

        <TabsContent value="agendamentos" className="mt-4">
          <AgendamentosSection upcoming={upcomingAppointments} past={pastAppointments} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <ActivityTimeline contactId={contact.id} />
        </TabsContent>
      </Tabs>

      <ContactFormDialog contact={contact} open={editOpen} onOpenChange={setEditOpen} />
      <AppointmentDialog
        contactId={contact.id}
        dealId={openDeals[0]?.id}
        open={apptOpen}
        onOpenChange={setApptOpen}
      />
      <EditDealDialog
        deal={editDealTarget}
        open={!!editDealTarget}
        onOpenChange={(open) => !open && setEditDealTarget(null)}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function DadosSection({
  contact,
  ownerName,
}: {
  contact: NonNullable<ReturnType<typeof contactById>>;
  ownerName: string;
}) {
  const address = contact.address;
  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoRow label="WhatsApp" value={contact.whatsapp} />
        <InfoRow label="Instagram" value={contact.instagram ?? "—"} />
        <InfoRow label="E-mail" value={contact.email ?? "—"} />
        <InfoRow label="CPF" value={contact.cpf ?? "—"} />
        <InfoRow label="Responsável" value={ownerName} />
        <InfoRow
          label="Interesses"
          value={contact.interests.length ? contact.interests.map((i) => PRODUCT_LINE_LABELS[i]).join(", ") : "—"}
        />
        <InfoRow label="Primeiro contato" value={relativeTime(contact.firstContactAt)} />
        <InfoRow label="Última interação" value={relativeTime(contact.lastInteractionAt)} />
        <InfoRow label="Cliente desde" value={formatDate(contact.createdAt)} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">Endereço</h3>
        {address && (address.street || address.city || address.state || address.zip) ? (
          <p className="text-sm text-muted-foreground">
            {[address.street, [address.city, address.state].filter(Boolean).join(" - "), address.zip]
              .filter(Boolean)
              .join(", ")}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Endereço não informado.</p>
        )}
      </div>
    </div>
  );
}

function NegociosSection({ deals, onEditDeal }: { deals: Deal[]; onEditDeal?: (deal: Deal) => void }) {
  if (deals.length === 0) {
    return <EmptyState icon={Wallet} title="Nenhum negócio em aberto no momento" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {deals.map((deal) => (
        <div
          key={deal.id}
          className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{deal.products}</span>
            <span className="text-xs text-muted-foreground">
              {PAYMENT_METHOD_LABELS[deal.payment]} · atualizado {relativeTime(deal.stageChangedAt)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{STAGE_LABELS[deal.stage]}</Badge>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{brl(deal.value)}</span>
            {onEditDeal && (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Editar negócio"
                onClick={() => onEditDeal(deal)}
              >
                <Pencil />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ComprasSection({ purchases, totalSpent }: { purchases: Deal[]; totalSpent: number }) {
  if (purchases.length === 0) {
    return <EmptyState icon={ShoppingBag} title="Este cliente ainda não fechou nenhuma compra" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
        <span className="text-sm text-muted-foreground">Total gasto</span>
        <span className="font-mono text-lg font-semibold tabular-nums text-foreground">{brl(totalSpent)}</span>
      </div>

      {purchases.map((deal) => (
        <div
          key={deal.id}
          className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{deal.products}</span>
            <span className="text-xs text-muted-foreground">
              {PAYMENT_METHOD_LABELS[deal.payment]} · {formatDate(deal.stageChangedAt)} ({relativeTime(deal.stageChangedAt)})
            </span>
          </div>
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{brl(deal.value)}</span>
        </div>
      ))}
    </div>
  );
}

function AgendamentosSection({ upcoming, past }: { upcoming: Appointment[]; past: Appointment[] }) {
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <EmptyState
        icon={CalendarX}
        title="Nenhum agendamento para este cliente"
        description="Use o botão “Agendar” acima para criar o primeiro."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">Próximos</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum agendamento futuro.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map((appt) => (
              <AppointmentRow key={appt.id} appt={appt} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">Anteriores</h3>
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum agendamento anterior.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {past.map((appt) => (
              <AppointmentRow key={appt.id} appt={appt} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentRow({ appt }: { appt: Appointment }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{APPOINTMENT_TYPE_LABELS[appt.type]}</span>
        {appt.note && <span className="text-xs text-muted-foreground">{appt.note}</span>}
      </div>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">
        {formatDate(appt.startsAt)} · {new Date(appt.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
}
