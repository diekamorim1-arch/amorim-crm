import { Navigate, Route, Routes } from "react-router";

import { AppShell } from "@/components/layout/AppShell";
import { AgendaPage } from "@/pages/AgendaPage";
import { ContactDetailPage } from "@/pages/ContactDetailPage";
import { ContactsPage } from "@/pages/ContactsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { InboxPage } from "@/pages/InboxPage";
import { LoginPage } from "@/pages/LoginPage";
import { PipelinePage } from "@/pages/PipelinePage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { useCrm } from "@/lib/store";

function App() {
  const { state } = useCrm();
  const session = state.session;

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/inbox/:conversationId" element={<InboxPage />} />
        <Route path="/clientes" element={<ContactsPage />} />
        <Route path="/clientes/:contactId" element={<ContactDetailPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/config" element={<PlaceholderPage title="Configurações" task={9} />} />
        <Route path="/whatsapp" element={<PlaceholderPage title="WhatsApp" task={10} />} />
        <Route path="/admin" element={<PlaceholderPage title="Admin do SaaS" task={11} />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
