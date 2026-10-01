import { fetchAPI } from "@/lib/api";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, ChevronRight, Edit2, Download, Phone, Cake, Trash2, AlertTriangle } from "lucide-react";
import AdminLayout from "./AdminLayout";
import ClientHistoryModal, { AppointmentItem } from "./ClientHistoryModal";

const COLORS = ["#7c3aed","#db2777","#0891b2","#d97706","#16a34a","#dc2626","#ea580c","#0d9488"];

const filters = [
  { id: "todos", label: "Todos" },
  { id: "duplicados", label: "Duplicados" },
  { id: "cumple", label: "Cumple este mes" },
  { id: "nuevos", label: "Nuevos (30 días)" },
  { id: "inactivos", label: "Inactivos (90+)" },
];

interface Client {
  id: string; name: string; phone: string;
  email: string | null; birthday: string | null; notes: string | null;
  createdAt: string | null;
}

function ClientModal({
  client,
  appointments,
  onClose,
  onSaved,
  onDelete,
}: {
  client?: Client | null;
  appointments: AppointmentItem[];
  onClose: () => void;
  onSaved: (c: Client) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState({
    name: client?.name ?? "",
    phone: client?.phone ?? "",
    email: client?.email ?? "",
    birthday: client?.birthday ?? "",
    notes: client?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Nombre y teléfono son obligatorios");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const isEdit = !!client;
      const res = await fetchAPI(isEdit ? `/api/data/clients/${client!.id}` : "/api/data/clients", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al guardar los datos del cliente.");
      }
      const saved = await res.json();
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar. Verificá la conexión.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="bg-card border border-border rounded-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-sm font-semibold text-foreground">{client ? "Editar cliente" : "Nuevo cliente"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-foreground border-b border-border/50 pb-2">Datos Personales</h3>
              {[
                { label: "Nombre completo *", key: "name", type: "text", placeholder: "Ej. María Rodríguez" },
                { label: "Teléfono *", key: "phone", type: "tel", placeholder: "+54 9 351 000 0000" },
                { label: "Email", key: "email", type: "email", placeholder: "correo@ejemplo.com" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5">{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary" />
                </div>
              ))}
              <div>
                <label className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5">Cumpleaños</label>
                <input type="date" value={form.birthday} onChange={e => setForm(p => ({ ...p, birthday: e.target.value }))}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary" />
              </div>
            </div>
            
            <div className="space-y-4 h-full flex flex-col">
              <h3 className="text-xs font-bold text-foreground border-b border-border/50 pb-2">Ficha y Observaciones</h3>
              <div className="flex-1 flex flex-col min-h-[150px]">
                <label className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5">Notas / Historial Médico / Preferencias</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Alergias, fórmulas de coloración, preferencias de servicio, preguntas frecuentes..."
                  className="w-full flex-1 bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary resize-none min-h-[120px]" />
              </div>
            </div>
          </div>

          {client && appointments.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border/50">
              <h3 className="text-xs font-bold text-foreground mb-3">Historial de Turnos Recientes</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                {appointments.slice(0, 10).map((app, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-background border border-border/50 rounded-sm text-xs">
                    <div>
                      <span className="font-semibold text-foreground">{app.date}</span>
                      <span className="text-muted-foreground ml-2">{app.serviceName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground/70">{app.professionalName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${app.status === 'completado' ? 'bg-emerald-500/10 text-emerald-500' : app.status === 'cancelado' ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary'}`}>
                        {app.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-sm flex items-start gap-2 text-xs text-red-400">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border">
          {client && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete();
              }}
              className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-sm transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={13} /> Eliminar cliente
            </button>
          ) : <div />}
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground px-4 py-2">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="bg-primary text-primary-foreground text-xs font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 disabled:opacity-50">
              {saving ? "Guardando..." : client ? "Guardar cambios" : "Crear cliente"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DeleteConfirmModal({
  client,
  appointmentsCount,
  deleting,
  onClose,
  onConfirm,
}: {
  client: Client;
  appointmentsCount: number;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="bg-card border border-red-500/30 rounded-sm w-full max-w-md p-5 space-y-4 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0 text-red-400">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">¿Eliminar cliente?</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Estás a punto de eliminar permanentemente a <strong className="text-foreground">{client.name}</strong> ({client.phone}).
            </p>
          </div>
        </div>

        {appointmentsCount > 0 ? (
          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-sm text-xs text-amber-300">
            ⚠️ <strong>Atención:</strong> Este cliente tiene <strong>{appointmentsCount}</strong> turno{appointmentsCount > 1 ? "s" : ""} registrado{appointmentsCount > 1 ? "s" : ""}. Al eliminarlo, también se eliminarán sus turnos asociados para mantener la base de datos consistente.
          </div>
        ) : (
          <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-sm border border-border/50">
            Esta acción no se puede deshacer. Los datos del cliente se borrarán permanentemente.
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="text-xs text-muted-foreground hover:text-foreground px-4 py-2 border border-border rounded-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 size={13} />
            {deleting ? "Eliminando..." : "Sí, eliminar cliente"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Clientes() {
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClients = async () => {
    try {
      const [clientsRes, appsRes] = await Promise.all([
        fetchAPI("/api/data/clients"),
        fetchAPI("/api/data/appointments"),
      ]);
      const clientsData = await clientsRes.json();
      const appsData = await appsRes.json();
      setClients(clientsData);
      setAppointments(appsData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSaved = (saved: Client) => {
    setClients(prev => {
      const exists = prev.find(c => c.id === saved.id);
      if (exists) return prev.map(c => c.id === saved.id ? saved : c);
      return [saved, ...prev];
    });
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    setDeleting(true);
    try {
      const res = await fetchAPI(`/api/data/clients/${clientToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "No se pudo eliminar el cliente");
      }
      setClients(prev => prev.filter(c => c.id !== clientToDelete.id));
      setAppointments(prev => prev.filter(a => a.clientId !== clientToDelete.id));
      setClientToDelete(null);
    } catch (err: any) {
      alert(err.message || "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  // Helper para normalizar dígitos telefónicos y detectar duplicados
  const cleanPhoneDigits = (p: string) => {
    let d = (p || "").replace(/\D/g, "");
    if (d.startsWith("549")) d = d.slice(3);
    else if (d.startsWith("54")) d = d.slice(2);
    if (d.startsWith("0")) d = d.slice(1);
    if (d.length === 12 && d.slice(4, 6) === "15") d = d.slice(0, 4) + d.slice(6);
    return d.slice(-8);
  };

  const duplicateMap = useMemo(() => {
    const counts = new Map<string, number>();
    clients.forEach(c => {
      const key = cleanPhoneDigits(c.phone);
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [clients]);

  const duplicateCount = useMemo(() => {
    return clients.filter(c => (duplicateMap.get(cleanPhoneDigits(c.phone)) || 0) > 1).length;
  }, [clients, duplicateMap]);

  const now = new Date();
  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email ?? "").includes(q);
    if (!matchSearch) return false;

    if (activeFilter === "duplicados") {
      const key = cleanPhoneDigits(c.phone);
      return (duplicateMap.get(key) || 0) > 1;
    }
    if (activeFilter === "cumple") {
      if (!c.birthday) return false;
      const bMonth = new Date(c.birthday).getUTCMonth();
      return bMonth === now.getMonth();
    }
    if (activeFilter === "nuevos") {
      if (!c.createdAt) return false;
      const diff = (now.getTime() - new Date(c.createdAt).getTime()) / 86400000;
      return diff <= 30;
    }
    if (activeFilter === "inactivos") {
      const clientApps = appointments
        .filter(a => a.clientId === c.id && a.status === "completado")
        .sort((a, b) => b.date.localeCompare(a.date));
      if (clientApps.length === 0) return true;
      const lastVisit = new Date(clientApps[0].date + "T00:00:00");
      const daysSince = (now.getTime() - lastVisit.getTime()) / 86400000;
      return daysSince >= 90;
    }
    return true;
  });

  const getInitial = (name: string) => name.trim()[0]?.toUpperCase() ?? "?";
  const getColor = (id: string) => COLORS[id.charCodeAt(0) % COLORS.length];

  return (
    <AdminLayout title="Clientes" subtitle={`${clients.length} clientes en tu base`}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const csv = ["Nombre,Teléfono,Email,Cumpleaños", ...clients.map(c => `${c.name},${c.phone},${c.email ?? ""},${c.birthday ?? ""}`)].join("\n");
              const a = document.createElement("a"); a.href = "data:text/csv," + encodeURIComponent(csv);
              a.download = "clientes.csv"; a.click();
            }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border px-3 py-2 rounded-sm hover:text-foreground hover:border-primary/50 transition-all">
            <Download size={12} /> Exportar
          </button>
          <button onClick={() => { setEditClient(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-sm hover:bg-primary/90 transition-colors">
            <Plus size={13} /> Nuevo cliente
          </button>
        </div>
      }>
      {/* Search */}
      <div className="relative mb-4">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email..."
          className="w-full bg-card border border-border rounded-sm pl-9 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {filters.map(f => (
          <button key={f.id} onClick={() => setActiveFilter(f.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border ${
              activeFilter === f.id ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
            {f.label}
            {f.id === "todos" && <span className="text-[9px] bg-primary/20 text-primary px-1 rounded-full font-bold">{clients.length}</span>}
            {f.id === "duplicados" && duplicateCount > 0 && (
              <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded-full font-bold">
                {duplicateCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Cargando clientes...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {activeFilter === "duplicados"
              ? "¡Excelente! No hay clientes con números telefónicos duplicados."
              : search
              ? "No se encontraron clientes"
              : "Aún no hay clientes. ¡Creá el primero!"}
          </div>
        ) : (
          <motion.div layout>
            {filtered.map((client, i) => {
              const color = getColor(client.id);
              const isDuplicate = (duplicateMap.get(cleanPhoneDigits(client.phone)) || 0) > 1;
              const clientApps = appointments.filter(a => a.clientId === client.id);
              const appsCount = clientApps.length;

              return (
                <motion.div key={client.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setHistoryClient(client)}
                  className={`flex items-center gap-4 px-4 py-3.5 border-b border-border/40 last:border-0 hover:bg-accent/10 cursor-pointer group transition-colors ${isDuplicate ? 'bg-amber-500/[0.03]' : ''}`}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold shadow-sm"
                    style={{ backgroundColor: color + "22", border: `1px solid ${color}55`, color }}>
                    {getInitial(client.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {client.name}
                      </p>
                      {appsCount > 0 && (
                        <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.2 rounded-full font-medium">
                          {appsCount} turno{appsCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {isDuplicate && (
                        <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <AlertTriangle size={10} /> Teléfono duplicado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} />{client.phone}</span>
                      {client.birthday && <span className="text-xs text-muted-foreground flex items-center gap-1"><Cake size={10} />{client.birthday}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditClient(client);
                        setShowModal(true);
                      }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border/60 px-2.5 py-1.5 rounded-sm hover:text-primary hover:border-primary/50 transition-colors"
                      title="Editar datos del cliente"
                    >
                      <Edit2 size={11} /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClientToDelete(client);
                      }}
                      className="flex items-center gap-1 text-xs text-red-400 border border-red-500/20 px-2.5 py-1.5 rounded-sm hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/40 transition-colors"
                      title="Eliminar cliente"
                    >
                      <Trash2 size={11} /> Eliminar
                    </button>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {historyClient && (
          <ClientHistoryModal
            client={historyClient}
            appointments={appointments.filter(a => a.clientId === historyClient.id)}
            onClose={() => setHistoryClient(null)}
            onEdit={() => {
              const c = historyClient;
              setHistoryClient(null);
              setEditClient(c);
              setShowModal(true);
            }}
            onDelete={() => {
              const c = historyClient;
              setHistoryClient(null);
              setClientToDelete(c);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <ClientModal 
            client={editClient} 
            appointments={editClient ? appointments.filter(a => a.clientId === editClient.id).sort((a,b) => b.date.localeCompare(a.date)) : []}
            onClose={() => { setShowModal(false); setEditClient(null); }} 
            onSaved={handleSaved}
            onDelete={editClient ? () => setClientToDelete(editClient) : undefined}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {clientToDelete && (
          <DeleteConfirmModal
            client={clientToDelete}
            appointmentsCount={appointments.filter(a => a.clientId === clientToDelete.id).length}
            deleting={deleting}
            onClose={() => setClientToDelete(null)}
            onConfirm={handleConfirmDelete}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
