import { Navigate, Route, Routes } from "react-router";

import { AppShell } from "@/components/layout/AppShell";
import { AccountPage } from "@/pages/AccountPage";
import { AdminPlansPage } from "@/pages/AdminPlansPage";
import { AdminTenantsPage } from "@/pages/AdminTenantsPage";
import { AdminUsersPage } from "@/pages/AdminUsersPage";
import { AgendaPage } from "@/pages/AgendaPage";
import { ContactDetailPage } from "@/pages/ContactDetailPage";
import { ContactsPage } from "@/pages/ContactsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { GastosPage } from "@/pages/GastosPage";
import { HomePage } from "@/pages/HomePage";
import { InboxPage } from "@/pages/InboxPage";
import { LoginPage } from "@/pages/LoginPage";
import { PipelinePage } from "@/pages/PipelinePage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SupplierDetailPage } from "@/pages/SupplierDetailPage";
import { SuppliersPage } from "@/pages/SuppliersPage";
import { WhatsAppPage } from "@/pages/WhatsAppPage";
import { useCrm } from "@/lib/store";

function App() {
  const { state } = useCrm();
  const session = state.session;

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />

      <Route element={<AppShell />}>
        <Route path="/" element={session?.role === "admin_saas" && !session.tenantId ? <HomePage /> : <DashboardPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/inbox/:conversationId" element={<InboxPage />} />
        <Route path="/clientes" element={<ContactsPage />} />
        <Route path="/clientes/:contactId" element={<ContactDetailPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/fornecedores" element={<SuppliersPage />} />
        <Route path="/fornecedores/:supplierId" element={<SupplierDetailPage />} />
        <Route path="/gastos" element={<GastosPage />} />
        <Route path="/config" element={<SettingsPage />} />
        <Route path="/conta" element={<AccountPage />} />
        <Route path="/whatsapp" element={<WhatsAppPage />} />
        <Route path="/admin" element={<AdminTenantsPage />} />
        <Route path="/admin/usuarios" element={<AdminUsersPage />} />
        <Route path="/admin/planos" element={<AdminPlansPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
