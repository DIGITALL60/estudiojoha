import { fetchAPI } from "@/lib/api";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Users, Briefcase, Calendar, ArrowUpRight } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface AppointmentRow {
  id: string; date: string; time: string; price: number; status: string;
  clientName: string; professionalName: string; serviceName: string; paymentMethod: string;
}

export default function Rentabilidad() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [filter, setFilter] = useState<"Semana" | "Mes" | "Trimestre" | "Año">("Mes");

  useEffect(() => {
    fetchAPI("/api/data/appointments")
      .then(r => r.json())
      .then(data => setAppointments(data.filter((a: any) => a.status === "completado")))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getFilteredApps = () => {
    const now = new Date();
    return appointments.filter(a => {
      const d = new Date(a.date + "T00:00:00");
      if (filter === "Año") return d.getFullYear() === now.getFullYear();
      if (filter === "Mes") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (filter === "Semana") {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay()); // Sunday
        const end = new Date(start);
        end.setDate(start.getDate() + 6); // Saturday
        return d >= start && d <= end;
      }
      if (filter === "Trimestre") {
        const quarter = Math.floor(now.getMonth() / 3);
        const appQuarter = Math.floor(d.getMonth() / 3);
        return d.getFullYear() === now.getFullYear() && appQuarter === quarter;
      }
      return true;
    });
  };

  const filteredApps = getFilteredApps();

  const ingresos = filteredApps.reduce((sum, a) => sum + a.price, 0);
  const ventas = filteredApps.length;
  const ticketPromedio = ventas > 0 ? ingresos / ventas : 0;

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

  return (
    <AdminLayout title="Rentabilidad" subtitle="Análisis financiero detallado">
      <div className="flex items-center gap-2 mb-6">
        {["Semana", "Mes", "Trimestre", "Año"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-card border border-border/50 text-muted-foreground hover:bg-accent/10"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border border-border/50 rounded-xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2 relative z-10">Ingresos</span>
          <span className="text-3xl font-light text-foreground relative z-10">$ {ingresos.toLocaleString("es-AR")}</span>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-5">
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Ventas</span>
          <span className="text-3xl font-light text-foreground">{ventas}</span>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-5">
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-2">Ticket Promedio</span>
          <span className="text-3xl font-light text-foreground">$ {Math.round(ticketPromedio).toLocaleString("es-AR")}</span>
        </div>
      </div>

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
          <span className="text-[10px] uppercase tracking-widest font-bold text-foreground mb-4 block">Por Método de Pago</span>
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
