import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, DollarSign, TrendingUp, TrendingDown,
  Printer, Download, Plus, CheckCircle, ShieldCheck,
  CreditCard, Wallet, Landmark, AlertCircle, FileText, ChevronLeft, ChevronRight, X
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { fetchAPI } from "@/lib/api";

interface Expense {
  id: string;
  concept: string;
  amount: number;
  category: string;
  date: string;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  price: number;
  status: string;
  paymentMethod?: string;
  professionalName?: string;
  clientName?: string;
  serviceName?: string;
}

interface Professional {
  id: string;
  name: string;
  role: string;
  color: string;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function CierreMensual() {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0-indexed

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [closureNotes, setClosureNotes] = useState("");
  const [isMonthClosed, setIsMonthClosed] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);

  // New expense form
  const [newConcept, setNewConcept] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState("Insumos");
  const [newDate, setNewDate] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);

  const monthStr = String(selectedMonth + 1).padStart(2, "0");
  const periodPrefix = `${selectedYear}-${monthStr}`;

  const loadMonthData = async () => {
    setLoading(true);
    try {
      const [appsRes, expRes, profsRes, settingsRes] = await Promise.all([
        fetchAPI("/api/data/appointments"),
        fetchAPI("/api/data/expenses"),
        fetchAPI("/api/data/professionals"),
        fetchAPI("/api/data/settings"),
      ]);

      const allApps: Appointment[] = await appsRes.json().catch(() => []);
      const allExps: Expense[] = await expRes.json().catch(() => []);
      const allProfs: Professional[] = await profsRes.json().catch(() => []);
      const settings = await settingsRes.json().catch(() => ({}));

      // Filter for selected year and month
      const monthApps = allApps.filter((a) => a.date && a.date.startsWith(periodPrefix));
      const monthExps = allExps.filter((e) => e.date && e.date.startsWith(periodPrefix));

      setAppointments(monthApps);
      setExpenses(monthExps);
      setProfessionals(allProfs.filter(p => p.role?.toLowerCase() !== "admin"));

      // Check saved closure state
      const closureKey = `cierre_${periodPrefix}`;
      setIsMonthClosed(settings[closureKey] === "closed");
      setClosureNotes(settings[`${closureKey}_notes`] || "");
    } catch (err) {
      console.error("Error cargando cierre mensual:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthData();
  }, [selectedYear, selectedMonth]);

  // Calculations
  const completedApps = appointments.filter((a) => a.status === "completado");
  const pendingApps = appointments.filter((a) => a.status === "agendado" || a.status === "confirmado");
  const totalIncome = completedApps.reduce((sum, a) => sum + (a.price || 0), 0);
  const expectedPendingIncome = pendingApps.reduce((sum, a) => sum + (a.price || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const margin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  // Payment methods breakdown
  const paymentBreakdown = completedApps.reduce((acc: Record<string, number>, a) => {
    const method = a.paymentMethod || "Efectivo";
    acc[method] = (acc[method] || 0) + (a.price || 0);
    return acc;
  }, {});

  // Expense categories breakdown
  const expenseCategoryBreakdown = expenses.reduce((acc: Record<string, { total: number; count: number }>, e) => {
    const cat = e.category || "General";
    if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
    acc[cat].total += e.amount;
    acc[cat].count += 1;
    return acc;
  }, {});

  // Performance by professional
  const profPerformance = professionals.map((p) => {
    const profApps = completedApps.filter((a) => a.professionalName === p.name);
    const profPendingApps = pendingApps.filter((a) => a.professionalName === p.name);
    const total = profApps.reduce((sum, a) => sum + (a.price || 0), 0);
    const pendingTotal = profPendingApps.reduce((sum, a) => sum + (a.price || 0), 0);
    return {
      id: p.id,
      name: p.name,
      role: p.role,
      color: p.color,
      count: profApps.length,
      pendingCount: profPendingApps.length,
      pendingTotal,
      total,
      share: totalIncome > 0 ? Math.round((total / totalIncome) * 100) : 0,
    };
  });

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleSaveClosureStatus = async (status: boolean) => {
    try {
      const closureKey = `cierre_${periodPrefix}`;
      await fetchAPI("/api/data/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            [closureKey]: status ? "closed" : "open",
            [`${closureKey}_notes`]: closureNotes,
          },
        }),
      });
      setIsMonthClosed(status);
    } catch (err) {
      console.error("Error al guardar estado de cierre:", err);
    }
  };

  const handleAddExpense = async () => {
    if (!newConcept.trim() || !newAmount || Number(newAmount) <= 0) return;
    setSavingExpense(true);
    try {
      const dateToSave = newDate || `${periodPrefix}-15`;
      const res = await fetchAPI("/api/data/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: newConcept.trim(),
          amount: Number(newAmount),
          category: newCategory,
          date: dateToSave,
        }),
      });
      if (res.ok) {
        setShowAddExpenseModal(false);
        setNewConcept("");
        setNewAmount("");
        loadMonthData();
      }
    } catch (err) {
      console.error("Error agregando gasto:", err);
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("¿Deseás eliminar este registro de gasto?")) return;
    try {
      await fetchAPI(`/api/data/expenses/${id}`, { method: "DELETE" });
      loadMonthData();
    } catch (err) {
      console.error(err);
    }
  };

  const exportCSV = () => {
    const headers = ["Tipo", "Fecha", "Concepto / Servicio", "Categoría", "Monto"];
    const rows: string[][] = [];

    // Add Income
    completedApps.forEach((a) => {
      rows.push(["Ingreso", a.date, `${a.clientName || "Cliente"} - ${a.serviceName || "Turno"}`, a.paymentMethod || "Cobro", `$${a.price}`]);
    });

    // Add Expenses
    expenses.forEach((e) => {
      rows.push(["Egreso", e.date, e.concept, e.category, `-$${e.amount}`]);
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Cierre_Mensual_${MONTH_NAMES[selectedMonth]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AdminLayout
      title="Cierre Mensual"
      subtitle="Auditoría de ingresos, gastos y rentabilidad neta del mes"
    >
      {/* Header Selector & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 bg-card border border-border/50 rounded-sm p-4 print:hidden">
        {/* Month Picker */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-sm border border-border/50 hover:bg-muted transition-colors text-foreground"
            title="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            <span className="font-serif text-2xl font-light text-foreground min-w-[180px] text-center">
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </span>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-sm border border-border/50 hover:bg-muted transition-colors text-foreground"
            title="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Audit Status & Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold ${
              isMonthClosed
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
            }`}
          >
            {isMonthClosed ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {isMonthClosed ? "MES AUDITADO Y CERRADO" : "MES EN CURSO"}
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 bg-card border border-border text-foreground text-xs px-3 py-2 rounded-sm hover:bg-muted transition-colors"
          >
            <Download size={13} /> Exportar CSV
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-card border border-border text-foreground text-xs px-3 py-2 rounded-sm hover:bg-muted transition-colors"
          >
            <Printer size={13} /> Imprimir Cierre
          </button>

          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-sm hover:bg-primary/90 transition-all"
          >
            <Plus size={13} /> + Registrar Gasto
          </button>
        </div>
      </div>

      {/* Main KPI Dashboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Income */}
        <div className="bg-card border border-border/50 rounded-sm p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">INGRESOS BRUTOS</span>
            <div className="w-8 h-8 rounded-sm bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-light text-foreground">
              ${totalIncome.toLocaleString("es-AR")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {completedApps.length} turnos completados
            </p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-card border border-border/50 rounded-sm p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">GASTOS Y EGRESOS</span>
            <div className="w-8 h-8 rounded-sm bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-light text-rose-400">
              -${totalExpenses.toLocaleString("es-AR")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {expenses.length} egresos registrados
            </p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-card border border-border/50 rounded-sm p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">GANANCIA NETA</span>
            <div className="w-8 h-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-2xl font-light ${netProfit >= 0 ? "text-primary" : "text-rose-400"}`}>
              ${netProfit.toLocaleString("es-AR")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Resultado final del período
            </p>
          </div>
        </div>

        {/* Profit Margin */}
        <div className="bg-card border border-border/50 rounded-sm p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">MARGEN DE RENTABILIDAD</span>
            <div className="w-8 h-8 rounded-sm bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-light text-foreground">
              {margin}%
            </p>
            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, margin))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Breakdowns & Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Gastos por Categoría */}
        <div className="bg-card border border-border/50 rounded-sm p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText size={15} className="text-primary" /> Gastos por Rubro / Categoría
          </h3>

          {Object.keys(expenseCategoryBreakdown).length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No hay gastos registrados en este mes.</p>
          ) : (
            <div className="space-y-3 flex-1">
              {Object.entries(expenseCategoryBreakdown).map(([cat, data]) => {
                const percentage = totalExpenses > 0 ? Math.round((data.total / totalExpenses) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground font-medium">{cat}</span>
                      <span className="text-muted-foreground font-mono">
                        ${data.total.toLocaleString("es-AR")} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-400 h-full rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Métodos de Pago */}
        <div className="bg-card border border-border/50 rounded-sm p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Wallet size={15} className="text-primary" /> Distribución por Medio de Pago
          </h3>

          <div className="space-y-3 flex-1">
            {[
              { label: "Efectivo", icon: Wallet, color: "text-emerald-400", val: paymentBreakdown["Efectivo"] || 0 },
              { label: "Transferencia", icon: Landmark, color: "text-blue-400", val: paymentBreakdown["Transferencia"] || 0 },
              { label: "Mercado Pago", icon: CreditCard, color: "text-cyan-400", val: paymentBreakdown["Mercado Pago"] || 0 },
              { label: "Tarjeta", icon: CreditCard, color: "text-violet-400", val: paymentBreakdown["Tarjeta"] || 0 },
            ].map((method) => {
              const Icon = method.icon;
              const pct = totalIncome > 0 ? Math.round((method.val / totalIncome) * 100) : 0;
              return (
                <div key={method.label} className="p-3 bg-muted/20 border border-border/30 rounded-sm flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Icon size={14} className={method.color} />
                    <span className="text-xs text-foreground font-medium">{method.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-foreground">${method.val.toLocaleString("es-AR")}</p>
                    <p className="text-[10px] text-muted-foreground">{pct}% del total</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rendimiento por Profesional */}
        <div className="bg-card border border-border/50 rounded-sm p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Landmark size={15} className="text-primary" /> Recaudación por Profesional
          </h3>

          <div className="space-y-3 flex-1">
            {profPerformance.map((prof) => (
              <div key={prof.id} className="p-3 bg-muted/20 border border-border/30 rounded-sm flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: prof.color || "#7c3aed" }}
                  />
                  <div>
                    <p className="text-xs font-medium text-foreground">{prof.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {prof.count} completado{prof.count !== 1 ? "s" : ""} {prof.pendingCount > 0 ? `(${prof.pendingCount} pendiente${prof.pendingCount !== 1 ? "s" : ""})` : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-foreground">${prof.total.toLocaleString("es-AR")}</p>
                  <p className="text-[10px] text-primary font-medium">{prof.share}% recaudación cobrada</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Expense Table for this month */}
      <div className="bg-card border border-border/50 rounded-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            Detalle de Gastos de {MONTH_NAMES[selectedMonth]} {selectedYear}
          </h3>
          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Plus size={12} /> Agregar gasto
          </button>
        </div>

        {expenses.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">
            No se registraron gastos u operativas en este mes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="pb-2 font-medium">Fecha</th>
                  <th className="pb-2 font-medium">Concepto</th>
                  <th className="pb-2 font-medium">Categoría</th>
                  <th className="pb-2 font-medium text-right">Monto</th>
                  <th className="pb-2 font-medium text-right print:hidden">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/10">
                    <td className="py-2.5 font-mono text-muted-foreground">{e.date}</td>
                    <td className="py-2.5 font-medium text-foreground">{e.concept}</td>
                    <td className="py-2.5 text-muted-foreground">{e.category}</td>
                    <td className="py-2.5 text-right font-semibold text-rose-400">
                      -${e.amount.toLocaleString("es-AR")}
                    </td>
                    <td className="py-2.5 text-right print:hidden">
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        className="text-muted-foreground hover:text-rose-400 transition-colors p-1"
                        title="Eliminar registro"
                      >
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Confirmation & Notes Box */}
      <div className="bg-card border border-border/50 rounded-sm p-5 mb-8">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" /> Observaciones y Auditoría del Cierre
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Espacio oficial para anotar detalles del cierre (transferencias bancarias, arqueo de caja física o notas del contador).
        </p>

        <textarea
          rows={3}
          value={closureNotes}
          onChange={(e) => setClosureNotes(e.target.value)}
          placeholder="Escribí aquí observaciones del cierre (ej: Se transfirieron $150.000 a la cuenta del banco, se pagó alquiler de $180.000...)"
          className="w-full bg-background border border-border/60 rounded-sm p-3 text-xs text-foreground focus:outline-none focus:border-primary mb-4"
        />

        <div className="flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={() => handleSaveClosureStatus(!isMonthClosed)}
            className={`px-4 py-2 rounded-sm text-xs font-semibold transition-all flex items-center gap-2 ${
              isMonthClosed
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30"
                : "bg-emerald-500 text-white hover:bg-emerald-600"
            }`}
          >
            {isMonthClosed ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
            {isMonthClosed ? "Reabrir Cierre del Mes" : "🔒 Finalizar y Cerrar Mes Oficialmente"}
          </button>
        </div>
      </div>

      {/* Modal Agregar Gasto */}
      <AnimatePresence>
        {showAddExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-sm max-w-md w-full p-6 text-foreground"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Registrar Nuevo Gasto / Egreso</h3>
                <button onClick={() => setShowAddExpenseModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Concepto o Descripción</label>
                  <input
                    type="text"
                    value={newConcept}
                    onChange={(e) => setNewConcept(e.target.value)}
                    placeholder="Ej: Insumos de uñas, Alquiler, Luz..."
                    className="w-full bg-background border border-border/60 rounded-sm p-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Monto ($)</label>
                    <input
                      type="number"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="Ej: 15000"
                      className="w-full bg-background border border-border/60 rounded-sm p-2 text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Categoría</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-background border border-border/60 rounded-sm p-2 text-xs focus:outline-none focus:border-primary"
                    >
                      <option value="Insumos">Insumos</option>
                      <option value="Alquiler">Alquiler / Servicios</option>
                      <option value="Sueldos">Sueldos / Comisiones</option>
                      <option value="Marketing">Marketing / Publicidad</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                      <option value="Varios">Varios</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Fecha</label>
                  <input
                    type="date"
                    value={newDate || `${periodPrefix}-01`}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-background border border-border/60 rounded-sm p-2 text-xs focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleAddExpense}
                    disabled={savingExpense}
                    className="flex-1 bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {savingExpense ? "Guardando..." : "Guardar Gasto"}
                  </button>
                  <button
                    onClick={() => setShowAddExpenseModal(false)}
                    className="bg-muted text-muted-foreground text-xs px-4 py-2 rounded-sm hover:bg-muted/80"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
