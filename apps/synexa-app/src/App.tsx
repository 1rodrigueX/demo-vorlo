import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Login } from "@/routes/Login";
import { Acessos } from "@/routes/Acessos";

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

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={session ? <Acessos /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
