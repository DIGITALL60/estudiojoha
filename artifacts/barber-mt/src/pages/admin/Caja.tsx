import { fetchAPI } from "@/lib/api";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, Wallet, Plus, Trash2 } from "lucide-react";
import AdminLayout from "./AdminLayout";

interface AppointmentRow {
  id: string; date: string; time: string; price: number; status: string;
  clientName: string; professionalName: string; serviceName: string; paymentMethod: string;
}

interface ExpenseRow {
  id: string; concept: string; amount: number; category: string; date: string;
}

export default function Caja() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newExpense, setNewExpense] = useState({ concept: "", amount: "", category: "General" });
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  // Set today to match local date
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchAPI("/api/data/appointments").then(r => r.json()),
      fetchAPI("/api/data/expenses").then(r => r.json()),
    ])
      .then(([apps, exps]) => {
        setAppointments(apps);
        setExpenses(exps);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const todayApps = appointments.filter(a => a.date === selectedDate);
  const completedApps = todayApps.filter(a => a.status === "completado");
  const pendingApps = todayApps.filter(a => a.status === "agendado");

  const cobrado = completedApps.reduce((sum, a) => sum + a.price, 0);
  const pendiente = pendingApps.reduce((sum, a) => sum + a.price, 0);
  const ventasDelDia = completedApps.length;

  const dayExpenses = expenses.filter(e => e.date === selectedDate);
  const totalEgresos = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const neto = cobrado - totalEgresos;

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

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("¿Eliminar este egreso?")) return;
    await fetchAPI(`/api/data/expenses/${id}`, { method: "DELETE" });
    loadData();
  };

  const byMethod = completedApps.reduce((acc, a) => {
    const method = a.paymentMethod || "Efectivo";
    acc[method] = (acc[method] || 0) + a.price;
    return acc;
  }, {} as Record<string, number>);

  const byProfessional = completedApps.reduce((acc, a) => {
    acc[a.professionalName] = (acc[a.professionalName] || 0) + a.price;
    return acc;
  }, {} as Record<string, number>);

  const byService = completedApps.reduce((acc, a) => {
    acc[a.serviceName] = (acc[a.serviceName] || 0) + a.price;
    return acc;
  }, {} as Record<string, number>);

  const dateObj = new Date(selectedDate + "T12:00:00");
  const displayDate = dateObj.toLocaleDateString("es-AR", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <AdminLayout
      title="Caja"
      subtitle={displayDate.charAt(0).toUpperCase() + displayDate.slice(1)}
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-card border border-border/50 rounded-lg p-1 mr-2">
            <button onClick={() => {
              const d = new Date(selectedDate + "T12:00:00");
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split("T")[0]);
            }} className="p-1 hover:bg-accent/5 rounded-md"><ChevronLeft size={16} /></button>
            <span className="text-xs font-semibold px-2">Hoy</span>
            <button onClick={() => {
              const d = new Date(selectedDate + "T12:00:00");
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split("T")[0]);
            }} className="p-1 hover:bg-accent/5 rounded-md"><ChevronRight size={16} /></button>
          </div>
          <button
            onClick={() => {
              const rows = completedApps.map(a => [
                a.date, a.time, a.clientName, a.serviceName, a.professionalName,
                a.paymentMethod || "Efectivo", a.price
              ]);
              const headers = ["Fecha", "Hora", "Cliente", "Servicio", "Profesional", "Método de Pago", "Monto"];
              const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
              const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `caja_${selectedDate}.csv`; a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/20 transition-colors"
          >
            <Download size={13} /> Exportar CSV
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-card border border-border/50 rounded-xl p-5 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2 relative z-10">Cobrado</span>
          <span className="text-2xl font-bold text-foreground relative z-10">$ {cobrado.toLocaleString("es-AR")}</span>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-5 flex flex-col justify-center">
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Egresos</span>
          <span className="text-2xl font-bold text-red-400">$ {totalEgresos.toLocaleString("es-AR")}</span>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-5 flex flex-col justify-center">
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Neto del día</span>
          <span className={`text-2xl font-bold ${neto >= 0 ? "text-emerald-400" : "text-red-400"}`}>$ {neto.toLocaleString("es-AR")}</span>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-5 flex flex-col justify-center">
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Pendiente / Ventas</span>
          <span className="text-2xl font-bold text-foreground">$ {pendiente.toLocaleString("es-AR")} · {ventasDelDia}</span>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] uppercase tracking-widest font-bold text-foreground">Egresos del día</span>
          <button
            onClick={() => setShowExpenseForm(!showExpenseForm)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
          >
            <Plus size={12} /> Registrar egreso
          </button>
        </div>
        {showExpenseForm && (
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-background border border-border/50 rounded-lg">
            <input
              placeholder="Concepto"
              value={newExpense.concept}
              onChange={e => setNewExpense(f => ({ ...f, concept: e.target.value }))}
              className="flex-1 min-w-[120px] bg-card border border-border rounded-sm px-3 py-2 text-xs"
            />
            <input
              type="number"
              placeholder="Monto $"
              value={newExpense.amount}
              onChange={e => setNewExpense(f => ({ ...f, amount: e.target.value }))}
              className="w-28 bg-card border border-border rounded-sm px-3 py-2 text-xs"
            />
            <select
              value={newExpense.category}
              onChange={e => setNewExpense(f => ({ ...f, category: e.target.value }))}
              className="bg-card border border-border rounded-sm px-3 py-2 text-xs"
            >
              {["General", "Insumos", "Alquiler", "Sueldos", "Marketing"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button onClick={handleAddExpense} className="bg-primary text-primary-foreground text-xs px-4 py-2 rounded-sm">Guardar</button>
          </div>
        )}
        {dayExpenses.length > 0 ? (
          <div className="space-y-2">
            {dayExpenses.map(e => (
              <div key={e.id} className="flex items-center justify-between text-xs py-2 border-b border-border/20 last:border-0">
                <div>
                  <span className="font-medium text-foreground">{e.concept}</span>
                  <span className="text-muted-foreground ml-2">· {e.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-red-400">$ {e.amount.toLocaleString("es-AR")}</span>
                  <button onClick={() => handleDeleteExpense(e.id)} className="text-muted-foreground hover:text-red-400"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Sin egresos registrados para este día.</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border border-border/50 rounded-xl p-5">
          <span className="text-[10px] uppercase tracking-widest font-bold text-foreground mb-4 block">Por método</span>
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

        <div className="bg-card border border-border/50 rounded-xl p-5">
          <span className="text-[10px] uppercase tracking-widest font-bold text-foreground mb-4 block">Por servicio</span>
          {Object.keys(byService).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(byService).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-semibold text-foreground">$ {v.toLocaleString("es-AR")}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground">Sin ventas hoy</p>}
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <span className="text-[10px] uppercase tracking-widest font-bold text-foreground">Detalle</span>
        </div>
        {completedApps.length > 0 ? (
          <table className="w-full">
            <tbody>
              {completedApps.map((a, i) => (
                <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-accent/5 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground">{a.clientName}</span>
                      <span className="text-[10px] text-muted-foreground">{a.time} - {a.serviceName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className="text-xs text-muted-foreground">{a.professionalName}</span>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-sm uppercase tracking-wider">{a.paymentMethod || "Efectivo"}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-xs font-bold text-foreground">$ {a.price.toLocaleString("es-AR")}</span>
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
    </AdminLayout>
  );
}
