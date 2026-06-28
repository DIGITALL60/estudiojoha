import { fetchAPI } from "@/lib/api";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar, BarChart2, DollarSign, Users, TrendingUp,
  ChevronRight, MessageSquare, Plus, Clock,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { Link } from "wouter";

interface AppointmentRow {
  id: string; date: string; time: string; price: number; status: string;
  clientName: string; professionalName: string; serviceName: string;
}

const quickActions = [
  { label: "Nuevo turno", icon: Plus, path: "/admin/agenda", color: "bg-primary text-primary-foreground" },
  { label: "Nuevo cliente", icon: Users, path: "/admin/clientes", color: "bg-card border border-border text-foreground" },
  { label: "Ver caja", icon: DollarSign, path: "/admin/caja", color: "bg-card border border-border text-foreground" },
  { label: "Rentabilidad", icon: TrendingUp, path: "/admin/rentabilidad", color: "bg-card border border-border text-foreground" },
];

const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function Dashboard() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [waStatus, setWaStatus] = useState(false);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const hour = now.getHours();
  const greeting = hour < 12 ? "Buen día" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [appsRes, clientsRes, waRes] = await Promise.all([
          fetchAPI("/api/data/appointments"),
          fetchAPI("/api/data/clients"),
          fetchAPI("/api/whatsapp/status"),
        ]);
        const apps = await appsRes.json();
        const clients = await clientsRes.json();
        const wa = await waRes.json();
        setAppointments(apps);
        setClientCount(clients.length);
        setWaStatus(wa.connected);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
    // Refresh WhatsApp status every 10s
    const interval = setInterval(async () => {
      try { const r = await fetchAPI("/api/whatsapp/status"); const d = await r.json(); setWaStatus(d.connected); } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const todayApps = appointments.filter(a => a.date === todayStr);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const weekApps = appointments.filter(a => {
    const d = new Date(a.date); return d >= weekStart && d <= now;
  });
  const monthApps = appointments.filter(a => {
    const d = new Date(a.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthIncome = monthApps.filter(a => a.status === "completado").reduce((sum, a) => sum + a.price, 0);

  const stats = [
    { id: "turnos-hoy", label: "TURNOS HOY", value: String(todayApps.length), icon: Calendar, color: "text-blue-400", bg: "bg-blue-400/10", change: null },
    { id: "turnos-semana", label: "TURNOS ESTA SEMANA", value: String(weekApps.length), icon: BarChart2, color: "text-violet-400", bg: "bg-violet-400/10", change: null },
    { id: "ingresos-mes", label: "INGRESOS DEL MES", value: `$ ${monthIncome.toLocaleString("es-AR")}`, icon: DollarSign, color: "text-primary", bg: "bg-primary/10", change: null },
    { id: "clientes-totales", label: "CLIENTES TOTALES", value: String(clientCount), icon: Users, color: "text-emerald-400", bg: "bg-emerald-400/10", change: null },
  ];

  const upcoming = appointments
    .filter(a => a.date >= todayStr && a.status === "agendado")
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 6);

  return (
    <AdminLayout title="Inicio" subtitle="Resumen de tu negocio"
      actions={
        <Link href="/admin/agenda">
          <button className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold tracking-wide px-4 py-2 rounded-sm hover:bg-primary/90">
            <Plus size={13} /> Nuevo turno
          </button>
        </Link>
      }>
      {/* Greeting */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">{greeting}, <span className="text-primary">Estudio</span></h2>
        <p className="text-sm text-muted-foreground mt-1">
          {now.toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats grid */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.id} variants={fadeUp}
              className="bg-card border border-border/50 rounded-sm p-4 flex flex-col gap-3 hover:border-border transition-colors">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">{stat.label}</p>
                <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${stat.bg}`}>
                  <Icon size={14} className={stat.color} />
                </div>
              </div>
              <p className="text-2xl font-light text-foreground">
                {loading ? <span className="text-muted-foreground/30">—</span> : stat.value}
              </p>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* WhatsApp status + Quick actions */}
        <motion.div variants={fadeUp} initial="hidden" animate="show"
          className="lg:col-span-2 bg-card border border-border/50 rounded-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageSquare size={10} className="text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Estado de WhatsApp</h3>
            <div className={`ml-auto flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-sm ${waStatus ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${waStatus ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              {waStatus ? "Conectado" : "Sin conectar"}
            </div>
            {!waStatus && (
              <Link href="/admin/whatsapp">
                <button className="text-[10px] font-semibold text-primary border border-primary/30 px-2 py-1 rounded-sm hover:bg-primary hover:text-primary-foreground transition-all">
                  Vincular →
                </button>
              </Link>
            )}
          </div>

          {/* Quick actions */}
          <div className="pt-4 border-t border-border/40">
            <p className="text-[9px] font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-3">Acciones rápidas</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {quickActions.map(action => {
                const Icon = action.icon;
                return (
                  <Link key={action.label} href={action.path}>
                    <button className={`w-full flex flex-col items-center gap-2 py-3 px-2 rounded-sm text-xs font-medium transition-all hover:opacity-80 ${action.color}`}>
                      <Icon size={14} /> {action.label}
                    </button>
                  </Link>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Today's appointments */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.1 }}
          className="bg-card border border-border/50 rounded-sm p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Turnos de hoy</h3>
          {loading ? <p className="text-xs text-muted-foreground">Cargando...</p> :
            todayApps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock size={20} className="text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Sin turnos hoy</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayApps.slice(0, 4).map(a => (
                  <div key={a.id} className="flex items-start gap-2 p-2 rounded-sm bg-muted/10 border border-border/30">
                    <span className="text-[10px] font-bold text-primary mt-0.5 w-10 flex-shrink-0">{a.time}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{a.clientName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{a.serviceName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </motion.div>
      </div>

      {/* Upcoming appointments */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.15 }}
        className="mt-4 bg-card border border-border/50 rounded-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Próximos turnos</h3>
          <Link href="/admin/agenda">
            <button className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1">
              Ver agenda <ChevronRight size={10} />
            </button>
          </Link>
        </div>
        {loading ? <p className="text-xs text-muted-foreground">Cargando...</p> :
          upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Clock size={20} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Sin turnos próximos</p>
              <Link href="/admin/agenda">
                <button className="mt-4 text-xs text-primary border border-primary/30 px-4 py-2 rounded-sm hover:bg-primary hover:text-primary-foreground transition-all">
                  + Crear primer turno
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(a => (
                <div key={a.id} className="flex items-center gap-4 px-3 py-2.5 rounded-sm border border-border/30 hover:border-primary/20 hover:bg-primary/5 transition-colors">
                  <div className="text-center flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground">{new Date(a.date + "T00:00:00").toLocaleDateString("es-AR", { weekday: "short" })}</p>
                    <p className="text-xs font-bold text-foreground">{a.time}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{a.clientName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{a.serviceName} · {a.professionalName}</p>
                  </div>
                  <p className="text-xs font-medium text-primary flex-shrink-0">${a.price.toLocaleString("es-AR")}</p>
                </div>
              ))}
            </div>
          )}
      </motion.div>
    </AdminLayout>
  );
}
