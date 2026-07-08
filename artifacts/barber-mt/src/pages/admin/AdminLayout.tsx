import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Calendar, Users, Briefcase, Package, UserCog,
  GraduationCap, Wallet, TrendingUp, BadgeDollarSign,
  Gift, History, RotateCw, Ticket, Settings, LogOut,
  ChevronLeft, ChevronRight, Menu, AlertTriangle, Bell,
  MessageSquare, Clock, Image as ImageIcon
} from "lucide-react";
import LogoIcon from "@/components/LogoIcon";
import { fetchAPI } from "@/lib/api";

const iconMap: Record<string, React.ReactNode> = {
  home: <Home size={16} />,
  calendar: <Calendar size={16} />,
  users: <Users size={16} />,
  briefcase: <Briefcase size={16} />,
  package: <Package size={16} />,
  "user-cog": <UserCog size={16} />,
  "graduation-cap": <GraduationCap size={16} />,
  wallet: <Wallet size={16} />,
  "chart-line": <TrendingUp size={16} />,
  "badge-dollar-sign": <BadgeDollarSign size={16} />,
  gift: <Gift size={16} />,
  history: <History size={16} />,
  "rotate-cw": <RotateCw size={16} />,
  ticket: <Ticket size={16} />,
  settings: <Settings size={16} />,
  "log-out": <LogOut size={16} />,
  clock: <Clock size={16} />,
  image: <ImageIcon size={16} />,
};

const navConfig = {
  sections: [
    {
      id: "principal",
      title: null,
      items: [
        { id: "dashboard", label: "Inicio", icon: "home", path: "/admin/dashboard" },
        { id: "agenda", label: "Agenda", icon: "calendar", path: "/admin/agenda" },
        { id: "horarios", label: "Mis Horarios", icon: "clock", path: "/admin/horarios" },
        { id: "clientes", label: "Clientes", icon: "users", path: "/admin/clientes" },
        { id: "servicios", label: "Servicios", icon: "briefcase", path: "/admin/servicios" },
        { id: "stock", label: "Stock", icon: "package", path: "/admin/stock" },
        { id: "staff", label: "Staff", icon: "user-cog", path: "/admin/staff" },
      ],
    },
    {
      id: "educacion",
      title: "Educación",
      items: [
        { id: "cursos", label: "Cursos", icon: "graduation-cap", path: "/admin/cursos" },
      ],
    },
    {
      id: "finanzas",
      title: "Finanzas",
      items: [
        { id: "caja", label: "Caja", icon: "wallet", path: "/admin/caja" },
        { id: "rentabilidad", label: "Rentabilidad", icon: "chart-line", path: "/admin/rentabilidad" },
        { id: "salarios", label: "Salarios", icon: "badge-dollar-sign", path: "/admin/salarios" },
      ],
    },
    {
      id: "marketing",
      title: "Marketing",
      items: [
        { id: "historias", label: "Historias", icon: "image", path: "/admin/marketing/historias" },
        { id: "historia-turnos", label: "Historia de turnos", icon: "history", path: "/admin/marketing/historia-turnos" },
        { id: "reactivacion", label: "Reactivación", icon: "rotate-cw", path: "/admin/marketing/reactivacion" },
        { id: "vouchers-cumple", label: "Vouchers / Cumple", icon: "ticket", path: "/admin/marketing/vouchers-cumple" },
        { id: "portada", label: "Gestor Portada", icon: "image", path: "/admin/portada" },
      ],
    },
  ],
  footer: [
    { id: "whatsapp", label: "WhatsApp Bot", icon: "message-square", path: "/admin/whatsapp" },
    { id: "configuracion", label: "Configuración", icon: "settings", path: "/admin/configuracion" },
    { id: "logout", label: "Salir", icon: "log-out", path: "/" },
  ],
};

