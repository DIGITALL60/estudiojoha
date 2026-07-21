import { fetchAPI } from "@/lib/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, Wallet, Plus, Trash2, TrendingUp, TrendingDown, BarChart3, Tag } from "lucide-react";
import AdminLayout from "./AdminLayout";

interface AppointmentRow {
  id: string; date: string; time: string; price: number; status: string;
  clientName: string; professionalName: string; serviceName: string; paymentMethod: string;
  shopSales?: number;
}
interface Professional { id: string; name: string; }
interface Client { id: string; name: string; phone: string; }
interface Service { id: string; name: string; price: number; }

interface ExpenseRow {
  id: string; concept: string; amount: number; category: string; date: string;
}

const EXPENSE_CATEGORIES = [
  "General", "Alquiler", "Luz", "Gas", "Agua", "WiFi",
  "Supermercado", "Insumos", "Sueldos", "Marketing", "Otros"
];

const CATEGORY_ICONS: Record<string, string> = {
  "Alquiler": "🏠", "Luz": "💡", "Gas": "🔥", "Agua": "💧", "WiFi": "📶",
  "Supermercado": "🛒", "Insumos": "🧴", "Sueldos": "💼", "Marketing": "📢",
  "General": "📋", "Otros": "📌"
};

export default function Caja() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newExpense, setNewExpense] = useState({ concept: "", amount: "", category: "General" });
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [activeTab, setActiveTab] = useState<"dia" | "mes" | "rapido">("dia");
  const [quickAction, setQuickAction] = useState<"cobro" | "shop" | "egreso">("cobro");
  const [newQuickApp, setNewQuickApp] = useState({ clientId: "", professionalId: "", serviceId: "", amount: "", paymentMethod: "Efectivo", time: "10:00" });

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchAPI("/api/data/appointments").then(r => r.json()),
      fetchAPI("/api/data/expenses").then(r => r.json()),
      fetchAPI("/api/data/professionals").then(r => r.json()),
      fetchAPI("/api/data/clients").then(r => r.json()),
      fetchAPI("/api/data/services").then(r => r.json()),
    ])
      .then(([apps, exps, profs, clis, srvs]) => {
        setAppointments(apps);
        setExpenses(exps);
        setProfessionals(profs);
        setClients(clis);
        setServices(srvs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  // ── Day filter ──
  const todayApps = appointments.filter(a => a.date === selectedDate);
  const completedApps = todayApps.filter(a => a.status === "completado");
  const pendingApps = todayApps.filter(a => a.status === "agendado" || a.status === "confirmado");

  const cobrado = completedApps.reduce((sum, a) => sum + a.price, 0);
  const shopToday = completedApps.reduce((sum, a) => sum + (a.shopSales || 0), 0);
  const pendiente = pendingApps.reduce((sum, a) => sum + a.price, 0);
  const dayExpenses = expenses.filter(e => e.date === selectedDate);
  const totalEgresos = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const neto = cobrado + shopToday - totalEgresos;

  // ── Month filter ──
  const selectedMonth = selectedDate.slice(0, 7); // YYYY-MM
  const monthApps = appointments.filter(a => a.date.startsWith(selectedMonth) && a.status === "completado");
  const monthExpenses = expenses.filter(e => e.date.startsWith(selectedMonth));
  const monthCobrado = monthApps.reduce((sum, a) => sum + a.price, 0);
  const monthShop = monthApps.reduce((sum, a) => sum + (a.shopSales || 0), 0);
  const monthEgresos = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const monthNeto = monthCobrado + monthShop - monthEgresos;

  // ── By category (month) ──
  const byCategory = monthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const byMethod = completedApps.reduce((acc, a) => {
    const method = a.paymentMethod || "Efectivo";
    acc[method] = (acc[method] || 0) + a.price;
    return acc;
  }, {} as Record<string, number>);

  const byProfessional = completedApps.reduce((acc, a) => {
    acc[a.professionalName] = (acc[a.professionalName] || 0) + a.price;
    return acc;
  }, {} as Record<string, number>);

  const handleAddExpense = async () => {
    if (!newExpense.concept || !newExpense.amount) return;
    try {
      await fetchAPI("/api/data/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: newExpense.concept,
          amount: Number(newExpense.amount),
          category: newExpense.category,
          date: selectedDate,
        }),
      });
      setNewExpense({ concept: "", amount: "", category: "General" });
      setShowExpenseForm(false);
      loadData();
    } catch {
      alert("Error al registrar egreso");
    }
  };

  const handleAddQuickApp = async (type: "cobro" | "shop") => {
    if (!newQuickApp.clientId || !newQuickApp.professionalId || !newQuickApp.serviceId || !newQuickApp.amount) return;
    try {
      await fetchAPI("/api/data/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: newQuickApp.clientId,
          professionalId: newQuickApp.professionalId,
          serviceId: newQuickApp.serviceId,
          date: selectedDate,
          time: newQuickApp.time,
          duration: 30, // Default duration for quick add
          price: type === "cobro" ? Number(newQuickApp.amount) : 0,
          shopSales: type === "shop" ? Number(newQuickApp.amount) : 0,
          status: "completado",
          paymentMethod: newQuickApp.paymentMethod,
        }),
      });
      setNewQuickApp({ clientId: "", professionalId: "", serviceId: "", amount: "", paymentMethod: "Efectivo", time: "10:00" });
      alert("Registro guardado exitosamente");
      loadData();
    } catch {
      alert("Error al guardar el registro");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("¿Eliminar este egreso?")) return;
    await fetchAPI(`/api/data/expenses/${id}`, { method: "DELETE" });
    loadData();
  };

  const dateObj = new Date(selectedDate + "T12:00:00");
  const displayDate = dateObj.toLocaleDateString("es-AR", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const displayMonth = dateObj.toLocaleDateString("es-AR", { month: 'long', year: 'numeric' });

  const handleExportCSV = () => {
    const rows = completedApps.map(a => [
      a.date, a.time, a.clientName, a.serviceName, a.professionalName,
      a.paymentMethod || "Efectivo", a.price, a.shopSales || 0
    ]);
    const headers = ["Fecha", "Hora", "Cliente", "Servicio", "Profesional", "Método de Pago", "Servicio $", "Shop $"];
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `caja_${selectedDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout
      title="Caja"
      subtitle={activeTab === "dia" ? displayDate.charAt(0).toUpperCase() + displayDate.slice(1) : `Balance de ${displayMonth}`}
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-card border border-border/50 rounded-lg p-1 mr-1">
            <button onClick={() => {
              const d = new Date(selectedDate + "T12:00:00");
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split("T")[0]);
            }} className="p-1 hover:bg-accent/5 rounded-md"><ChevronLeft size={16} /></button>
            <button onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])} className="text-xs font-semibold px-2">Hoy</button>
            <button onClick={() => {
              const d = new Date(selectedDate + "T12:00:00");
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split("T")[0]);
            }} className="p-1 hover:bg-accent/5 rounded-md"><ChevronRight size={16} /></button>
          </div>
          <button onClick={handleExportCSV} className="flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/20 transition-colors">
            <Download size={13} /> CSV
          </button>
        </div>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border/50 rounded-lg p-1 w-fit mb-6 overflow-x-auto max-w-full">
        {([["dia", "📅 Día"], ["mes", "📊 Balance Mensual"], ["rapido", "⚡ Carga Rápida"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "dia" ? (
          <motion.div key="dia" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Cobrado", value: cobrado, color: "text-foreground", bg: "from-primary/10 to-transparent", action: "cobro" },
                { label: "Shop", value: shopToday, color: "text-emerald-400", bg: "from-emerald-500/10 to-transparent", action: "shop" },
                { label: "Egresos", value: totalEgresos, color: "text-red-400", bg: "from-red-500/5 to-transparent", action: "egreso" },
                { label: "Neto del día", value: neto, color: neto >= 0 ? "text-emerald-400" : "text-red-400", bg: neto >= 0 ? "from-emerald-500/10 to-transparent" : null },
              ].map((card) => (
                <div key={card.label} className="bg-card border border-border/50 rounded-xl p-4 relative overflow-hidden group">
                  {card.bg && <div className={`absolute inset-0 bg-gradient-to-br ${card.bg} pointer-events-none`} />}
                  <div className="flex items-center justify-between mb-2 relative z-10">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{card.label}</span>
                    {card.action && (
                      <button 
                        onClick={() => { setQuickAction(card.action as any); setActiveTab("rapido"); }} 
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border/50 hover:bg-accent rounded-full p-1 text-muted-foreground hover:text-foreground"
                        title={`Agregar ${card.label} rápido`}
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                  <span className={`text-xl font-bold relative z-10 ${card.color}`}>$ {card.value.toLocaleString("es-AR")}</span>
                </div>
              ))}
            </div>

            {/* Pending */}
            {pendingApps.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
                <span className="text-amber-400 text-lg">⏳</span>
                <div className="text-xs">
                  <span className="font-semibold text-amber-400">{pendingApps.length} turno{pendingApps.length > 1 ? "s" : ""} pendiente{pendingApps.length > 1 ? "s" : ""}</span>
                  <span className="text-muted-foreground ml-2">· $ {pendiente.toLocaleString("es-AR")} esperado</span>
                </div>
              </div>
            )}

            {/* Egresos section */}
            <div className="bg-card border border-border/50 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-widest font-bold text-foreground flex items-center gap-2">
                  <TrendingDown size={12} className="text-red-400" /> Egresos del día
                </span>
                <button onClick={() => setShowExpenseForm(!showExpenseForm)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
                  <Plus size={12} /> Registrar egreso
                </button>
              </div>
              <AnimatePresence>
                {showExpenseForm && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4 p-3 bg-background border border-border/50 rounded-lg">
                      <input
                        placeholder="Concepto (ej: Gas de agosto)"
                        value={newExpense.concept}
                        onChange={e => setNewExpense(f => ({ ...f, concept: e.target.value }))}
                        className="sm:col-span-1 bg-card border border-border rounded-sm px-3 py-2 text-xs"
                      />
                      <select
                        value={newExpense.category}
                        onChange={e => setNewExpense(f => ({ ...f, category: e.target.value }))}
                        className="bg-card border border-border rounded-sm px-3 py-2 text-xs"
                      >
                        {EXPENSE_CATEGORIES.map(c => (
                          <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
                        ))}
                      </select>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-muted-foreground text-xs font-semibold">$</span>
                        <input
                          type="number" placeholder="Monto" value={newExpense.amount}
                          onChange={e => setNewExpense(f => ({ ...f, amount: e.target.value }))}
                          className="w-full bg-card border border-border rounded-sm pl-7 pr-3 py-2 text-xs focus:border-primary focus:outline-none"
                        />
                      </div>
                      <button onClick={handleAddExpense} className="bg-primary text-primary-foreground text-xs px-4 py-2 rounded-sm font-semibold">
                        Guardar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {dayExpenses.length > 0 ? (
                <div className="space-y-2">
                  {dayExpenses.map(e => (
                    <div key={e.id} className="flex items-center justify-between text-xs py-2 border-b border-border/20 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{CATEGORY_ICONS[e.category] || "📋"}</span>
                        <div>
                          <span className="font-medium text-foreground">{e.concept}</span>
                          <span className="text-muted-foreground ml-2 text-[10px] uppercase tracking-wider bg-border/30 px-1.5 py-0.5 rounded">{e.category}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-red-400">$ {e.amount.toLocaleString("es-AR")}</span>
                        <button onClick={() => handleDeleteExpense(e.id)} className="text-muted-foreground hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sin egresos registrados para este día.</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-card border border-border/50 rounded-xl p-5">
                <span className="text-[10px] uppercase tracking-widest font-bold text-foreground mb-4 block">Por método de pago</span>
                {Object.keys(byMethod).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(byMethod).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-semibold text-foreground">$ {v.toLocaleString("es-AR")}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">Sin ventas hoy</p>}
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-5">
                <span className="text-[10px] uppercase tracking-widest font-bold text-foreground mb-4 block">Por profesional</span>
                {Object.keys(byProfessional).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(byProfessional).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-semibold text-foreground">$ {v.toLocaleString("es-AR")}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">Sin ventas hoy</p>}
              </div>
            </div>

            {/* Detail table */}
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <span className="text-[10px] uppercase tracking-widest font-bold text-foreground">Detalle de cobros</span>
              </div>
              {completedApps.length > 0 ? (
                <table className="w-full">
                  <tbody>
                    {completedApps.map((a, i) => (
                      <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-accent/5 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground">{a.clientName}</span>
                            <span className="text-[10px] text-muted-foreground">{a.time} · {a.serviceName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <span className="text-xs text-muted-foreground">{a.professionalName}</span>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <span className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-sm uppercase tracking-wider">{a.paymentMethod || "Efectivo"}</span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-foreground">$ {a.price.toLocaleString("es-AR")}</span>
                            {(a.shopSales || 0) > 0 && (
                              <span className="text-[10px] text-emerald-400">+ $ {a.shopSales!.toLocaleString("es-AR")} shop</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-16 flex flex-col items-center justify-center text-muted-foreground">
                  <Wallet size={24} className="mb-3 opacity-50" />
                  <p className="text-xs">No hay ventas registradas para este día.</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : activeTab === "rapido" ? (
          <motion.div key="rapido" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="max-w-2xl">
            <div className="flex gap-2 mb-4 bg-background border border-border/50 p-1 rounded-lg w-fit">
              <button onClick={() => setQuickAction("cobro")} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${quickAction === "cobro" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Cobro de Servicio</button>
              <button onClick={() => setQuickAction("shop")} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${quickAction === "shop" ? "bg-emerald-500 text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Venta Shop</button>
              <button onClick={() => setQuickAction("egreso")} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${quickAction === "egreso" ? "bg-red-500 text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Registrar Egreso</button>
            </div>
            
            <div className="bg-card border border-border/50 rounded-xl p-5 mb-6">
              <span className="text-[10px] uppercase tracking-widest font-bold text-foreground mb-4 flex items-center gap-2">
                <Plus size={14} className={quickAction === "egreso" ? "text-red-400" : quickAction === "shop" ? "text-emerald-400" : "text-primary"} /> 
                {quickAction === "egreso" ? "Nuevo Egreso" : quickAction === "shop" ? "Nueva Venta de Shop" : "Nuevo Ingreso por Servicio"}
              </span>

              {quickAction === "egreso" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input placeholder="Concepto (ej: Gas de agosto)" value={newExpense.concept} onChange={e => setNewExpense(f => ({ ...f, concept: e.target.value }))} className="bg-background border border-border rounded-md px-3 py-2 text-xs" />
                  <select value={newExpense.category} onChange={e => setNewExpense(f => ({ ...f, category: e.target.value }))} className="bg-background border border-border rounded-md px-3 py-2 text-xs">
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
                  </select>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-muted-foreground text-xs font-semibold">$</span>
                    <input type="number" placeholder="Monto" value={newExpense.amount} onChange={e => setNewExpense(f => ({ ...f, amount: e.target.value }))} className="w-full bg-background border border-border rounded-md pl-7 pr-3 py-2 text-xs focus:border-primary focus:outline-none" />
                  </div>
                  <button onClick={handleAddExpense} className="bg-primary text-primary-foreground text-xs px-4 py-2 rounded-md font-semibold hover:bg-primary/90 transition-colors">Guardar Egreso</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select value={newQuickApp.clientId} onChange={e => setNewQuickApp(prev => ({ ...prev, clientId: e.target.value }))} className="bg-background border border-border rounded-md px-3 py-2 text-xs">
                    <option value="">-- Seleccionar Cliente --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  
                  <select value={newQuickApp.professionalId} onChange={e => setNewQuickApp(prev => ({ ...prev, professionalId: e.target.value }))} className="bg-background border border-border rounded-md px-3 py-2 text-xs">
                    <option value="">-- Seleccionar Profesional --</option>
                    {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  
                  <select value={newQuickApp.serviceId} onChange={e => setNewQuickApp(prev => ({ ...prev, serviceId: e.target.value }))} className="bg-background border border-border rounded-md px-3 py-2 text-xs">
                    <option value="">-- Seleccionar Servicio --</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} (${s.price})</option>)}
                  </select>

                  <select value={newQuickApp.paymentMethod} onChange={e => setNewQuickApp(prev => ({ ...prev, paymentMethod: e.target.value }))} className="bg-background border border-border rounded-md px-3 py-2 text-xs">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                  </select>

                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-muted-foreground text-xs font-semibold">$</span>
                    <input type="number" placeholder={quickAction === "shop" ? "Monto Venta Shop" : "Monto Cobrado"} value={newQuickApp.amount} onChange={e => setNewQuickApp(f => ({ ...f, amount: e.target.value }))} className="w-full bg-background border border-border rounded-md pl-7 pr-3 py-2 text-xs focus:border-primary focus:outline-none" />
                  </div>
                  
                  <button onClick={() => handleAddQuickApp(quickAction)} className="bg-primary text-primary-foreground text-xs px-4 py-2 rounded-md font-semibold hover:bg-primary/90 transition-colors">Guardar {quickAction === "shop" ? "Venta Shop" : "Ingreso"}</button>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="mes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {/* Monthly summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Ingresos Servicios", value: monthCobrado, color: "text-foreground", icon: <TrendingUp size={14} className="text-primary" /> },
                { label: "Ventas Shop", value: monthShop, color: "text-emerald-400", icon: <Tag size={14} className="text-emerald-400" /> },
                { label: "Gastos del mes", value: monthEgresos, color: "text-red-400", icon: <TrendingDown size={14} className="text-red-400" /> },
                { label: "Ganancia neta", value: monthNeto, color: monthNeto >= 0 ? "text-emerald-400" : "text-red-400", icon: <BarChart3 size={14} className={monthNeto >= 0 ? "text-emerald-400" : "text-red-400"} /> },
              ].map((card) => (
                <div key={card.label} className="bg-card border border-border/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {card.icon}
                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{card.label}</span>
                  </div>
                  <span className={`text-xl font-bold ${card.color}`}>$ {card.value.toLocaleString("es-AR")}</span>
                </div>
              ))}
            </div>

            {/* Balance bar */}
            <div className="bg-card border border-border/50 rounded-xl p-5 mb-6">
              <span className="text-[10px] uppercase tracking-widest font-bold text-foreground mb-4 block">Balance visual del mes</span>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Ingresos totales</span>
                    <span className="font-semibold text-foreground">$ {(monthCobrado + monthShop).toLocaleString("es-AR")}</span>
                  </div>
                  <div className="h-3 bg-border/30 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Gastos</span>
                    <span className="font-semibold text-red-400">$ {monthEgresos.toLocaleString("es-AR")}</span>
                  </div>
                  <div className="h-3 bg-border/30 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-500 to-red-400/60 rounded-full"
                      style={{ width: monthCobrado + monthShop > 0 ? `${Math.min(100, (monthEgresos / (monthCobrado + monthShop)) * 100)}%` : "0%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown by category */}
            <div className="bg-card border border-border/50 rounded-xl p-5 mb-6">
              <span className="text-[10px] uppercase tracking-widest font-bold text-foreground mb-4 block">Gastos por categoría</span>
              {Object.keys(byCategory).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-base w-6">{CATEGORY_ICONS[cat] || "📋"}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{cat}</span>
                          <span className="font-semibold text-foreground">$ {amt.toLocaleString("es-AR")}</span>
                        </div>
                        <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
                          <div className="h-full bg-red-400/70 rounded-full"
                            style={{ width: monthEgresos > 0 ? `${(amt / monthEgresos) * 100}%` : "0%" }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground">Sin gastos registrados este mes.</p>}
            </div>

            {/* Monthly expense list */}
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest font-bold text-foreground">Todos los egresos del mes</span>
              </div>
              {monthExpenses.length > 0 ? (
                <div className="divide-y divide-border/20">
                  {monthExpenses.sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                    <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-accent/5">
                      <div className="flex items-center gap-3">
                        <span>{CATEGORY_ICONS[e.category] || "📋"}</span>
                        <div>
                          <p className="text-xs font-medium text-foreground">{e.concept}</p>
                          <p className="text-[10px] text-muted-foreground">{e.date} · {e.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-red-400">$ {e.amount.toLocaleString("es-AR")}</span>
                        <button onClick={() => handleDeleteExpense(e.id)} className="text-muted-foreground hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground p-5">Sin egresos este mes.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
