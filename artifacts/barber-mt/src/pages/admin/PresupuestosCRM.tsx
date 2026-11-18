import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, Plus, Search, MessageSquare, Phone, Calendar,
  DollarSign, CheckCircle2, Clock, XCircle, Trash2, Edit2,
  ExternalLink, UserCheck, AlertCircle, Filter, RefreshCw, X, Loader2,
  User, Sparkles
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { fetchAPI } from "@/lib/api";

export interface Presupuesto {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  category?: string | null;
  amount: number;
  deposit?: number | null;
  status: "nuevo" | "enviado" | "agendado" | "rechazado" | "cancelado";
  channel?: string | null;
  date: string;
  notes?: string | null;
  createdAt?: string;
}

interface ServiceOption {
  id: string;
  name: string;
  price: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  nuevo: { label: "Nuevo / Pendiente", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30", icon: Clock },
  enviado: { label: "Presupuesto Enviado", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30", icon: MessageSquare },
  agendado: { label: "¡Turno Agendado!", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30", icon: CheckCircle2 },
  rechazado: { label: "No Concretado", color: "text-rose-400", bg: "bg-rose-400/10 border-rose-400/30", icon: XCircle },
  cancelado: { label: "Cancelado", color: "text-muted-foreground", bg: "bg-muted/40 border-border/40", icon: XCircle },
};

export default function PresupuestosCRM() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"todos" | "nuevo" | "enviado" | "agendado" | "rechazado">("todos");
  const [search, setSearch] = useState("");

  // Modal create/edit
  const [editing, setEditing] = useState<Presupuesto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadPresupuestos = async () => {
    try {
      const res = await fetchAPI("/api/data/presupuestos");
      if (res.ok) {
        const data = await res.json();
        setPresupuestos(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error al cargar presupuestos:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const res = await fetchAPI("/api/data/services");
      if (res.ok) {
        const data = await res.json();
        setServices(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error al cargar servicios:", err);
    }
  };

  useEffect(() => {
    loadPresupuestos();
    loadServices();
  }, []);

  const handleStatusChange = async (id: string, newStatus: Presupuesto["status"]) => {
    try {
      const res = await fetchAPI(`/api/data/presupuestos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setPresupuestos(prev => prev.map(p => (p.id === id ? { ...p, status: newStatus } : p)));
      }
    } catch (err) {
      alert("Error al actualizar el estado");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este presupuesto/consulta?")) return;
    try {
      const res = await fetchAPI(`/api/data/presupuestos/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPresupuestos(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      alert("Error al eliminar presupuesto");
    }
  };

  // WhatsApp helper
  const handleOpenWhatsApp = (p: Presupuesto) => {
    const cleanPhone = p.clientPhone.replace(/\D/g, "");
    if (!cleanPhone) {
      alert("Este presupuesto no tiene un número de WhatsApp válido.");
      return;
    }

    const señaText = p.deposit && p.deposit > 0 ? `\n📌 *Seña requerida para señar turno:* $${p.deposit.toLocaleString("es-AR")}` : "";
    const notesText = p.notes ? `\n📝 *Detalle:* ${p.notes}` : "";

    const msg = `¡Hola ${p.clientName}! Te escribimos de *Estudio Joha* 🌸\n\nCon respecto a tu consulta por *${p.serviceName}*:\n💰 *Presupuesto total:* $${p.amount.toLocaleString("es-AR")}${señaText}${notesText}\n\n¿Querés que te reservemos un lugar? ¡Avisanos y te pasamos los días y horarios disponibles! 💕`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, "_blank");
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = presupuestos.length;
    const nuevos = presupuestos.filter(p => p.status === "nuevo").length;
    const enviados = presupuestos.filter(p => p.status === "enviado").length;
    const agendados = presupuestos.filter(p => p.status === "agendado").length;
    const conversionRate = total > 0 ? Math.round((agendados / total) * 100) : 0;
    const totalAmount = presupuestos.reduce((acc, p) => acc + (p.amount || 0), 0);

    return { total, nuevos, enviados, agendados, conversionRate, totalAmount };
  }, [presupuestos]);

  // Filtered list
  const filtered = useMemo(() => {
    return presupuestos.filter(p => {
      if (activeTab !== "todos" && p.status !== activeTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.clientName.toLowerCase().includes(q) ||
          p.clientPhone.toLowerCase().includes(q) ||
          p.serviceName.toLowerCase().includes(q) ||
          (p.notes && p.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [presupuestos, activeTab, search]);

  const handleOpenNewModal = () => {
    setEditing({
      id: "",
      clientName: "",
      clientPhone: "",
      serviceName: "",
      category: "Servicio",
      amount: 0,
      deposit: 0,
      status: "nuevo",
      channel: "WhatsApp Empresa (Manual)",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setIsModalOpen(true);
  };

  return (
    <AdminLayout
      title="Presupuestos / CRM de Consultas"
      subtitle="Gestioná cotizaciones, consultas de clientas y seguimiento comercial por WhatsApp"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={loadPresupuestos}
            className="flex items-center gap-1.5 bg-card border border-border text-foreground hover:bg-muted/50 text-xs font-semibold px-3 py-2 rounded-sm transition-colors"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-sm hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Plus size={13} />
            Nueva Consulta / Presupuesto
          </button>
        </div>
      }
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
            Total Consultas
          </span>
          <span className="text-2xl font-black text-foreground">{stats.total}</span>
          <span className="text-[11px] text-muted-foreground mt-0.5">
            ${stats.totalAmount.toLocaleString("es-AR")} cotizados
          </span>
        </div>

        <div className="bg-card border border-amber-500/20 bg-amber-500/5 rounded-xl p-4 flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase tracking-wider font-bold text-amber-500 mb-1 flex items-center gap-1">
            <Clock size={11} /> Pendientes de Enviar
          </span>
          <span className="text-2xl font-black text-amber-500">{stats.nuevos}</span>
          <span className="text-[11px] text-muted-foreground mt-0.5">Esperando cotización</span>
        </div>

        <div className="bg-card border border-blue-500/20 bg-blue-500/5 rounded-xl p-4 flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase tracking-wider font-bold text-blue-400 mb-1 flex items-center gap-1">
            <MessageSquare size={11} /> Presupuestos Enviados
          </span>
          <span className="text-2xl font-black text-blue-400">{stats.enviados}</span>
          <span className="text-[11px] text-muted-foreground mt-0.5">En seguimiento con clienta</span>
        </div>

        <div className="bg-card border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 flex flex-col justify-center shadow-xs">
          <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-500 mb-1 flex items-center gap-1">
            <CheckCircle2 size={11} /> Turnos Concretados
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-500">{stats.agendados}</span>
            <span className="text-xs font-semibold text-emerald-400">({stats.conversionRate}% éxito)</span>
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5">Conversión comercial</span>
        </div>
      </div>

      {/* Sync & Automation Info Banner */}
      <div className="mb-5 bg-card border border-border/60 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0 text-primary text-base">
            🤖
          </div>
          <div>
            <p className="font-semibold text-foreground">
              Seguimiento Inteligente: Asistente de WhatsApp + Registro Manual
            </p>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              Las consultas y turnos del <strong>Asistente Virtual de WhatsApp</strong> se registran y actualizan automáticamente en este panel. Además, tenés disponible el botón <strong>"+ Nueva Consulta / Presupuesto"</strong> para agendar manualmente los chats que entren por el <strong>otro número de la empresa</strong>, llamadas o Instagram.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <div className="flex bg-card border border-border rounded-sm p-1 gap-1 flex-shrink-0 overflow-x-auto">
          {(["todos", "nuevo", "enviado", "agendado", "rechazado"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {tab === "todos"
                ? "Todos"
                : tab === "nuevo"
                ? "Nuevos"
                : tab === "enviado"
                ? "Enviados"
                : tab === "agendado"
                ? "Agendados"
                : "No Concretados"}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por clienta, WhatsApp o servicio..."
            className="w-full bg-card border border-border rounded-sm pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Table / List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="px-4 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">
                  Fecha
                </th>
                <th className="px-4 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">
                  Clienta / Contacto
                </th>
                <th className="px-4 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">
                  Servicio / Consulta
                </th>
                <th className="px-4 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground text-right">
                  Monto Cotizado
                </th>
                <th className="px-4 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground text-center">
                  Estado
                </th>
                <th className="px-4 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hidden md:table-cell">
                  Canal
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-xs text-muted-foreground">
                    No hay consultas o presupuestos registrados en este estado. Podés hacer clic en "+ Nueva Consulta / Presupuesto" arriba.
                  </td>
                </tr>
              ) : (
                filtered.map((item, index) => {
                  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.nuevo;
                  const Icon = cfg.icon;

                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      {/* Date */}
                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-primary/70" />
                          <span>{item.date ? new Date(item.date + "T12:00:00").toLocaleDateString("es-AR") : "—"}</span>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-foreground">{item.clientName}</span>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone size={10} className="text-emerald-500" />
                            {item.clientPhone}
                          </span>
                        </div>
                      </td>

                      {/* Service / Notes */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col max-w-xs">
                          <span className="font-medium text-xs text-foreground line-clamp-1">{item.serviceName}</span>
                          {item.notes && (
                            <span className="text-[11px] text-muted-foreground line-clamp-1 italic mt-0.5">
                              {item.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount & Deposit */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-xs text-foreground">
                            ${item.amount.toLocaleString("es-AR")}
                          </span>
                          {item.deposit && item.deposit > 0 ? (
                            <span className="text-[10px] text-emerald-500 font-medium">
                              Seña: ${item.deposit.toLocaleString("es-AR")}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Status Selector */}
                      <td className="px-4 py-3.5 text-center">
                        <select
                          value={item.status}
                          onChange={e => handleStatusChange(item.id, e.target.value as Presupuesto["status"])}
                          className={`text-[11px] font-semibold px-2 py-1 rounded border ${cfg.bg} ${cfg.color} focus:outline-none cursor-pointer`}
                        >
                          <option value="nuevo">Nuevo / Pendiente</option>
                          <option value="enviado">Presupuesto Enviado</option>
                          <option value="agendado">¡Turno Agendado!</option>
                          <option value="rechazado">No Concretado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>

                      {/* Channel */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {item.channel?.toLowerCase().includes("asistente") || item.channel?.toLowerCase().includes("bot") ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-violet-500/15 border border-violet-500/30 text-violet-400">
                            🤖 Asistente Bot
                          </span>
                        ) : item.channel?.toLowerCase().includes("instagram") ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-pink-500/15 border border-pink-500/30 text-pink-400">
                            📸 Instagram
                          </span>
                        ) : item.channel?.toLowerCase().includes("presencial") ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400">
                            🏪 Presencial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            📱 {item.channel || "WhatsApp Empresa"}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Send WhatsApp */}
                          <button
                            onClick={() => handleOpenWhatsApp(item)}
                            title="Enviar cotización por WhatsApp"
                            className="inline-flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[11px] font-bold px-2 py-1 rounded transition-colors"
                          >
                            <MessageSquare size={11} />
                            <span>WhatsApp</span>
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => {
                              setEditing(item);
                              setIsModalOpen(true);
                            }}
                            className="w-7 h-7 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={12} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="w-7 h-7 inline-flex items-center justify-center rounded text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nueva / Editar Consulta */}
      <AnimatePresence>
        {isModalOpen && editing && (
          <PresupuestoModal
            initial={editing}
            services={services}
            onClose={() => {
              setIsModalOpen(false);
              setEditing(null);
            }}
            onSaved={() => {
              setIsModalOpen(false);
              setEditing(null);
              loadPresupuestos();
            }}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

interface ClientOption {
  id: string;
  name: string;
  phone: string;
}

function PresupuestoModal({
  initial,
  services,
  onClose,
  onSaved,
}: {
  initial: Presupuesto;
  services: ServiceOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Presupuesto>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");

  useEffect(() => {
    fetchAPI("/api/data/clients")
      .then(r => r.json())
      .then(d => setClients(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  // Filter clients based on client name or phone search
  const matchingClients = useMemo(() => {
    const q = (form.clientName || "").trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return clients
      .filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)))
      .slice(0, 6);
  }, [clients, form.clientName]);

  const handleSelectClient = (c: ClientOption) => {
    setForm(f => ({
      ...f,
      clientName: c.name,
      clientPhone: c.phone || f.clientPhone,
    }));
    setShowClientSuggestions(false);
  };

  const handleSelectService = (s: ServiceOption) => {
    setSelectedServiceId(s.id);
    const suggestedDeposit = Math.round(s.price * 0.5);
    setForm(f => ({
      ...f,
      serviceName: s.name,
      amount: s.price,
      deposit: f.deposit && f.deposit > 0 ? f.deposit : suggestedDeposit,
    }));
  };

  const setDepositPercent = (percent: number) => {
    const dep = Math.round((form.amount * percent) / 100);
    setForm(f => ({ ...f, deposit: dep }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName.trim() || !form.clientPhone.trim() || !form.serviceName.trim()) {
      alert("Por favor completa los campos obligatorios: Clienta, Teléfono y Servicio.");
      return;
    }

    setSaving(true);
    try {
      const isNew = !form.id;
      const url = isNew ? "/api/data/presupuestos" : `/api/data/presupuestos/${form.id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetchAPI(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Error al guardar presupuesto");
      onSaved();
    } catch (err: any) {
      alert(err.message || "Error al procesar presupuesto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-primary" />
            <h3 className="font-semibold text-foreground text-sm">
              {form.id ? "Editar Presupuesto / Consulta" : "Nueva Consulta Comercial / Presupuesto"}
            </h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Client Name & Phone with Auto-complete */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-1">
                  Clienta *
                </label>
                {clients.length > 0 && (
                  <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                    <User size={9} /> {clients.length} registradas
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={form.clientName}
                  onChange={e => {
                    const val = e.target.value;
                    setForm(f => ({ ...f, clientName: val }));
                    setShowClientSuggestions(true);
                  }}
                  onFocus={() => setShowClientSuggestions(true)}
                  placeholder="Escribí para buscar clienta..."
                  className="w-full bg-background border border-border rounded-sm pl-8 pr-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>

              {/* Client Auto-complete Dropdown */}
              {showClientSuggestions && matchingClients.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-card border border-border rounded-md shadow-xl overflow-hidden divide-y divide-border/40">
                  <div className="px-2.5 py-1 text-[9px] font-bold text-muted-foreground uppercase bg-muted/40 flex items-center justify-between">
                    <span>Clientas encontradas:</span>
                    <button
                      type="button"
                      onClick={() => setShowClientSuggestions(false)}
                      className="text-[9px] text-muted-foreground hover:text-foreground"
                    >
                      Cerrar
                    </button>
                  </div>
                  {matchingClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectClient(c)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-primary/10 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-foreground group-hover:text-primary">
                          {c.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {c.phone}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">
                WhatsApp / Teléfono *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={form.clientPhone}
                  onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
                  placeholder="Ej: 3512345678"
                  className="w-full bg-background border border-border rounded-sm pl-8 pr-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-500" />
              </div>
            </div>
          </div>

          {/* Service Quick Selector & Auto-fill */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Servicio o Tratamiento Solicitado *
              </label>
              <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                <Sparkles size={11} /> Auto-completa el monto
              </span>
            </div>

            <div className="space-y-2">
              {/* Dropdown de servicios con precio */}
              <select
                value={selectedServiceId}
                onChange={e => {
                  const s = services.find(srv => srv.id === e.target.value);
                  if (s) handleSelectService(s);
                }}
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-medium"
              >
                <option value="">-- Buscar / Elegir servicio del salón (auto-carga precio) --</option>
                {services
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} — ${s.price.toLocaleString("es-AR")}
                    </option>
                  ))}
              </select>

              {/* Input libre para customizar o añadir extras */}
              <input
                type="text"
                required
                value={form.serviceName}
                onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))}
                placeholder="O editá el detalle (Ej: Kapping Gel con Francesita + Strass)"
                className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />

              {/* Botones rápidos de 1 clic para servicios populares */}
              {services.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground flex-shrink-0">
                    Frecuentes:
                  </span>
                  {services.slice(0, 6).map(s => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => handleSelectService(s)}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded border whitespace-nowrap transition-all flex items-center gap-1 ${
                        form.serviceName === s.name
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/40"
                      }`}
                    >
                      <span>{s.name}</span>
                      <strong className="text-foreground font-semibold">${s.price.toLocaleString("es-AR")}</strong>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Monto Presupuestado y Seña */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                  Monto Presupuestado ($) *
                </label>
                {form.amount > 0 && (
                  <span className="text-[10px] text-emerald-500 font-bold">✓ Precio cargado</span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) || 0 }))}
                  className="w-full bg-background border border-border rounded-sm pl-7 pr-3 py-2 text-sm text-foreground font-bold focus:border-primary focus:outline-none"
                />
                <DollarSign size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                  Seña Sugerida ($)
                </label>
                {form.amount > 0 && (
                  <div className="flex items-center gap-1 text-[9px]">
                    <button
                      type="button"
                      onClick={() => setDepositPercent(50)}
                      className="px-1.5 py-0.2 rounded bg-muted/60 hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground font-medium"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositPercent(30)}
                      className="px-1.5 py-0.2 rounded bg-muted/60 hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground font-medium"
                    >
                      30%
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositPercent(0)}
                      className="px-1.5 py-0.2 rounded bg-muted/60 hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground font-medium"
                    >
                      $0
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.deposit || 0}
                  onChange={e => setForm(f => ({ ...f, deposit: Number(e.target.value) || 0 }))}
                  placeholder="Ej: 5000"
                  className="w-full bg-background border border-border rounded-sm pl-7 pr-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-semibold"
                />
                <DollarSign size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-500" />
              </div>
            </div>
          </div>

          {/* Canal y Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">
                Canal de Consulta
              </label>
              <select
                value={form.channel || "WhatsApp Empresa (Manual)"}
                onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="WhatsApp Empresa (Manual)">WhatsApp Empresa (Manual / Otro Número)</option>
                <option value="WhatsApp Asistente (Bot)">WhatsApp Asistente (Bot)</option>
                <option value="Instagram Direct">Instagram Direct</option>
                <option value="Presencial (Local)">Presencial (Local)</option>
                <option value="Llamada Telefónica">Llamada Telefónica</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">
                Estado Comercial
              </label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as Presupuesto["status"] }))}
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="nuevo">Nuevo / Pendiente</option>
                <option value="enviado">Presupuesto Enviado</option>
                <option value="agendado">¡Turno Agendado!</option>
                <option value="rechazado">No Concretado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">
              Notas / Especificaciones de la clienta
            </label>
            <textarea
              rows={2}
              value={form.notes || ""}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Ej: Quiere diseño francés con strass, prefiere horario de tarde los sábados..."
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-sm border border-border text-xs text-muted-foreground hover:bg-muted/50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-sm bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              Guardar Presupuesto
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
