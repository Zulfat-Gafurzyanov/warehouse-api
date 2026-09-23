import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { CartDrawer } from "./CartDrawer";
import { Header } from "./Header";

export function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isOpen, openCart, closeCart } = useCart();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <>
      <Header onCartClick={openCart} />
      <Outlet />
      <CartDrawer open={isOpen} onClose={closeCart} />
    </>
  );
}
