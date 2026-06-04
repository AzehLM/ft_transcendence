import { useRequireUnauth } from "../../hooks/RequireAuth";
import { Outlet } from "react-router-dom";

export function PublicRoute() {
  const { isReady } = useRequireUnauth();
  if (!isReady) return null;
  return <Outlet />;
}