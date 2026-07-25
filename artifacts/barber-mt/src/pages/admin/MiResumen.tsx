import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Calendar, CheckCircle2, TrendingUp, ShoppingBag, 
  ChevronLeft, ChevronRight, Award, Sparkles, MessageCircle, Clock, DollarSign
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { fetchAPI } from "@/lib/api";
import { whatsappUrl } from "@/lib/publicInfo";

interface Appointment {
  id: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone?: string;
  professionalName: string;
  serviceName: string;
  price: number;
  status: string;
  shopSales?: number;
  notes?: string;
}

interface Professional {
  id: string;
  name: string;
  specialty?: string;
  color?: string;
}

export default function MiResumen() {
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [activeProfessionalId, setActiveProfessionalId] = useState<string>("all");
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [shopGoal] = useState<number>(50000); // Meta objetivo mensual de ventas shop por profesional

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      setUser(parsedUser);
      if (parsedUser.role.toLowerCase() !== "admin") {
        setActiveProfessionalId(parsedUser.id);
      }
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profsRes, appsRes] = await Promise.all([
        fetchAPI("/api/data/professionals"),
        fetchAPI("/api/data/appointments"),
      ]);
      const profsData = await profsRes.json();
      const appsData = await appsRes.json();
      setProfessionals(profsData);
      setAppointments(appsData);

      // Default to logged-in employee if not set
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u.role.toLowerCase() !== "admin") {
          setActiveProfessionalId(u.id);
        } else if (profsData.length > 0 && activeProfessionalId === "all") {
          setActiveProfessionalId(profsData[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role?.toLowerCase() === "admin";
  const selectedProf = professionals.find(p => p.id === activeProfessionalId) || professionals[0];
  const targetProfName = selectedProf?.name || user?.name || "Profesional";

  // Filter appointments for selected professional and month
  const selectedMonthStr = currentMonthDate.toISOString().slice(0, 7); // YYYY-MM
  const monthApps = appointments.filter(a => {
    const matchMonth = a.date.startsWith(selectedMonthStr);
    const matchProf = a.professionalName?.toLowerCase() === targetProfName.toLowerCase();
    return matchMonth && matchProf;
  });

  const completedApps = monthApps.filter(a => a.status === "completado");
  const confirmedApps = monthApps.filter(a => a.status === "confirmado");
  const pendingApps = monthApps.filter(a => a.status === "agendado" || !a.status);
  const canceledApps = monthApps.filter(a => a.status === "cancelado");

  // Revenues
  const serviceRevenue = completedApps.reduce((sum, a) => sum + (a.price || 0), 0);
  const shopRevenue = completedApps.reduce((sum, a) => sum + (a.shopSales || 0), 0);
  const totalRevenue = serviceRevenue + shopRevenue;

  // Shop goal progress calculation
  const shopProgressPct = Math.min(100, Math.round((shopRevenue / shopGoal) * 100));
  const shopRemaining = Math.max(0, shopGoal - shopRevenue);

  // Upcoming appointments starting from today
  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingApps = appointments
    .filter(a => a.professionalName?.toLowerCase() === targetProfName.toLowerCase() && a.date >= todayStr && a.status !== "cancelado")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  // Extract products sold list from notes tag [SHOP_SALES]...[/SHOP_SALES]
  const shopProductsSold: Record<string, { qty: number; total: number }> = {};
  completedApps.forEach(app => {
    if (app.notes?.includes("[SHOP_SALES]")) {
      try {
        const rawJson = app.notes.split("[SHOP_SALES]")[1].split("[/SHOP_SALES]")[0];
        const parsed: Array<{ name: string; qty: number; price: number }> = JSON.parse(rawJson);
        parsed.forEach(item => {
          if (!shopProductsSold[item.name]) {
            shopProductsSold[item.name] = { qty: 0, total: 0 };
          }
          shopProductsSold[item.name].qty += item.qty;
          shopProductsSold[item.name].total += item.qty * item.price;
        });
      } catch (e) {
        console.error("Error parsing shop sales json", e);
      }
    }
  });

  const monthLabel = currentMonthDate.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const monthCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <AdminLayout title="Mi Resumen" subtitle="Rendimiento personal y metas del mes">
      {/* Month Navigation & Professional Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 shadow-xs">
          <button 
            onClick={() => {
              const d = new Date(currentMonthDate);
              d.setMonth(d.getMonth() - 1);
              setCurrentMonthDate(d);
            }}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold text-foreground px-2">
            📊 {monthCapitalized}
          </span>
          <button 
            onClick={() => {
              const d = new Date(currentMonthDate);
              d.setMonth(d.getMonth() + 1);
              setCurrentMonthDate(d);
            }}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setCurrentMonthDate(new Date())}
            className="ml-2 text-[10px] font-semibold text-primary border border-primary/30 px-2 py-0.5 rounded hover:bg-primary/10"
          >
            Este mes
          </button>
        </div>

        {/* Professional Filter (Only for Admin) */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Ver profesional:</span>
            <select
              value={activeProfessionalId}
              onChange={e => setActiveProfessionalId(e.target.value)}
              className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-semibold focus:outline-none focus:border-primary"
            >
              {professionals.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Profile Header Welcome Card */}
      <div className="relative bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-5 mb-6 overflow-hidden shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center shadow-md">
              {targetProfName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground leading-tight">¡Hola, {targetProfName}!</h2>
                <Sparkles size={16} className="text-amber-400 animate-pulse" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Resumen de tu desempeño y metas en <span className="font-semibold text-foreground">{monthCapitalized}</span>
              </p>
            </div>
          </div>
          <div className="bg-background/80 backdrop-blur-sm border border-border px-3.5 py-2 rounded-xl text-xs flex items-center gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Turnos Atendidos</p>
              <p className="text-base font-bold text-emerald-500 leading-none mt-1">{completedApps.length} <span className="text-xs text-muted-foreground font-normal">/ {monthApps.length}</span></p>
            </div>
            <div className="w-px h-7 bg-border" />
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Tasa Asistencia</p>
              <p className="text-base font-bold text-primary leading-none mt-1">
                {monthApps.length > 0 ? `${Math.round((completedApps.length / monthApps.length) * 100)}%` : "100%"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">Cargando métricas de {targetProfName}...</div>
      ) : (
        <div className="space-y-6">
          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Turnos Realizados */}
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-xs relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Turnos Atendidos</span>
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><CheckCircle2 size={16} /></span>
              </div>
              <p className="text-2xl font-bold text-foreground">{completedApps.length} <span className="text-xs text-muted-foreground font-normal">realizados</span></p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                <span>{confirmedApps.length} confirmados</span>
                <span>{canceledApps.length} cancelados</span>
              </div>
            </div>

            {/* Card 2: Ventas Shop */}
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-xs relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Ventas Shop (Productos)</span>
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><ShoppingBag size={16} /></span>
              </div>
              <p className="text-2xl font-bold text-emerald-500">${shopRevenue.toLocaleString("es-AR")}</p>
              <div className="mt-3 text-[11px] text-muted-foreground pt-2 border-t border-border/40 flex justify-between">
                <span>Meta mensual: ${shopGoal.toLocaleString("es-AR")}</span>
                <span className="font-semibold text-emerald-500">{shopProgressPct}%</span>
              </div>
            </div>

            {/* Card 3: Recaudación Servicios */}
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-xs relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Generado por Servicios</span>
                <span className="p-2 rounded-lg bg-primary/10 text-primary"><DollarSign size={16} /></span>
              </div>
              <p className="text-2xl font-bold text-foreground">${serviceRevenue.toLocaleString("es-AR")}</p>
              <div className="mt-3 text-[11px] text-muted-foreground pt-2 border-t border-border/40 flex justify-between">
                <span>Total combinado:</span>
                <span className="font-bold text-foreground">${totalRevenue.toLocaleString("es-AR")}</span>
              </div>
            </div>

            {/* Card 4: Próximos Turnos */}
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-xs relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Próximos Turnos</span>
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500"><Calendar size={16} /></span>
              </div>
              <p className="text-2xl font-bold text-amber-500">{upcomingApps.length} <span className="text-xs text-muted-foreground font-normal">programados</span></p>
              <div className="mt-3 text-[11px] text-muted-foreground pt-2 border-t border-border/40 flex justify-between">
                <span>Pendientes este mes:</span>
                <span className="font-semibold text-amber-500">{pendingApps.length}</span>
              </div>
            </div>
          </div>

          {/* Goal Progress Section (Objetivo de Ventas Shop) */}
          <div className="bg-card border border-emerald-500/30 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><Award size={18} /></span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Objetivo Mensual de Ventas de Shop</h3>
                  <p className="text-xs text-muted-foreground">Progreso hacia tu meta de premios y comisiones</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
                  {shopProgressPct >= 100 ? "🎉 ¡Objetivo Alcanzado!" : `${shopProgressPct}% completado`}
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-muted/40 h-4 rounded-full overflow-hidden p-0.5 border border-border/40">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${shopProgressPct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm"
              />
            </div>

            {/* Goal feedback text */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-xs">
              <span className="text-muted-foreground">Vendido: <strong className="text-foreground">${shopRevenue.toLocaleString("es-AR")}</strong></span>
              {shopRemaining > 0 ? (
                <span className="text-amber-500 font-semibold flex items-center gap-1">
                  🎯 Te faltan <strong>${shopRemaining.toLocaleString("es-AR")}</strong> para completar tu objetivo.
                </span>
              ) : (
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  ✨ ¡Excelente trabajo! Superaste tu meta por ${Math.abs(shopRemaining).toLocaleString("es-AR")}.
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Feed de Próximos Turnos */}
            <div className="lg:col-span-2 bg-card border border-border/60 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Próximos Turnos Asignados</h3>
                </div>
                <span className="text-xs text-muted-foreground">{upcomingApps.length} turnos</span>
              </div>

              {upcomingApps.length > 0 ? (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                  {upcomingApps.map(app => {
                    const isConfirmed = app.status === "confirmado" || app.status === "completado";
                    return (
                      <div 
                        key={app.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          isConfirmed 
                            ? "bg-emerald-500/5 border-emerald-500/25" 
                            : "bg-amber-500/5 border-amber-500/25"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{app.clientName}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isConfirmed ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                            }`}>
                              {isConfirmed ? "CONFIRMADO ✓" : "PENDIENTE"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{app.serviceName}</p>
                          <div className="flex items-center gap-3 text-xs font-semibold text-foreground/80 mt-1">
                            <span>📅 {app.date.split("-").reverse().join("/")}</span>
                            <span>⏰ {app.time}hs</span>
                            <span className="text-muted-foreground font-normal">${app.price?.toLocaleString("es-AR")}</span>
                          </div>
                        </div>

                        {app.clientPhone && (
                          <a
                            href={whatsappUrl(app.clientPhone, `Hola ${app.clientName}! Te escribo desde Estudio Joha Molinero para coordinar tu turno de ${app.serviceName} el día ${app.date.split("-").reverse().join("/")} a las ${app.time}hs. ✨`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors self-end sm:self-center"
                          >
                            <MessageCircle size={14} /> Recordatorio
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <Calendar size={28} className="mx-auto mb-2 opacity-40" />
                  No tenés más turnos próximos programados.
                </div>
              )}
            </div>

            {/* Right Col: Productos Vendidos por Mí este Mes */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-500" />
                  <h3 className="text-sm font-bold text-foreground">Productos Vendidos</h3>
                </div>
                <span className="text-xs font-bold text-emerald-500">${shopRevenue.toLocaleString("es-AR")}</span>
              </div>

              {Object.keys(shopProductsSold).length > 0 ? (
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] scrollbar-thin">
                  {Object.entries(shopProductsSold).map(([name, data]) => (
                    <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40 text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{name}</p>
                        <p className="text-[10px] text-muted-foreground">{data.qty} unidad{data.qty > 1 ? "es" : ""} vendida{data.qty > 1 ? "s" : ""}</p>
                      </div>
                      <span className="font-bold text-emerald-500">${data.total.toLocaleString("es-AR")}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground my-auto">
                  <ShoppingBag size={28} className="mx-auto mb-2 opacity-40" />
                  Aún no registraste ventas de productos este mes.
                  <p className="text-[10px] text-muted-foreground/70 mt-1">Podés registrarlas al editar cualquier turno cobrado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
