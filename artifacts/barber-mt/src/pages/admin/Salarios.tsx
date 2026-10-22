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
  salesTarget?: number;
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
  shopSales?: number;
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

    // Shop Sales total for this professional
    const shopSales = completedApps.reduce((sum, app) => sum + (app.shopSales || 0), 0);
    const salesTarget = prof.salesTarget ?? 0;

    return {
      id: prof.id,
      name: prof.name,
      role: prof.role,
      color: prof.color,
      initial: prof.initial,
      commission: commissionRate,
      baseSalary,
      salesTarget,
      shopSales,
      commissionEarned,
      totalEarned,
      revenue,
      appointments: appointmentsCount,
      totalApps: allProfApps.length,
    };
  });

  const totalPayroll = staffPayroll.reduce((s, e) => s + e.totalEarned, 0);
  const totalRevenue = staffPayroll.reduce((s, e) => s + e.revenue, 0);
  const totalShopSales = staffPayroll.reduce((s, e) => s + e.shopSales, 0);
  const totalBaseSalary = staffPayroll.reduce((s, e) => s + e.baseSalary, 0);
  const totalCommissionEarned = staffPayroll.reduce((s, e) => s + e.commissionEarned, 0);
  const totalAppointments = staffPayroll.reduce((s, e) => s + e.appointments, 0);

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
      <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                <th className="py-3.5 px-5 text-left">Profesional</th>
                <th className="py-3.5 px-3 text-center">Turnos</th>
                <th className="py-3.5 px-3 text-center">% Comisión</th>
                <th className="py-3.5 px-4 text-right">Vtas Shop</th>
                <th className="py-3.5 px-4 text-right">Facturado</th>
                <th className="py-3.5 px-4 text-right">Sueldo Fijo</th>
                <th className="py-3.5 px-4 text-right">Comisión</th>
                <th className="py-3.5 px-5 text-right font-extrabold text-foreground">Total a Pagar</th>
              </tr>
            </thead>

            {loading ? (
              <tbody>
                <tr>
                  <td colSpan={8} className="py-16 text-center text-xs text-muted-foreground">
                    Cargando salarios del período...
                  </td>
                </tr>
              </tbody>
            ) : staffPayroll.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={8} className="py-16 text-center text-xs text-muted-foreground">
                    No hay profesionales registradas.
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-border/20 text-xs">
                {staffPayroll.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-accent/5 transition-colors"
                  >
                    {/* Profesional */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm"
                          style={{
                            backgroundColor: emp.color + "22",
                            border: `1.5px solid ${emp.color}55`,
                            color: emp.color,
                          }}
                        >
                          {emp.initial}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{emp.name}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{emp.role || "Profesional"}</p>
                        </div>
                      </div>
                    </td>

                    {/* Turnos */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/40 text-foreground border border-border/40">
                        <Calendar size={11} className="text-muted-foreground" />
                        {emp.appointments}
                      </span>
                    </td>

                    {/* % Comisión */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold text-muted-foreground bg-accent/20">
                        {emp.commission}%
                      </span>
                    </td>

                    {/* Vtas Shop */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-medium text-foreground">
                          ${emp.shopSales.toLocaleString("es-AR")}
                        </span>
                        {emp.salesTarget > 0 && (
                          <span
                            className={`text-[9px] font-semibold mt-0.5 px-1.5 py-0.5 rounded ${
                              emp.shopSales >= emp.salesTarget
                                ? "text-emerald-500 bg-emerald-500/10"
                                : "text-amber-500 bg-amber-500/10"
                            }`}
                          >
                            Obj: ${emp.salesTarget.toLocaleString("es-AR")}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Facturado */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-medium text-foreground">
                        {emp.revenue > 0 ? `$${emp.revenue.toLocaleString("es-AR")}` : "—"}
                      </span>
                    </td>

                    {/* Sueldo Fijo */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-muted-foreground">
                        {emp.baseSalary > 0 ? `$${emp.baseSalary.toLocaleString("es-AR")}` : "—"}
                      </span>
                    </td>

                    {/* Comisión */}
                    <td className="py-3.5 px-4 text-right">
                      <span className={emp.commissionEarned > 0 ? "font-semibold text-emerald-500" : "text-muted-foreground"}>
                        {emp.commissionEarned > 0 ? `$${emp.commissionEarned.toLocaleString("es-AR")}` : "—"}
                      </span>
                    </td>

                    {/* Total a Pagar */}
                    <td className="py-3.5 px-5 text-right">
                      <span
                        className={`inline-block font-bold text-sm ${
                          emp.totalEarned > 0 ? "text-emerald-500" : "text-muted-foreground"
                        }`}
                      >
                        ${emp.totalEarned.toLocaleString("es-AR")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}

            {/* Total row */}
            {!loading && staffPayroll.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-primary/20 bg-primary/5 text-xs font-bold text-foreground">
                  <td className="py-3.5 px-5">
                    <span className="font-bold text-foreground uppercase tracking-wider text-[11px]">Total General</span>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className="font-semibold text-muted-foreground">{totalAppointments} turnos</span>
                  </td>
                  <td className="py-3.5 px-3 text-center text-muted-foreground">—</td>
                  <td className="py-3.5 px-4 text-right text-muted-foreground">
                    ${totalShopSales.toLocaleString("es-AR")}
                  </td>
                  <td className="py-3.5 px-4 text-right text-foreground font-semibold">
                    ${totalRevenue.toLocaleString("es-AR")}
                  </td>
                  <td className="py-3.5 px-4 text-right text-muted-foreground">
                    {totalBaseSalary > 0 ? `$${totalBaseSalary.toLocaleString("es-AR")}` : "—"}
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-500 font-semibold">
                    {totalCommissionEarned > 0 ? `$${totalCommissionEarned.toLocaleString("es-AR")}` : "—"}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <span className="text-base font-black text-emerald-500">
                      ${totalPayroll.toLocaleString("es-AR")}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
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
