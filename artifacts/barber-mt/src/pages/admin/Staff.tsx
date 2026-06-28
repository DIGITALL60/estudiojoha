import { fetchAPI } from "@/lib/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Star, UserCog, Mail, Phone, Clock, X, Check, Save, AlertCircle, Percent, Trash2 } from "lucide-react";
import AdminLayout from "./AdminLayout";

interface Professional {
  id: string;
  name: string;
  role: string;
  username: string | null;
  phone: string | null;
  color: string;
  initial: string;
  commissionRate?: number;
}

const COLOR_OPTIONS = [
  "#7c3aed", "#db2777", "#0891b2", "#d97706",
  "#16a34a", "#dc2626", "#ea580c", "#0d9488",
];

function EditModal({
  member,
  categories,
  onClose,
  onSave,
}: {
  member: Professional;
  categories: string[];
  onClose: () => void;
  onSave: (updated: Professional, isNew: boolean) => void;
}) {
  const [form, setForm] = useState({ 
    password: "", 
    ...member, 
    commissionRate: member.commissionRate ?? 0 
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.name.trim()) { setError("El nombre es obligatorio"); return; }
    
    const isNew = !member.id;
    if (isNew && !form.role?.trim()) { setError("El rol es obligatorio para el inicio de sesión"); return; }
    if (isNew && !form.password?.trim()) { setError("La contraseña es obligatoria para un nuevo usuario"); return; }

    setSaving(true);
    setError("");
    try {
      const url = isNew ? "/api/data/professionals" : `/api/data/professionals/${member.id}`;
      const method = isNew ? "POST" : "PATCH";

      const payload: any = {
        name: form.name,
        role: form.role,
        username: form.username,
        phone: form.phone,
        color: form.color,
        initial: form.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
        commissionRate: Number(form.commissionRate) || 0,
      };

      if (form.password?.trim()) {
        payload.password = form.password;
      }

      const res = await fetchAPI(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const updated = await res.json();
      onSave(updated, isNew);
      onClose();
    } catch (err) {
      setError("No se pudo guardar. Verificá la conexión.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
        className="bg-card border border-border shadow-2xl rounded-sm w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <h3 className="text-sm font-semibold text-foreground">
            {member.id ? "Editar profesional" : "Nuevo profesional"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Avatar preview */}
          <div className="flex justify-center mb-2">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ backgroundColor: form.color + "22", border: `2px solid ${form.color}55`, color: form.color }}
            >
              {form.name.trim() ? form.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : "?"}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className="w-6 h-6 rounded-full transition-all"
                  style={{ backgroundColor: c, outline: form.color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }}
                />
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej. María Pérez"
              className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Role */}
          <div>
            <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Rol * (Filtrará los servicios que puede atender)</label>
            <div className="relative">
              <UserCog size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-background border border-border rounded-sm pl-8 pr-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary appearance-none cursor-pointer"
              >
                <option value="" disabled>Seleccioná un rol o sector</option>
                <option value="Admin">Admin</option>
                {categories.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">
              Teléfono WhatsApp
            </label>
            <div className="relative">
              <Phone size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="tel"
                placeholder="Ej: 5493510000000 (con código de país)"
                value={form.phone ?? ""}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full bg-background border border-border rounded-sm pl-8 pr-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-400">●</span>
              Al guardar el teléfono, Baileys le notificará automáticamente sus turnos
            </p>
          </div>

          {/* Username */}
          <div>
            <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Nombre de usuario * (para iniciar sesión)</label>
            <div className="relative">
              <UserCog size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="ej: guada_uñas"
                value={form.username ?? ""}
                onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/ /g, '') }))}
                className="w-full bg-background border border-border rounded-sm pl-8 pr-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Commission Rate */}
          <div>
            <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">% Comisión por turno</label>
            <div className="relative">
              <Percent size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="number"
                min={0}
                max={100}
                placeholder="Ej: 30 (para el 30%)"
                value={form.commissionRate ?? 0}
                onChange={e => setForm(f => ({ ...f, commissionRate: Number(e.target.value) }))}
                className="w-full bg-background border border-border rounded-sm pl-8 pr-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">
              Se calculará automáticamente sobre el precio de cada turno completado.
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Contraseña</label>
            <input
              type="password"
              placeholder={member.id ? "Dejar en blanco para mantener la actual" : "Mínimo 6 caracteres"}
              value={form.password ?? ""}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-sm px-3 py-2">
              <AlertCircle size={12} />
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border/40">
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <><Save size={12} className="animate-spin" /> Guardando...</> : <><Check size={12} /> {member.id ? "Guardar" : "Crear"}</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Staff() {
  const [members, setMembers] = useState<Professional[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStaffAndServices = async () => {
    try {
      const [resMembers, resServices] = await Promise.all([
        fetchAPI("/api/data/professionals"),
        fetchAPI("/api/data/services")
      ]);
      setMembers(await resMembers.json());
      setServices(await resServices.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaffAndServices(); }, []);

  const handleSaved = (updated: Professional, isNew: boolean) => {
    if (isNew) {
      setMembers(prev => [...prev, updated]);
    } else {
      setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
    }
  };

  const handleDelete = async (member: Professional) => {
    if (!window.confirm(`¿Eliminar a ${member.name} del staff? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetchAPI(`/api/data/professionals/${member.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMembers(prev => prev.filter(m => m.id !== member.id));
    } catch {
      alert("No se pudo eliminar el profesional. Verificá la conexión.");
    }
  };

  const handleNewStaff = () => {
    setEditing({
      id: "",
      name: "",
      role: "Sector Uñas",
      username: "",
      phone: "",
      color: COLOR_OPTIONS[0],
      initial: "?",
    });
  };

  return (
    <AdminLayout
      title="Staff"
      subtitle={`${members.length} profesionales`}
      actions={
        <button
          onClick={handleNewStaff}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-sm hover:bg-primary/90 transition-colors"
        >
          <Plus size={13} />
          Agregar profesional
        </button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          Cargando staff...
        </div>
      ) : members.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <UserCog size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Aún no agregaste profesionales al staff</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-card border border-border rounded-sm p-5 hover:border-primary/30 transition-colors group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: member.color + "22", border: `2px solid ${member.color}44` }}
                  >
                    <span style={{ color: member.color }}>{member.initial}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">{member.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {member.role === "Admin" && <Star size={10} className="text-primary fill-primary" />}
                      <span className="text-[10px] text-muted-foreground">{member.role}</span>
                    </div>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                  <button
                    onClick={() => setEditing(member)}
                    className="w-7 h-7 flex items-center justify-center rounded-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                    title="Editar"
                  >
                    <UserCog size={13} />
                  </button>
                  {member.role !== "Admin" && (
                    <button
                      onClick={() => handleDelete(member)}
                      className="w-7 h-7 flex items-center justify-center rounded-sm text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="space-y-1.5 pt-4 border-t border-border/40">
                {member.phone ? (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Phone size={11} />
                    <span className="text-[11px]">{member.phone}</span>
                    <span className="text-[9px] bg-emerald-400/10 border border-emerald-400/20 rounded-full px-1.5 py-0.5 ml-auto">
                      WhatsApp ✓
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditing(member)}
                    className="flex items-center gap-2 text-amber-500/70 hover:text-amber-400 transition-colors w-full"
                  >
                    <Phone size={11} />
                    <span className="text-[11px]">Agregar teléfono para notificaciones</span>
                  </button>
                )}
                {member.username && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserCog size={11} />
                    <span className="text-[11px] truncate">@{member.username}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Percent size={11} />
                  <span className="text-[11px]">Comisión: <span className="font-semibold text-foreground">{member.commissionRate ?? 0}%</span></span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editing && (
          <EditModal
            member={editing}
            categories={[...new Set(services.map(s => s.category))]}
            onClose={() => setEditing(null)}
            onSave={handleSaved}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
