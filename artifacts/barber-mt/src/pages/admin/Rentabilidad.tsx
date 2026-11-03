import { fetchAPI } from "@/lib/api";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, DollarSign, Users, Briefcase, Calendar as CalendarIcon,
  ChevronLeft, ChevronRight, Wallet, CreditCard, Banknote, Landmark, ArrowUpRight
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface AppointmentRow {
  id: string; date: string; time: string; price: number; status: string;
  clientName: string; professionalName: string; serviceName: string; paymentMethod: string;
}

export default function Rentabilidad() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [expenses, setExpenses] = useState<{ id: string; amount: number; date: string; concept: string }[]>([]);
  const [filter, setFilter] = useState<"Semana" | "Mes" | "Trimestre" | "Año">("Semana");

  // Selector de fecha con calendario para cualquier período (Semana, Mes, Trimestre, Año)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  useEffect(() => {
    Promise.all([
      fetchAPI("/api/data/appointments").then(r => r.json()),
      fetchAPI("/api/data/expenses").then(r => r.json()),
    ])
      .then(([apps, exps]) => {
        setAppointments(apps.filter((a: any) => a.status === "completado"));
        setExpenses(exps);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Helper para calcular inicio (lunes) y fin (domingo) de cualquier fecha seleccionada
  const getWeekBounds = (dateStr: string) => {
    const base = new Date(dateStr + "T00:00:00");
    const day = base.getDay(); // 0 domingo, 1 lunes, ...
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(base);
    monday.setDate(base.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const pad = (n: number) => String(n).padStart(2, "0");
    const startStr = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    const endStr = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;

    return { monday, sunday, startStr, endStr };
  };

  const { monday, sunday, startStr: weekStart, endStr: weekEnd } = getWeekBounds(selectedDate);
  const currentDateObj = new Date(selectedDate + "T00:00:00");

  const handlePrevPeriod = () => {
    const d = new Date(selectedDate + "T00:00:00");
    if (filter === "Semana") {
      d.setDate(d.getDate() - 7);
    } else if (filter === "Mes") {
      d.setMonth(d.getMonth() - 1);
    } else if (filter === "Trimestre") {
      d.setMonth(d.getMonth() - 3);
    } else if (filter === "Año") {
      d.setFullYear(d.getFullYear() - 1);
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  };

  const handleNextPeriod = () => {
    const d = new Date(selectedDate + "T00:00:00");
    if (filter === "Semana") {
      d.setDate(d.getDate() + 7);
    } else if (filter === "Mes") {
      d.setMonth(d.getMonth() + 1);
    } else if (filter === "Trimestre") {
      d.setMonth(d.getMonth() + 3);
    } else if (filter === "Año") {
      d.setFullYear(d.getFullYear() + 1);
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  };

  const getPeriodLabel = () => {
    if (filter === "Semana") {
      return `Semana: ${monday.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} al ${sunday.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;
    }
    if (filter === "Mes") {
      const monthName = currentDateObj.toLocaleDateString("es-AR", { month: "long" });
      const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      return `Mes: ${capitalized} ${currentDateObj.getFullYear()}`;
    }
    if (filter === "Trimestre") {
      const q = Math.floor(currentDateObj.getMonth() / 3);
      const qLabels = [
        "T1 (Ene - Mar)",
        "T2 (Abr - Jun)",
        "T3 (Jul - Sep)",
        "T4 (Oct - Dic)",
      ];
      return `Trimestre: ${qLabels[q]} ${currentDateObj.getFullYear()}`;
    }
    if (filter === "Año") {
      return `Año: ${currentDateObj.getFullYear()}`;
    }
    return "";
  };

  const getFilteredApps = () => {
    const targetYear = currentDateObj.getFullYear();
    const targetMonth = currentDateObj.getMonth();
    const targetQuarter = Math.floor(targetMonth / 3);

    return appointments.filter(a => {
      const d = new Date(a.date + "T00:00:00");
      if (filter === "Año") return d.getFullYear() === targetYear;
      if (filter === "Mes") return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      if (filter === "Semana") {
        return a.date >= weekStart && a.date <= weekEnd;
      }
      if (filter === "Trimestre") {
        const appQuarter = Math.floor(d.getMonth() / 3);
        return d.getFullYear() === targetYear && appQuarter === targetQuarter;
      }
      return true;
    });
  };

  const filteredApps = getFilteredApps();

  const filterByPeriod = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    const targetYear = currentDateObj.getFullYear();
    const targetMonth = currentDateObj.getMonth();
    const targetQuarter = Math.floor(targetMonth / 3);

    if (filter === "Año") return d.getFullYear() === targetYear;
    if (filter === "Mes") return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    if (filter === "Semana") {
      return dateStr >= weekStart && dateStr <= weekEnd;
    }
    if (filter === "Trimestre") {
      const appQuarter = Math.floor(d.getMonth() / 3);
      return d.getFullYear() === targetYear && appQuarter === targetQuarter;
    }
    return true;
  };

  const filteredExpenses = expenses.filter(e => filterByPeriod(e.date));

  const ingresos = filteredApps.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  const egresos = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const utilidad = ingresos - egresos;
  const ventas = filteredApps.length;
  const ticketPromedio = ventas > 0 ? ingresos / ventas : 0;

  // Desglose detallado por Efectivo, Transferencia y Cuentas Corrientes (Solicitado por la dueña)
  const methodTotals = filteredApps.reduce(
    (acc, a) => {
      const raw = (a.paymentMethod || "Efectivo").trim();
      const lower = raw.toLowerCase();
      const amount = Number(a.price) || 0;

      if (
        lower.includes("transferencia") ||
        lower.includes("mercado") ||
        lower.includes("banco") ||
        lower.includes("lemon") ||
        lower.includes("modo") ||
        lower.includes("naranja") ||
        lower.includes("personal") ||
        lower.includes("uala") ||
        lower.includes("ualá") ||
        lower.includes("prex") ||
        lower.includes("cuenta dni")
      ) {
        acc.transferencia += amount;
        let walletKey = "Mercado Pago";
        if (lower.includes("córdoba") || lower.includes("cordoba")) walletKey = "Banco de Córdoba";
        else if (lower.includes("naranja")) walletKey = "Naranja X";
        else if (lower.includes("personal")) walletKey = "Personal Pay";
        else if (lower.includes("lemon")) walletKey = "Lemon Cash";
        else if (lower.includes("modo")) walletKey = "Modo";
        else if (lower.includes("prex")) walletKey = "Prex";
        else if (lower.includes("uala") || lower.includes("ualá")) walletKey = "Ualá";
        else if (lower.includes("(")) {
          const m = raw.match(/\((.*?)\)/);
          if (m) walletKey = m[1];
        }
        acc.wallets[walletKey] = (acc.wallets[walletKey] || 0) + amount;
      } else if (
        lower.includes("corriente") ||
        lower.includes("cta") ||
        lower.includes("tarjeta") ||
        lower.includes("debito") ||
        lower.includes("credito")
      ) {
        acc.ctasCorrientes += amount;
      } else {
        acc.efectivo += amount;
      }
      return acc;
    },
    { efectivo: 0, transferencia: 0, ctasCorrientes: 0, wallets: {} as Record<string, number> }
  );

  const byService = filteredApps.reduce((acc, a) => {
    acc[a.serviceName] = (acc[a.serviceName] || 0) + a.price;
    return acc;
  }, {} as Record<string, number>);

  const byProfessional = filteredApps.reduce((acc, a) => {
    acc[a.professionalName] = (acc[a.professionalName] || 0) + a.price;
    return acc;
  }, {} as Record<string, number>);

  const byMethod = filteredApps.reduce((acc, a) => {
    const m = a.paymentMethod || "Efectivo";
    acc[m] = (acc[m] || 0) + a.price;
    return acc;
  }, {} as Record<string, number>);

  // Tendencia diaria
  const tendencia: Record<string, number> = {};
  filteredApps.forEach(a => {
    const date = a.date.substring(5); // MM-DD
    tendencia[date] = (tendencia[date] || 0) + a.price;
  });

  const chartData = Object.keys(tendencia).sort().map(k => ({
    date: k,
    ingresos: tendencia[k]
  }));

  const eftPercent = ingresos > 0 ? Math.round((methodTotals.efectivo / ingresos) * 100) : 0;
  const transPercent = ingresos > 0 ? Math.round((methodTotals.transferencia / ingresos) * 100) : 0;
  const ctasPercent = ingresos > 0 ? Math.round((methodTotals.ctasCorrientes / ingresos) * 100) : 0;

  return (
    <AdminLayout title="Rentabilidad" subtitle="Análisis financiero detallado y desglose de medios">
      {/* Selector de Período y Selector de Semana con Calendario */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-card border border-border/50 rounded-xl p-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["Semana", "Mes", "Trimestre", "Año"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-background border border-border/50 text-muted-foreground hover:bg-accent/10"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Selector con calendario desplegable y navegación para el período activo */}
        <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-xs">
          <button
            type="button"
            onClick={handlePrevPeriod}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            title="Período anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-2">
            <CalendarIcon size={14} className="text-primary" />
            <span className="text-xs font-semibold text-foreground whitespace-nowrap">
              {getPeriodLabel()}
            </span>

            {/* Calendario nativo desplegable para seleccionar cualquier fecha */}
            <input
              type="date"
              value={selectedDate}
              onChange={e => e.target.value && setSelectedDate(e.target.value)}
              className="bg-card border border-border/60 rounded px-1.5 py-0.5 text-[11px] text-foreground focus:outline-none focus:border-primary cursor-pointer hover:border-primary/50 transition-colors"
              title="Hacé clic para abrir el calendario y seleccionar fecha"
            />
          </div>

          <button
            type="button"
            onClick={handleNextPeriod}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            title="Período siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border/50 rounded-xl p-5 relative overflow-hidden shadow-xs">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2 relative z-10">Ingresos</span>
          <span className="text-3xl font-light text-foreground relative z-10">$ {ingresos.toLocaleString("es-AR")}</span>
          <span className="text-[11px] text-muted-foreground block mt-1">{ventas} turnos completados</span>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-5 shadow-xs">
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Egresos</span>
          <span className="text-3xl font-light text-rose-400">$ {egresos.toLocaleString("es-AR")}</span>
          <span className="text-[11px] text-muted-foreground block mt-1">{filteredExpenses.length} egresos</span>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-5 shadow-xs">
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Utilidad neta</span>
          <span className={`text-3xl font-light ${utilidad >= 0 ? "text-emerald-400" : "text-rose-400"}`}>$ {utilidad.toLocaleString("es-AR")}</span>
          <span className="text-[11px] text-muted-foreground block mt-1">Margen: {ingresos > 0 ? Math.round((utilidad / ingresos) * 100) : 0}%</span>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-5 shadow-xs">
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Ticket Promedio</span>
          <span className="text-3xl font-light text-foreground">$ {Math.round(ticketPromedio).toLocaleString("es-AR")}</span>
          <span className="text-[11px] text-muted-foreground block mt-1">Por turno cobrado</span>
        </div>
      </div>

      {/* Desglose Detallado por Efectivo, Transferencia y Cuentas Corrientes (Solicitado por la dueña) */}
      <div className="bg-card border border-border/60 rounded-xl p-5 mb-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/40">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Landmark size={16} className="text-primary" />
              Desglose de Dinero Recaudado por Medio de Pago
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Total detallado de plata ingresada por Efectivo, Transferencias/Billeteras y Cuentas Corrientes/Tarjetas
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Total Recaudado</span>
            <span className="text-base font-bold text-foreground font-mono">$ {ingresos.toLocaleString("es-AR")}</span>
          </div>
        </div>

        {/* Barra de progreso de distribución */}
        <div className="w-full h-3 rounded-full overflow-hidden bg-muted/40 flex mb-5 border border-border/40">
          {eftPercent > 0 && (
            <div
              style={{ width: `${eftPercent}%` }}
              className="bg-emerald-500 transition-all duration-500"
              title={`Efectivo: ${eftPercent}%`}
            />
          )}
          {transPercent > 0 && (
            <div
              style={{ width: `${transPercent}%` }}
              className="bg-blue-500 transition-all duration-500"
              title={`Transferencias: ${transPercent}%`}
            />
          )}
          {ctasPercent > 0 && (
            <div
              style={{ width: `${ctasPercent}%` }}
              className="bg-purple-500 transition-all duration-500"
              title={`Ctas Corrientes / Tarjetas: ${ctasPercent}%`}
            />
          )}
        </div>

        {/* Tarjetas de Medios Desglosados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Efectivo */}
          <div className="bg-background border border-emerald-500/25 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Banknote size={15} /> Efectivo (EFT)
              </span>
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {eftPercent}%
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-light text-foreground font-mono">
                $ {methodTotals.efectivo.toLocaleString("es-AR")}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Dinero en mano en caja física
              </p>
            </div>
          </div>

          {/* 2. Transferencia / Billeteras Virtuales */}
          <div className="bg-background border border-blue-500/25 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Wallet size={15} /> Transferencias / Billeteras
                </span>
                <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                  {transPercent}%
                </span>
              </div>
              <p className="text-2xl font-light text-foreground font-mono mt-3">
                $ {methodTotals.transferencia.toLocaleString("es-AR")}
              </p>
            </div>

            {/* Sub-desglose por banco / billetera */}
            {Object.keys(methodTotals.wallets).length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-border/40 space-y-1">
                <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">
                  Por cuenta / billetera:
                </span>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(methodTotals.wallets).map(([w, amt]) => (
                    <span
                      key={w}
                      className="inline-flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded"
                    >
                      <span>📱 {w}:</span>
                      <strong className="font-mono">${amt.toLocaleString("es-AR")}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Cuentas Corrientes y Tarjetas */}
          <div className="bg-background border border-purple-500/25 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                <CreditCard size={15} /> Ctas Corrientes / Tarjetas
              </span>
              <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                {ctasPercent}%
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-light text-foreground font-mono">
                $ {methodTotals.ctasCorrientes.toLocaleString("es-AR")}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Pagos en cuenta corriente y posnet
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico y Desglose por Servicio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border border-border/50 rounded-xl p-5">
          <span className="text-[10px] uppercase tracking-widest font-bold text-foreground mb-4 block">Tendencia diaria</span>
          <div className="h-[200px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(330 15% 18%)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(30 10% 55%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(30 10% 55%)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip cursor={{ fill: "hsl(330 15% 18%)", opacity: 0.4 }} contentStyle={{ backgroundColor: "hsl(330 15% 8%)", border: "1px solid hsl(330 15% 18%)", borderRadius: "8px", fontSize: "12px" }} itemStyle={{ color: "hsl(340 45% 68%)" }} />
                  <Bar dataKey="ingresos" name="Ingresos" fill="hsl(340 45% 68%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No hay datos en este período</div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-5">
          <span className="text-[10px] uppercase tracking-widest font-bold text-foreground mb-4 block">Por Servicio</span>
          {Object.keys(byService).length > 0 ? (
            <div className="space-y-3 overflow-y-auto max-h-[200px] pr-2">
              {Object.entries(byService)
                .sort(([, a], [, b]) => b - a)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-semibold text-foreground">$ {v.toLocaleString("es-AR")}</span>
                  </div>
              ))}
            </div>
          ) : <div className="text-xs text-muted-foreground text-center py-8">Sin datos</div>}
        </div>
      </div>

      {/* Por Profesional y Por Método de Pago */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border/50 rounded-xl p-5">
          <span className="text-[10px] uppercase tracking-widest font-bold text-foreground mb-4 block">Por Profesional</span>
          {Object.keys(byProfessional).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(byProfessional)
                .sort(([, a], [, b]) => b - a)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-semibold text-foreground">$ {v.toLocaleString("es-AR")}</span>
                  </div>
              ))}
            </div>
          ) : <div className="text-xs text-muted-foreground text-center py-8">Sin datos</div>}
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-5">
          <span className="text-[10px] uppercase tracking-widest font-bold text-foreground mb-4 block">Detalle de Medios Registrados</span>
          {Object.keys(byMethod).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(byMethod)
                .sort(([, a], [, b]) => b - a)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-semibold text-foreground">$ {v.toLocaleString("es-AR")}</span>
                  </div>
              ))}
            </div>
          ) : <div className="text-xs text-muted-foreground text-center py-8">Sin datos</div>}
        </div>
      </div>
    </AdminLayout>
  );
}
