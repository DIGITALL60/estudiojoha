import { fetchAPI } from "@/lib/api";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { History, Search, Calendar, User, DollarSign, Clock, Filter } from "lucide-react";
import AdminLayout from "./AdminLayout";

interface AppointmentRow {
  id: string; date: string; time: string; price: number; status: string; duration: number;
  clientName: string; professionalName: string; serviceName: string;
}

const statusColors: Record<string, string> = {
  completado: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  cancelado: "text-red-400 bg-red-400/10 border-red-400/30",
  ausente: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  agendado: "text-primary bg-primary/10 border-primary/30",
};

export default function HistoriaTurnos() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAPI("/api/data/appointments")
      .then(r => r.json())
      .then(data => {
        // Sort descending by date and time
        const sorted = data.sort((a: AppointmentRow, b: AppointmentRow) => {
          const cmpDate = b.date.localeCompare(a.date);
          if (cmpDate !== 0) return cmpDate;
          return b.time.localeCompare(a.time);
        });
        setAppointments(sorted);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = appointments.filter(a =>
    (a.clientName || "").toLowerCase().includes(search.toLowerCase()) ||
    (a.serviceName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout
      title="Historia de turnos"
      subtitle={`${appointments.length} turnos en el historial`}
    >
      <div className="relative mb-4">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente o servicio..."
          className="w-full bg-card border border-border rounded-sm pl-9 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 bg-muted/20 grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 hidden sm:grid">
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Cliente / Servicio</span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground hidden md:block">Profesional</span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Fecha</span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right">Monto</span>
          <span className="text-[10px] font-bold tracking-widests uppercase text-muted-foreground">Estado</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Cargando turnos...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <History size={28} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No se encontraron turnos</p>
          </div>
        ) : (
          filtered.map((appt, i) => (
            <motion.div
              key={appt.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
              className="flex sm:grid sm:grid-cols-[1fr_1fr_auto_auto_auto] flex-col gap-2 sm:gap-4 items-start sm:items-center px-4 py-4 border-b border-border/20 last:border-0 hover:bg-accent/5 transition-colors"
            >
              <div className="min-w-0 w-full">
                <p className="text-xs font-medium text-foreground truncate">{appt.clientName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock size={10} className="text-muted-foreground flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground truncate">{appt.serviceName} · {appt.duration} min</span>
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground hidden md:block truncate w-full">{appt.professionalName}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Calendar size={10} className="text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{new Date(appt.date + "T00:00:00").toLocaleDateString("es-AR")}</span>
              </div>
              <span className="text-xs font-semibold text-foreground text-right flex-shrink-0">${(appt.price ?? 0).toLocaleString("es-AR")}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColors[appt.status] ?? statusColors.agendado}`}>
                {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
