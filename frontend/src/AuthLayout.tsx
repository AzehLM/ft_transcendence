import { Outlet } from "react-router-dom";
import { Footer } from "./components/Footer";

export function AuthLayout() {
  return (
    <div className="auth-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>
      <Footer hasSidebar={false} />
    </div>
  );
}