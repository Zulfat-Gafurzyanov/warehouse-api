import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CartDrawer } from "./CartDrawer";
import { Header } from "./Header";

export function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <>
      <Header onCartClick={() => setCartOpen(true)} />
      <Outlet />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
