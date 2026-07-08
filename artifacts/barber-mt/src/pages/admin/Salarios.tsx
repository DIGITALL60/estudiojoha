import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Percent, Download } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { fetchAPI } from "@/lib/api";

interface Professional {
  id: string;
  name: string;
  role: string;
  color: string;
  initial: string;
  commissionRate: number;
  baseSalary?: number;
}

interface AppointmentRow {
  id: string;
  date: string;
  time: string;
  price: number;
  status: string;
  clientId: string;
  professionalId: string;
  serviceId: string;
  clientName?: string;
  serviceName?: string;
  professionalName?: string;
  paymentMethod?: string;
}

// ─── Excel/CSV export helper ──────────────────────────────
function exportToCSV(appointments: AppointmentRow[], professionals: Professional[], periodLabel: string) {
  const headers = [
    "Fecha", "Hora", "Profesional", "Cliente", "Servicio",
    "Precio", "Estado", "Método de Pago", "Comisión (%)", "Comisión ($)", "Sueldo Fijo ($)"
  ];

  const rows = appointments.map(a => {
    const prof = professionals.find(p => p.id === a.professionalId);
    const commissionRate = prof?.commissionRate ?? 0;
    const commissionAmount = a.status === "completado"
      ? Math.round((a.price * commissionRate) / 100)
      : 0;
    return [
      a.date,
      a.time,
      a.professionalName || "",
      a.clientName || "",
      a.serviceName || "",
      a.price,
      a.status,
      a.paymentMethod || "—",
      commissionRate + "%",
      commissionAmount,
      prof?.baseSalary ?? 0,
    ];
  });

  const csvContent = [
    [`Informe de Turnos — ${periodLabel}`],
    [],
    headers,
    ...rows,
    [],
    ["Total completados:", appointments.filter(a => a.status === "completado").reduce((s, a) => s + a.price, 0)],
    ["Total cancelados:", appointments.filter(a => a.status === "cancelado").length],
  ]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `turnos_${periodLabel.replace(/\s/g, "_")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Salarios() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profsRes, appsRes] = await Promise.all([
        fetchAPI("/api/data/professionals").then((r) => r.json()),
        fetchAPI("/api/data/appointments").then((r) => r.json()),
      ]);
      setProfessionals(profsRes);
      setAppointments(appsRes);
    } catch (err) {
      console.error("Error loading payroll data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const now = new Date();

  const [filterType, setFilterType] = useState<"month" | "date" | "all">("month");
  const [filterMonth, setFilterMonth] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [filterDate, setFilterDate] = useState<string>(now.toISOString().split("T")[0]);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  let periodLabel = "Histórico";
  let displayPeriod = "Todo el tiempo";
  let shortPeriodLabel = "Todos";

  if (filterType === "month" && filterMonth) {
    const [y, m] = filterMonth.split("-");
    const monthIndex = parseInt(m, 10) - 1;
    periodLabel = `${monthNames[monthIndex]} ${y}`;
    displayPeriod = "Mes seleccionado";
    shortPeriodLabel = `${monthNames[monthIndex].substring(0, 3)} ${y.substring(2)}`;
  } else if (filterType === "date" && filterDate) {
    periodLabel = new Date(filterDate + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
    displayPeriod = "Fecha específica";
    shortPeriodLabel = new Date(filterDate + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
  }

  const matchesFilter = (dateStr: string) => {
    if (filterType === "all") return true;
    if (filterType === "month") return dateStr.startsWith(filterMonth);
    if (filterType === "date") return dateStr === filterDate;
    return true;
  };

  // Filter appointments for the period (both completed and cancelled for export)
  const periodAppointments = appointments.filter(a => matchesFilter(a.date));

  const staffPayroll = professionals.map((prof) => {
    // Only count COMPLETED appointments for commission
    const completedApps = periodAppointments.filter(
      a => a.professionalId === prof.id && a.status === "completado"
    );
    const allProfApps = periodAppointments.filter(a => a.professionalId === prof.id);

    const appointmentsCount = completedApps.length;
    const commissionRate = prof.commissionRate ?? 0;

    // Exact math: price × rate / 100 for each completed appointment, then summed
    const commissionEarned = completedApps.reduce(
      (sum, app) => sum + Math.round((app.price * commissionRate) / 100),
      0
    );

    const baseSalary = prof.baseSalary ?? 0;
    const totalEarned = commissionEarned + baseSalary;

    // Revenue generated by this professional (sum of completed)
    const revenue = completedApps.reduce((sum, app) => sum + app.price, 0);

    return {
      id: prof.id,
      name: prof.name,
      role: prof.role,
      color: prof.color,
      initial: prof.initial,
      commission: commissionRate,
      baseSalary,
      commissionEarned,
      totalEarned,
      revenue,
      appointments: appointmentsCount,
      totalApps: allProfApps.length,
    };
  });

  const totalPayroll = staffPayroll.reduce((s, e) => s + e.totalEarned, 0);
  const totalRevenue = staffPayroll.reduce((s, e) => s + e.revenue, 0);

  return (
    <AdminLayout
      title="Salarios"
      subtitle="Liquidación del período actual"
      actions={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border rounded-sm px-2 py-1">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-transparent text-xs text-foreground focus:outline-none border-none py-1"
            >
              <option value="month">Por Mes</option>
              <option value="date">Por Fecha</option>
              <option value="all">Todo</option>
            </select>

            {filterType === "month" && (
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-transparent text-xs text-muted-foreground focus:outline-none py-1 w-28"
              />
            )}

            {filterType === "date" && (
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-transparent text-xs text-muted-foreground focus:outline-none py-1 w-28"
              />
            )}

            {filterType !== "all" && (
              <button
                onClick={() => setFilterType("all")}
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors ml-1 px-1"
              >
                Limpiar
              </button>
            )}
          </div>

          <button
            onClick={() => exportToCSV(periodAppointments, professionals, periodLabel)}
            className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 text-xs font-semibold px-4 py-2 rounded-sm hover:bg-emerald-600/30 transition-colors"
          >
            <Download size={13} />
            Exportar Excel
          </button>

          <button
            onClick={loadData}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-sm hover:bg-primary/90 transition-colors"
          >
            Recargar datos
          </button>
        </div>
      }
    >
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-sm p-4"
        >
          <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground mb-2">
            Total a pagar
          </p>
          <p className="text-2xl font-light text-primary">
            {loading ? <span className="text-muted-foreground/30">—</span> : `$${totalPayroll.toLocaleString("es-AR")}`}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">{periodLabel}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          className="bg-card border border-border rounded-sm p-4"
        >
          <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground mb-2">
            Profesionales activas
          </p>
          <p className="text-2xl font-light text-foreground">
            {loading ? <span className="text-muted-foreground/30">—</span> : staffPayroll.length}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">en nómina</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="bg-card border border-border rounded-sm p-4"
        >
          <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground mb-2">
            Período
          </p>
          <p className="text-2xl font-light text-foreground">{shortPeriodLabel}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{displayPeriod}</p>
        </motion.div>
      </div>

      {/* Payroll table */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {/* Table header */}
        <div className="px-4 py-3 border-b border-border/40 bg-muted/20 grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-4 items-center">
          <div />
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Profesional</span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right">Turnos</span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right hidden sm:block">%</span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right hidden md:block">Facturado</span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right hidden md:block">Sueldo Fijo</span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right hidden md:block">Comisión</span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground text-right">Total</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Cargando sueldos...
          </div>
        ) : staffPayroll.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No hay profesionales registradas.
          </div>
        ) : (
          staffPayroll.map((emp, i) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-4 items-center px-4 py-3.5 border-b border-border/20 last:border-0 hover:bg-accent/5 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  backgroundColor: emp.color + "22",
                  border: `1px solid ${emp.color}44`,
                  color: emp.color,
                }}
              >
                {emp.initial}
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">{emp.name}</p>
                <p className="text-[10px] text-muted-foreground">{emp.role}</p>
              </div>
              <div className="flex items-center gap-1 justify-end">
                <Calendar size={10} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{emp.appointments}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 justify-end">
                <Percent size={10} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{emp.commission}%</span>
              </div>
              <div className="hidden md:flex justify-end">
                <span className="text-xs text-muted-foreground">
                  {emp.revenue > 0 ? `$${emp.revenue.toLocaleString("es-AR")}` : "—"}
                </span>
              </div>
              <div className="hidden md:flex justify-end">
                <span className="text-xs text-muted-foreground">
                  {emp.baseSalary > 0 ? `$${emp.baseSalary.toLocaleString("es-AR")}` : "—"}
                </span>
              </div>
              <div className="hidden md:flex justify-end">
                <span className="text-xs text-emerald-400">
                  {emp.commissionEarned > 0 ? `$${emp.commissionEarned.toLocaleString("es-AR")}` : "—"}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-primary">
                  ${emp.totalEarned.toLocaleString("es-AR")}
                </span>
              </div>
            </motion.div>
          ))
        )}

        {/* Total row */}
        {!loading && staffPayroll.length > 0 && (
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto] gap-4 items-center px-4 py-3 bg-primary/5 border-t border-primary/20">
            <div />
            <span className="text-xs font-bold text-foreground">Total</span>
            <div />
            <div className="hidden sm:block" />
            <div className="hidden md:block">
              <span className="text-xs text-muted-foreground">${totalRevenue.toLocaleString("es-AR")}</span>
            </div>
            <div className="hidden md:block" />
            <div className="hidden md:block" />
            <span className="text-sm font-bold text-primary">
              ${totalPayroll.toLocaleString("es-AR")}
            </span>
          </div>
        )}
      </div>

      {/* Export info */}
      {!loading && periodAppointments.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground bg-card border border-border/30 rounded-sm px-4 py-3">
          <span>
            {periodLabel}: <strong className="text-foreground">{periodAppointments.filter(a => a.status === "completado").length} completados</strong> · <strong className="text-foreground">{periodAppointments.filter(a => a.status === "cancelado").length} cancelados</strong>
          </span>
          <button
            onClick={() => exportToCSV(periodAppointments, professionals, periodLabel)}
            className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors font-semibold"
          >
            <Download size={12} />
            Descargar Excel (.csv) con todos los turnos
          </button>
        </div>
      )}
    </AdminLayout>
  );
}
