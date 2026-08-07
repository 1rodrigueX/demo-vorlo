import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Login } from "@/routes/Login";
import { AppShell } from "@/components/AppShell";
import { CrmDashboard } from "@/routes/crm/CrmDashboard";
import { Pipeline } from "@/routes/crm/Pipeline";
import { Contatos } from "@/routes/crm/Contatos";
import { Empresas } from "@/routes/crm/Empresas";
import { Leads } from "@/routes/crm/Leads";
import { Emails } from "@/routes/crm/Emails";
import { Trajetorias } from "@/routes/crm/Trajetorias";

function Splash() {
  return (
    <div className="brand-aura grid h-full place-items-center">
      <div className="h-3 w-3 animate-pulse rounded-full bg-ignite" />
    </div>
  );
}

export function App() {
  const { session, loading } = useAuth();
  if (loading) return <Splash />;

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // App desktop é SÓ o CRM: sem hub de módulos, cai direto no CRM ao entrar.
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/crm" replace />} />
      <Route path="/crm" element={<AppShell />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CrmDashboard />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="companies" element={<Empresas />} />
        <Route path="contacts" element={<Contatos />} />
        <Route path="leads" element={<Leads />} />
        <Route path="emails" element={<Emails />} />
        <Route path="trajetorias" element={<Trajetorias />} />
      </Route>
      <Route path="*" element={<Navigate to="/crm" replace />} />
    </Routes>
  );
}
