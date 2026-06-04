import { Outlet } from "react-router-dom";
import { useRequireAuth } from "../../hooks/RequireAuth";
import { NotificationProvider } from "../../contexts/NotificationContext";

export function ProtectedRoute() {
  const { isReady } = useRequireAuth();
  if (!isReady) return <p>Loading...</p>;
  return (
    <NotificationProvider>
      <Outlet />
    </NotificationProvider>
  );
}