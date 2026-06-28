import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/Login";

// Admin pages
import Dashboard from "@/pages/admin/Dashboard";
import Agenda from "@/pages/admin/Agenda";
import Horarios from "@/pages/admin/Horarios";
import Clientes from "@/pages/admin/Clientes";
import Servicios from "@/pages/admin/Servicios";
import Stock from "@/pages/admin/Stock";
import Staff from "@/pages/admin/Staff";
import Cursos from "@/pages/admin/Cursos";
import Caja from "@/pages/admin/Caja";
import Rentabilidad from "@/pages/admin/Rentabilidad";
import Salarios from "@/pages/admin/Salarios";
import Historias from "@/pages/admin/Historias";
import HistoriaTurnos from "@/pages/admin/HistoriaTurnos";
import Reactivacion from "@/pages/admin/Reactivacion";
import VouchersCumple from "@/pages/admin/VouchersCumple";
import Configuracion from "@/pages/admin/Configuracion";
import WhatsApp from "@/pages/admin/WhatsApp";

const queryClient = new QueryClient();

// Higher Order Component for Protected Routes
function AuthRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const [location, navigate] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setIsAuthenticated(true);
      if (adminOnly && user.role.toLowerCase() !== "admin") {
        setIsAuthorized(false);
        navigate("/admin/agenda");
      } else {
        setIsAuthorized(true);
      }
    } else {
      setIsAuthenticated(false);
      navigate("/login");
    }
  }, [navigate, adminOnly]);

  if (isAuthenticated === null || isAuthorized === null) return null; // Loading state
  if (!isAuthenticated || !isAuthorized) return null; // Will redirect

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Landing page */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />

      {/* Admin panel (Protected) */}
      <Route path="/admin">{(params) => <AuthRoute component={Dashboard} adminOnly />}</Route>
      <Route path="/admin/dashboard">{(params) => <AuthRoute component={Dashboard} adminOnly />}</Route>
      <Route path="/admin/agenda">{(params) => <AuthRoute component={Agenda} />}</Route>
      <Route path="/admin/horarios">{(params) => <AuthRoute component={Horarios} />}</Route>
      <Route path="/admin/clientes">{(params) => <AuthRoute component={Clientes} adminOnly />}</Route>
      <Route path="/admin/servicios">{(params) => <AuthRoute component={Servicios} adminOnly />}</Route>
      <Route path="/admin/stock">{(params) => <AuthRoute component={Stock} adminOnly />}</Route>
      <Route path="/admin/staff">{(params) => <AuthRoute component={Staff} adminOnly />}</Route>
      <Route path="/admin/cursos">{(params) => <AuthRoute component={Cursos} adminOnly />}</Route>
      <Route path="/admin/caja">{(params) => <AuthRoute component={Caja} adminOnly />}</Route>
      <Route path="/admin/rentabilidad">{(params) => <AuthRoute component={Rentabilidad} adminOnly />}</Route>
      <Route path="/admin/salarios">{(params) => <AuthRoute component={Salarios} adminOnly />}</Route>
      <Route path="/admin/marketing/historias">{(params) => <AuthRoute component={Historias} />}</Route>
      <Route path="/admin/marketing/historia-turnos">{(params) => <AuthRoute component={HistoriaTurnos} adminOnly />}</Route>
      <Route path="/admin/marketing/reactivacion">{(params) => <AuthRoute component={Reactivacion} adminOnly />}</Route>
      <Route path="/admin/marketing/vouchers-cumple">{(params) => <AuthRoute component={VouchersCumple} adminOnly />}</Route>
      <Route path="/admin/configuracion">{(params) => <AuthRoute component={Configuracion} adminOnly />}</Route>
      <Route path="/admin/whatsapp">{(params) => <AuthRoute component={WhatsApp} adminOnly />}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
