import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, DollarSign, TrendingUp, TrendingDown,
  Printer, Download, Plus, CheckCircle, ShieldCheck,
  CreditCard, Wallet, Landmark, AlertCircle, FileText, ChevronLeft, ChevronRight, X, Search, User
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { fetchAPI } from "@/lib/api";
import ClientHistoryModal from "./ClientHistoryModal";

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
  shopSales?: number;
  notes?: string;
  clientId?: string;
  clientPhone?: string;
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
  const [showAuditPaymentsModal, setShowAuditPaymentsModal] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditFilterMethod, setAuditFilterMethod] = useState<string>("todos");
  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null);

  // Estados para ver el historial de clientas por profesional
  const [selectedProfForClients, setSelectedProfForClients] = useState<Professional | null>(null);
  const [profClientsSearch, setProfClientsSearch] = useState("");
  const [profPaymentFilter, setProfPaymentFilter] = useState("todos");
  const [clientForHistoryModal, setClientForHistoryModal] = useState<any | null>(null);
  const [clientHistoryApps, setClientHistoryApps] = useState<any[]>([]);

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
  const totalIncome = completedApps.reduce((sum, a) => sum + (a.price || 0) + (a.shopSales || 0), 0);
  const expectedPendingIncome = pendingApps.reduce((sum, a) => sum + (a.price || 0) + (a.shopSales || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const margin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

  // Payment methods breakdown (agrupación inteligente de transferencias, bancos y demás medios)
  const paymentBreakdown = completedApps.reduce((acc: Record<string, number>, a) => {
    const raw = (a.paymentMethod || "Efectivo").trim();
    const amount = (a.price || 0) + (a.shopSales || 0);

    let method = "Efectivo";
    if (raw.toLowerCase().includes("transferencia")) {
      method = "Transferencia";
    } else if (raw.toLowerCase().includes("mercado")) {
      method = "Mercado Pago";
    } else if (raw.toLowerCase().includes("tarjeta")) {
      method = "Tarjeta";
    } else if (raw.toLowerCase().includes("corriente")) {
      method = "Cuenta Corriente";
    } else if (raw.toLowerCase().includes("efectivo")) {
      method = "Efectivo";
    } else {
      method = raw;
    }

    acc[method] = (acc[method] || 0) + amount;
    return acc;
  }, {});

  // Desglose de cuentas bancarias específicas dentro de Transferencia
  const bankBreakdown = completedApps.reduce((acc: Record<string, number>, a) => {
    const raw = (a.paymentMethod || "").trim();
    if (raw.toLowerCase().includes("transferencia")) {
      const amount = (a.price || 0) + (a.shopSales || 0);
      let bank = "General / No especificada";
      if (raw.toLowerCase().includes("córdoba") || raw.toLowerCase().includes("cordoba")) {
        bank = "Banco de Córdoba";
      } else if (raw.toLowerCase().includes("naranja")) {
        bank = "Naranja X";
      } else if (raw.toLowerCase().includes("ualá") || raw.toLowerCase().includes("uala")) {
        bank = "Ualá";
      } else if (raw.toLowerCase().includes("personal")) {
        bank = "Personal Pay";
      }
      acc[bank] = (acc[bank] || 0) + amount;
    }
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

  // Performance by professional (incluye precio de servicio y ventas shop)
  const profPerformance = professionals.map((p) => {
    const profApps = completedApps.filter((a) => a.professionalName === p.name);
    const profPendingApps = pendingApps.filter((a) => a.professionalName === p.name);
    const total = profApps.reduce((sum, a) => sum + (a.price || 0) + (a.shopSales || 0), 0);
    const pendingTotal = profPendingApps.reduce((sum, a) => sum + (a.price || 0) + (a.shopSales || 0), 0);
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

  const handleUpdateAppPayment = async (appId: string, newMethod: string) => {
    setUpdatingPaymentId(appId);
    try {
      await fetchAPI(`/api/data/appointments/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: newMethod }),
      });
      setAppointments((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, paymentMethod: newMethod } : a))
      );
    } catch {
      alert("Error al actualizar el medio de pago");
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const handleOpenClientFullHistory = async (clientId?: string, clientName?: string, clientPhone?: string) => {
    if (!clientId) {
      alert("No se encontró el identificador de la clienta");
      return;
    }
    try {
      const [cRes, aRes] = await Promise.all([
        fetchAPI("/api/data/clients"),
        fetchAPI("/api/data/appointments"),
      ]);
      const allClients = await cRes.json().catch(() => []);
      const allApps = await aRes.json().catch(() => []);
      const client = allClients.find((c: any) => c.id === clientId) || {
        id: clientId,
        name: clientName || "Clienta",
        phone: clientPhone || "",
        email: null,
        birthday: null,
        notes: null,
        createdAt: null,
      };
      setClientForHistoryModal(client);
      setClientHistoryApps(allApps.filter((a: any) => a.clientId === clientId));
    } catch {
      alert("Error al cargar la ficha de la clienta");
    }
  };

  const handleExportProfClientsCSV = () => {
    if (!selectedProfForClients) return;
    const profApps = completedApps.filter(
      (a) => a.professionalName?.toLowerCase() === selectedProfForClients.name?.toLowerCase()
    );

    const headers = ["Fecha", "Hora", "Clienta", "Telefono", "Concepto", "Monto Servicio", "Monto Shop", "Total", "Medio de Pago", "Notas"];
    const rows = profApps.map((a) => {
      const isPureShop = (a.shopSales || 0) > 0 && a.price === 0;
      const srvName = isPureShop ? "Venta Shop" : a.serviceName || "Servicio";
      const total = (a.price || 0) + (a.shopSales || 0);
      return [
        a.date,
        a.time,
        a.clientName || "",
        a.clientPhone || "",
        srvName,
        a.price || 0,
        a.shopSales || 0,
        total,
        a.paymentMethod || "Efectivo",
        (a.notes || "").replace(/\n/g, " "),
      ];
    });

    const csvContent = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clientas_${selectedProfForClients.name.replace(/\s+/g, "_")}_${periodPrefix}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Wallet size={15} className="text-primary" /> Distribución por Medio de Pago
            </h3>
            <button
              type="button"
              onClick={() => setShowAuditPaymentsModal(true)}
              className="text-[11px] font-bold text-primary hover:text-primary/90 bg-primary/10 hover:bg-primary/20 border border-primary/30 px-2 py-1 rounded transition-colors flex items-center gap-1"
              title="Reasignar o corregir medios de pago mal cargados"
            >
              ✏️ Modificar medios de pago
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {[
              { label: "Efectivo", icon: Wallet, color: "text-emerald-400", val: paymentBreakdown["Efectivo"] || 0 },
              { label: "Transferencia", icon: Landmark, color: "text-blue-400", val: paymentBreakdown["Transferencia"] || 0 },
              { label: "Mercado Pago", icon: CreditCard, color: "text-cyan-400", val: paymentBreakdown["Mercado Pago"] || 0 },
              { label: "Tarjeta", icon: CreditCard, color: "text-violet-400", val: paymentBreakdown["Tarjeta"] || 0 },
              { label: "Cuenta Corriente", icon: FileText, color: "text-amber-400", val: paymentBreakdown["Cuenta Corriente"] || 0 },
            ].map((method) => {
              const Icon = method.icon;
              const pct = totalIncome > 0 ? Math.round((method.val / totalIncome) * 100) : 0;
              return (
                <div key={method.label} className="p-3 bg-muted/20 border border-border/30 rounded-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Icon size={14} className={method.color} />
                      <span className="text-xs text-foreground font-medium">{method.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-foreground">${method.val.toLocaleString("es-AR")}</p>
                      <p className="text-[10px] text-muted-foreground">{pct}% del total</p>
                    </div>
                  </div>

                  {method.label === "Transferencia" && method.val > 0 && Object.keys(bankBreakdown).length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-border/40 grid grid-cols-2 gap-1.5 text-[10px]">
                      {Object.entries(bankBreakdown).map(([bank, bVal]) => (
                        <div key={bank} className="flex items-center justify-between bg-background/60 border border-border/30 px-1.5 py-1 rounded">
                          <span className="text-muted-foreground truncate">{bank}</span>
                          <span className="text-blue-400 font-bold font-mono ml-1">${bVal.toLocaleString("es-AR")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rendimiento por Profesional */}
        <div className="bg-card border border-border/50 rounded-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Landmark size={15} className="text-primary" /> Recaudación por Profesional
            </h3>
            <span className="text-[10px] text-primary/80 font-medium hidden sm:inline">
              (Tocá para ver clientas ➔)
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {profPerformance.map((prof) => {
              const profObj = professionals.find((p) => p.id === prof.id);
              return (
                <div
                  key={prof.id}
                  onClick={() => {
                    setSelectedProfForClients(
                      profObj || { id: prof.id, name: prof.name, role: prof.role, color: prof.color }
                    );
                    setProfClientsSearch("");
                    setProfPaymentFilter("todos");
                  }}
                  className="p-3 bg-muted/20 hover:bg-muted/40 border border-border/30 hover:border-primary/50 rounded-sm flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] group shadow-xs"
                  title={`Ver detalle de clientas atendidas por ${prof.name}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 group-hover:scale-125 transition-transform"
                      style={{ backgroundColor: prof.color || "#7c3aed" }}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {prof.name}
                        </p>
                        <span className="text-[10px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          ➔ Ver clientas
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {prof.count} completado{prof.count !== 1 ? "s" : ""}{" "}
                        {prof.pendingCount > 0
                          ? `(${prof.pendingCount} pendiente${prof.pendingCount !== 1 ? "s" : ""})`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-foreground font-mono">
                      ${prof.total.toLocaleString("es-AR")}
                    </p>
                    <p className="text-[10px] text-primary font-medium">
                      {prof.share}% recaudación cobrada
                    </p>
                  </div>
                </div>
              );
            })}
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
        {/* Modal para Modificar / Corregir Medios de Pago del Mes */}
        {showAuditPaymentsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-foreground"
            >
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20 flex-shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    ✏️ Reasignar / Corregir Medios de Pago ({MONTH_NAMES[selectedMonth]} {selectedYear})
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Modificá fácilmente los cobros que figuraban en Efectivo por error para que se asignen a Transferencia, Bancos o Tarjeta.
                  </p>
                </div>
                <button
                  onClick={() => setShowAuditPaymentsModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-sm"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Filtros de búsqueda */}
              <div className="p-3 border-b border-border/40 bg-background/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por cliente, profesional o servicio..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Filtrar:</span>
                  {[
                    { id: "todos", label: "Todos" },
                    { id: "efectivo", label: "Solo Efectivo" },
                    { id: "transferencia", label: "Transferencias" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setAuditFilterMethod(f.id)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                        auditFilterMethod === f.id
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabla de cobros */}
              <div className="overflow-y-auto flex-1 p-3">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border/50 text-[10px] uppercase font-bold text-muted-foreground">
                      <th className="pb-2">Fecha</th>
                      <th className="pb-2">Cliente</th>
                      <th className="pb-2">Profesional</th>
                      <th className="pb-2">Concepto</th>
                      <th className="pb-2 text-right">Monto</th>
                      <th className="pb-2 pl-3">Medio de Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {completedApps
                      .filter((a) => {
                        const q = auditSearch.toLowerCase();
                        const matchText =
                          (a.clientName || "").toLowerCase().includes(q) ||
                          (a.professionalName || "").toLowerCase().includes(q) ||
                          (a.serviceName || "").toLowerCase().includes(q);
                        if (!matchText) return false;

                        const raw = (a.paymentMethod || "Efectivo").toLowerCase();
                        if (auditFilterMethod === "efectivo") return raw.includes("efectivo") || !a.paymentMethod;
                        if (auditFilterMethod === "transferencia") return raw.includes("transferencia");
                        return true;
                      })
                      .map((app) => {
                        const totalApp = (app.price || 0) + (app.shopSales || 0);
                        const isPureShop = (app.shopSales || 0) > 0 && app.price === 0;
                        const currentMethod = app.paymentMethod || "Efectivo";

                        return (
                          <tr key={app.id} className="hover:bg-muted/10 transition-colors">
                            <td className="py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                              {app.date.split("-").reverse().join("/")} {app.time}
                            </td>
                            <td className="py-2.5 font-semibold text-foreground">
                              {app.clientName || "Cliente"}
                            </td>
                            <td className="py-2.5 text-muted-foreground text-[11px]">
                              {app.professionalName || "—"}
                            </td>
                            <td className="py-2.5 text-muted-foreground text-[11px]">
                              {isPureShop ? "🛍️ Venta Shop" : app.serviceName || "Servicio"}
                              {(app.shopSales || 0) > 0 && !isPureShop && (
                                <span className="text-emerald-400 text-[10px] ml-1">+shop</span>
                              )}
                            </td>
                            <td className="py-2.5 text-right font-bold text-foreground font-mono">
                              ${totalApp.toLocaleString("es-AR")}
                            </td>
                            <td className="py-2.5 pl-3">
                              <select
                                value={currentMethod}
                                disabled={updatingPaymentId === app.id}
                                onChange={(e) => handleUpdateAppPayment(app.id, e.target.value)}
                                className={`text-xs font-semibold px-2 py-1 rounded border transition-colors ${
                                  currentMethod.toLowerCase().includes("transferencia")
                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                    : currentMethod === "Efectivo"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : "bg-background text-foreground border-border"
                                }`}
                              >
                                <option value="Efectivo">💵 Efectivo</option>
                                <option value="Transferencia (Banco de Córdoba)">🏦 Transferencia (Banco de Córdoba)</option>
                                <option value="Transferencia (Naranja X)">🍊 Transferencia (Naranja X)</option>
                                <option value="Transferencia (Ualá)">💳 Transferencia (Ualá)</option>
                                <option value="Transferencia (Personal Pay)">📱 Transferencia (Personal Pay)</option>
                                <option value="Transferencia">🏛️ Transferencia (Otra)</option>
                                <option value="Mercado Pago">💳 Mercado Pago</option>
                                <option value="Tarjeta">💳 Tarjeta</option>
                                <option value="Cuenta Corriente">📋 Cuenta Corriente</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
                <span>
                  Los cambios se guardan al instante y actualizan los totales automáticamente.
                </span>
                <button
                  type="button"
                  onClick={() => setShowAuditPaymentsModal(false)}
                  className="bg-primary text-primary-foreground font-bold px-4 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
                >
                  Listo
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal de Historial de Clientas Atendidas por Profesional */}
        {selectedProfForClients && (() => {
          const profApps = completedApps.filter(
            (a) => a.professionalName?.toLowerCase() === selectedProfForClients.name?.toLowerCase()
          );
          const totalServices = profApps.reduce((s, a) => s + (a.price || 0), 0);
          const totalShop = profApps.reduce((s, a) => s + (a.shopSales || 0), 0);
          const totalEarned = totalServices + totalShop;
          const avgTicket = profApps.length > 0 ? Math.round(totalEarned / profApps.length) : 0;

          const filtered = profApps.filter((a) => {
            const matchesSearch =
              !profClientsSearch ||
              (a.clientName || "").toLowerCase().includes(profClientsSearch.toLowerCase()) ||
              (a.clientPhone || "").includes(profClientsSearch) ||
              (a.serviceName || "").toLowerCase().includes(profClientsSearch.toLowerCase()) ||
              (a.notes || "").toLowerCase().includes(profClientsSearch.toLowerCase());

            if (!matchesSearch) return false;

            if (profPaymentFilter === "todos") return true;
            const pm = (a.paymentMethod || "Efectivo").toLowerCase();
            if (profPaymentFilter === "Efectivo") return pm.includes("efectivo");
            if (profPaymentFilter === "Transferencia") return pm.includes("transferencia");
            if (profPaymentFilter === "Tarjeta") return pm.includes("tarjeta") || pm.includes("mercado");
            if (profPaymentFilter === "Cuenta Corriente") return pm.includes("cuenta corriente");
            return true;
          }).sort((a, b) => {
            const dtA = `${a.date} ${a.time || "00:00"}`;
            const dtB = `${b.date} ${b.time || "00:00"}`;
            return dtB.localeCompare(dtA);
          });

          return (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                className="bg-card border border-border w-full max-w-4xl max-h-[92vh] rounded-xl flex flex-col shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-border bg-muted/20 flex-shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm flex-shrink-0"
                        style={{ backgroundColor: selectedProfForClients.color || "#7c3aed" }}
                      >
                        {selectedProfForClients.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base sm:text-lg font-bold text-foreground">
                            {selectedProfForClients.name}
                          </h2>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {selectedProfForClients.role || "Profesional"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Historial de clientas atendidas en <strong className="text-foreground">{MONTH_NAMES[selectedMonth]} {selectedYear}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportProfClientsCSV}
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors"
                        title="Descargar lista de clientas en CSV"
                      >
                        <Download size={13} />
                        <span>Exportar CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedProfForClients(null)}
                        className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors"
                        title="Cerrar ventana"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Summary KPI Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
                    <div className="bg-background/80 border border-border/60 rounded-lg p-2.5">
                      <span className="text-[10px] text-muted-foreground font-medium block">Clientas Atendidas</span>
                      <span className="text-base font-bold text-foreground font-mono">
                        {profApps.length}
                      </span>
                    </div>

                    <div className="bg-background/80 border border-border/60 rounded-lg p-2.5">
                      <span className="text-[10px] text-muted-foreground font-medium block">Total Cobrado</span>
                      <span className="text-base font-bold text-primary font-mono">
                        ${totalEarned.toLocaleString("es-AR")}
                      </span>
                    </div>

                    <div className="bg-background/80 border border-border/60 rounded-lg p-2.5">
                      <span className="text-[10px] text-muted-foreground font-medium block">Servicios / Shop</span>
                      <div className="text-xs font-semibold text-foreground font-mono flex items-center gap-1 mt-0.5">
                        <span>${totalServices.toLocaleString("es-AR")}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-emerald-500">${totalShop.toLocaleString("es-AR")}</span>
                      </div>
                    </div>

                    <div className="bg-background/80 border border-border/60 rounded-lg p-2.5">
                      <span className="text-[10px] text-muted-foreground font-medium block">Ticket Promedio</span>
                      <span className="text-base font-bold text-foreground font-mono">
                        ${avgTicket.toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>

                  {/* Search and Payment Filter Bar */}
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Buscar por clienta, teléfono o servicio..."
                        value={profClientsSearch}
                        onChange={(e) => setProfClientsSearch(e.target.value)}
                        className="w-full bg-background border border-border pl-8 pr-3 py-1.5 rounded-lg text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary"
                      />
                      {profClientsSearch && (
                        <button
                          type="button"
                          onClick={() => setProfClientsSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                      {[
                        { id: "todos", label: "Todos" },
                        { id: "Efectivo", label: "💵 Efectivo" },
                        { id: "Transferencia", label: "🏦 Transf." },
                        { id: "Tarjeta", label: "💳 Tarjeta" },
                        { id: "Cuenta Corriente", label: "📋 Cta Cte" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setProfPaymentFilter(tab.id)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                            profPaymentFilter === tab.id
                              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                              : "bg-background border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Clients List / Table */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-5">
                  {filtered.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                        <User size={22} />
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        No se encontraron atenciones
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        {profClientsSearch || profPaymentFilter !== "todos"
                          ? "Probá cambiando o borrando el término de búsqueda o filtro de pago."
                          : "No hay atenciones completadas para esta profesional en el mes seleccionado."}
                      </p>
                      {(profClientsSearch || profPaymentFilter !== "todos") && (
                        <button
                          type="button"
                          onClick={() => {
                            setProfClientsSearch("");
                            setProfPaymentFilter("todos");
                          }}
                          className="mt-3 text-xs text-primary hover:underline font-medium"
                        >
                          Restablecer filtros
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filtered.map((app) => {
                        const isPureShop = (app.shopSales || 0) > 0 && app.price === 0;
                        const totalApp = (app.price || 0) + (app.shopSales || 0);
                        const pm = app.paymentMethod || "Efectivo";

                        let pmColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                        if (pm.toLowerCase().includes("transferencia")) {
                          pmColor = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
                        } else if (pm.toLowerCase().includes("tarjeta") || pm.toLowerCase().includes("mercado")) {
                          pmColor = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
                        } else if (pm.toLowerCase().includes("cuenta corriente")) {
                          pmColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
                        }

                        const dateParts = app.date?.split("-") || [];
                        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : app.date;

                        return (
                          <div
                            key={app.id}
                            className="p-3 bg-muted/15 hover:bg-muted/30 border border-border/60 hover:border-border rounded-lg transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            {/* Client & Date info */}
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="px-2.5 py-1.5 rounded-md bg-background border border-border/80 text-center flex-shrink-0 min-w-[54px]">
                                <span className="text-[11px] font-bold text-foreground block">
                                  {formattedDate}
                                </span>
                                <span className="text-[10px] text-muted-foreground block font-mono">
                                  {app.time || "--:--"}
                                </span>
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                                    {app.clientName || "Clienta s/ nombre"}
                                  </h4>
                                  {app.clientId && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenClientFullHistory(app.clientId, app.clientName, app.clientPhone)}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors cursor-pointer"
                                      title="Ver historial completo y ficha de la clienta"
                                    >
                                      👤 Ver ficha
                                    </button>
                                  )}
                                </div>

                                {app.clientPhone && (
                                  <p className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
                                    <span>📞 {app.clientPhone}</span>
                                    <a
                                      href={`https://wa.me/${app.clientPhone.replace(/\D/g, "")}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-emerald-500 hover:underline text-[10px] font-sans"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      WhatsApp
                                    </a>
                                  </p>
                                )}

                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className="text-xs text-foreground/90 font-medium">
                                    {isPureShop ? "🛍️ Venta Shop" : `✂️ ${app.serviceName || "Servicio"}`}
                                  </span>
                                  {(app.shopSales || 0) > 0 && !isPureShop && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                                      + Shop (${(app.shopSales || 0).toLocaleString("es-AR")})
                                    </span>
                                  )}
                                  {app.notes && (
                                    <span className="text-[10px] text-muted-foreground italic truncate max-w-[200px]" title={app.notes}>
                                      "{app.notes}"
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Payment and total amount */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                              <span className={`text-[10px] font-semibold px-2 py-0.8 rounded-full border ${pmColor}`}>
                                {pm}
                              </span>

                              <div>
                                <span className="text-sm font-bold text-foreground font-mono block">
                                  ${totalApp.toLocaleString("es-AR")}
                                </span>
                                {(app.shopSales || 0) > 0 && app.price > 0 && (
                                  <span className="text-[9px] text-muted-foreground font-mono block">
                                    Srv: ${app.price.toLocaleString("es-AR")} + Shop: ${(app.shopSales || 0).toLocaleString("es-AR")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-3 sm:p-4 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
                  <span>
                    Mostrando <strong className="text-foreground">{filtered.length}</strong> de{" "}
                    <strong className="text-foreground">{profApps.length}</strong> atenciones de {selectedProfForClients.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportProfClientsCSV}
                      className="sm:hidden px-2.5 py-1 text-xs border border-border rounded bg-background hover:bg-muted font-medium"
                    >
                      Exportar CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedProfForClients(null)}
                      className="bg-primary text-primary-foreground font-bold px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}

        {/* Modal de Ficha e Historial Completo de la Clienta */}
        {clientForHistoryModal && (
          <ClientHistoryModal
            client={clientForHistoryModal}
            appointments={clientHistoryApps}
            onClose={() => setClientForHistoryModal(null)}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
