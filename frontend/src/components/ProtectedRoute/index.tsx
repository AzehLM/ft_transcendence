import { Outlet } from "react-router-dom";
import { useRequireAuth } from "../../hooks/RequireAuth";

export function ProtectedRoute() {
  const { isReady } = useRequireAuth();
  if (!isReady) return <p>Loading...</p>;
  return <Outlet />;
}