function NavItem({
  item,
  collapsed,
}: {
  item: typeof navConfig.sections[0]["items"][0] & { badge?: { type: string; value?: number } };
  collapsed: boolean;
}) {
  const [location, setLocation] = useLocation();
  const isActive = location === item.path || location.startsWith(item.path + "/");

  const handleClick = (e: React.MouseEvent) => {
    if (item.id === "logout") {
      e.preventDefault();
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setLocation("/");
    }
  };

  return (
    <Link href={item.path} onClick={handleClick}>
      <motion.div
        whileHover={{ x: collapsed ? 0 : 2 }}
        className={`
          relative flex items-center gap-3 px-3 py-2.5 rounded-sm cursor-pointer transition-all duration-200 group
          ${isActive
            ? "bg-primary/15 text-primary"
            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
          }
        `}
      >
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full"
          />
        )}
        <span className={`flex-shrink-0 ${isActive ? "text-primary" : ""}`}>
          {iconMap[item.icon]}
        </span>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="text-xs font-medium tracking-wide whitespace-nowrap overflow-hidden"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
        {"badge" in item && item.badge && !collapsed && (
          <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            item.badge.type === "warning"
              ? "bg-amber-500/20 text-amber-400"
              : "bg-primary/20 text-primary"
          }`}>
            {item.badge.type === "warning" ? item.badge.value : item.badge.value}
          </span>
        )}
      </motion.div>
    </Link>
  );
}

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, navigate] = useLocation();

  const [user, setUser] = useState<{name: string, role: string, initial: string} | null>(null);
  const [badges, setBadges] = useState<{ agenda: number; stockLow: number }>({ agenda: 0, stockLow: 0 });
  
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }

    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      fetchAPI("/api/data/appointments").then(r => r.json()).catch(() => []),
      fetchAPI("/api/data/products").then(r => r.json()).catch(() => []),
    ]).then(([apps, products]) => {
      const agendaCount = apps.filter((a: any) => a.date === today && a.status === "agendado").length;
      const stockLow = products.filter((p: any) => p.stock <= p.minStock).length;
      setBadges({ agenda: agendaCount, stockLow });
    });
  }, []);

  const getItemBadge = (itemId: string) => {
    if (itemId === "agenda" && badges.agenda > 0) return { type: "count", value: badges.agenda };
    if (itemId === "stock" && badges.stockLow > 0) return { type: "warning", value: badges.stockLow };
    return undefined;
  };

  const isAdmin = user?.role?.toLowerCase() === "admin";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className={`
          fixed md:relative inset-y-0 left-0 z-50
          flex flex-col bg-sidebar border-r border-sidebar-border
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          transition-transform md:transition-none
        `}
        style={{ minWidth: collapsed ? 64 : 220 }}
      >
        {/* Logo header */}
        <div className={`flex items-center gap-3 px-3 py-4 border-b border-sidebar-border ${collapsed ? "justify-center" : ""}`}>
          <button
            onClick={() => navigate("/")}
            className="flex-shrink-0 hover:opacity-80 transition-opacity"
            title="Volver al sitio"
          >
            <LogoIcon size={36} />
          </button>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col leading-none overflow-hidden"
              >
                <span className="text-[11px] font-semibold tracking-wider text-sidebar-foreground truncate">
                  Estudio Joha Molinero
                </span>
                <span className="text-[9px] tracking-[0.3em] text-primary uppercase font-medium mt-0.5">
                  STUDIO
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex ml-auto flex-shrink-0 w-6 h-6 items-center justify-center rounded-sm text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all"
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>



        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-0.5 scrollbar-thin">
          {navConfig.sections.map((section) => {
            const visibleItems = section.items.filter(item => {
              if (isAdmin) return true;
              // Staff can see: agenda, horarios, historias
              return item.id === "agenda" || item.id === "horarios" || item.id === "historias";
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.id} className="mb-2">
                {section.title && !collapsed && (
                  <p className="text-[9px] font-semibold tracking-[0.2em] text-sidebar-foreground/30 uppercase px-3 py-2">
                    {section.title}
                  </p>
                )}
                {section.title && collapsed && <div className="h-px bg-sidebar-border/50 mx-2 my-2" />}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavItem key={item.id} item={{ ...item, badge: getItemBadge(item.id) }} collapsed={collapsed} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-2 py-2 space-y-0.5">
          {navConfig.footer.filter(item => isAdmin || item.id === "logout").map((item) => (
            <NavItem key={item.id} item={item as any} collapsed={collapsed} />
          ))}

          {/* User info */}
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-2 px-3 py-2.5 border border-sidebar-border rounded-sm flex items-center gap-3"
              >
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-primary">EJ</span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-semibold text-sidebar-foreground truncate">{user ? user.name : "Estudio Joha"}</p>
                  <p className="text-[9px] text-sidebar-foreground/40 truncate">{user ? user.role : "Admin"}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-foreground/60 hover:text-foreground"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-foreground tracking-wide">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <button className="relative w-8 h-8 flex items-center justify-center rounded-sm text-foreground/50 hover:text-foreground hover:bg-card transition-all">
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-sm text-foreground/50 hover:text-foreground hover:bg-card transition-all">
              <MessageSquare size={15} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
