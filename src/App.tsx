import { Navigate, Route, Routes } from "react-router";

import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import { useCrm } from "@/lib/store";

function App() {
  const { state } = useCrm();
  const session = state.session;

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route element={<AppShell />}>
        <Route path="/" element={<PlaceholderPage title="Dashboard" task={8} />} />
        <Route path="/pipeline" element={<PlaceholderPage title="Pipeline" task={4} />} />
        <Route path="/inbox" element={<PlaceholderPage title="Inbox" task={6} />} />
        <Route path="/inbox/:conversationId" element={<PlaceholderPage title="Inbox" task={6} />} />
        <Route path="/clientes" element={<PlaceholderPage title="Clientes" task={5} />} />
        <Route path="/clientes/:contactId" element={<PlaceholderPage title="Cliente" task={5} />} />
        <Route path="/agenda" element={<PlaceholderPage title="Agenda" task={7} />} />
        <Route path="/config" element={<PlaceholderPage title="Configurações" task={9} />} />
        <Route path="/whatsapp" element={<PlaceholderPage title="WhatsApp" task={10} />} />
        <Route path="/admin" element={<PlaceholderPage title="Admin do SaaS" task={11} />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
