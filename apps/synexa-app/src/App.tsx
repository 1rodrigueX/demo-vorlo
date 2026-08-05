import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Login } from "@/routes/Login";
import { Acessos } from "@/routes/Acessos";
import { AppShell } from "@/components/AppShell";
import { CrmDashboard } from "@/routes/crm/CrmDashboard";
import { Placeholder } from "@/routes/crm/Placeholder";

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

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/" element={<Acessos />} />
      <Route path="/crm" element={<AppShell />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CrmDashboard />} />
        <Route path="pipeline" element={<Placeholder title="Pipeline" />} />
        <Route path="companies" element={<Placeholder title="Empresas" />} />
        <Route path="contacts" element={<Placeholder title="Contatos" />} />
        <Route path="leads" element={<Placeholder title="Leads" />} />
        <Route path="emails" element={<Placeholder title="E-mails" />} />
        <Route path="trajetorias" element={<Placeholder title="Trajetórias" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
