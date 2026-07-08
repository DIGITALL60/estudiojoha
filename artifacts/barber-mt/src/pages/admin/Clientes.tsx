import { fetchAPI } from "@/lib/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, X, ChevronRight, Edit2, Download, Phone, Cake } from "lucide-react";
import AdminLayout from "./AdminLayout";

const COLORS = ["#7c3aed","#db2777","#0891b2","#d97706","#16a34a","#dc2626","#ea580c","#0d9488"];

const filters = [
  { id: "todos", label: "Todos" },
  { id: "cumple", label: "Cumple este mes" },
  { id: "nuevos", label: "Nuevos (30 días)" },
  { id: "inactivos", label: "Inactivos (90+)" },
];

interface Client {
  id: string; name: string; phone: string;
  email: string | null; birthday: string | null; notes: string | null;
  createdAt: string | null;
}

function ClientModal({ client, appointments, onClose, onSaved }: { client?: Client | null; appointments: {date: string; status: string; serviceName: string; professionalName: string}[]; onClose: () => void; onSaved: (c: Client) => void }) {
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
    if (!form.name.trim() || !form.phone.trim()) { setError("Nombre y teléfono son obligatorios"); return; }
    setSaving(true); setError("");
    try {
      const isEdit = !!client;
      const res = await fetchAPI(isEdit ? `/api/data/clients/${client!.id}` : "/api/data/clients", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      onSaved(saved);
      onClose();
    } catch {
      setError("Error al guardar. Verificá la conexión.");
    } finally { setSaving(false); }
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

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground px-4 py-2">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="bg-primary text-primary-foreground text-xs font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 disabled:opacity-50">
            {saving ? "Guardando..." : client ? "Guardar cambios" : "Crear cliente"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Clientes() {
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<{clientId: string; date: string; status: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

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

  const now = new Date();
  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email ?? "").includes(q);
    if (!matchSearch) return false;
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
      // Find last completed appointment for this client
      const clientApps = appointments
        .filter(a => a.clientId === c.id && a.status === "completado")
        .sort((a, b) => b.date.localeCompare(a.date));
      if (clientApps.length === 0) return true; // never visited = inactivo
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
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Cargando clientes...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {search ? "No se encontraron clientes" : "Aún no hay clientes. ¡Creá el primero!"}
          </div>
        ) : (
          <motion.div layout>
            {filtered.map((client, i) => {
              const color = getColor(client.id);
              return (
                <motion.div key={client.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-4 px-4 py-3.5 border-b border-border/40 last:border-0 hover:bg-accent/5 group">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                    style={{ backgroundColor: color + "22", border: `1px solid ${color}55`, color }}>
                    {getInitial(client.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{client.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} />{client.phone}</span>
                      {client.birthday && <span className="text-xs text-muted-foreground flex items-center gap-1"><Cake size={10} />{client.birthday}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditClient(client); setShowModal(true); }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border/60 px-2.5 py-1.5 rounded-sm hover:text-primary hover:border-primary/50">
                      <Edit2 size={11} /> Editar
                    </button>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <ClientModal 
            client={editClient} 
            appointments={editClient ? appointments.filter(a => a.clientId === editClient.id).sort((a,b) => b.date.localeCompare(a.date)) : []}
            onClose={() => { setShowModal(false); setEditClient(null); }} 
            onSaved={handleSaved} 
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
