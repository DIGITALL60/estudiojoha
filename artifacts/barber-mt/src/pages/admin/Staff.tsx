import { fetchAPI } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
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
  baseSalary?: number;
  salesTarget?: number;
  photo?: string | null;
}

const COLOR_OPTIONS = [
  "#7c3aed", "#db2777", "#0891b2", "#d97706",
  "#16a34a", "#dc2626", "#ea580c", "#0d9488",
];

function EditModal({
  member,
  categories,
  allServices,
  assignedServiceIds: initialAssigned,
  onClose,
  onSave,
}: {
  member: Professional;
  categories: string[];
  allServices: { id: string; name: string; category: string }[];
  assignedServiceIds: string[];
  onClose: () => void;
  onSave: (updated: Professional, isNew: boolean) => void;
}) {
  const [form, setForm] = useState({ 
    password: "", 
    ...member, 
    commissionRate: member.commissionRate ?? 0,
    baseSalary: member.baseSalary ?? 0,
    salesTarget: member.salesTarget ?? 0,
    photo: member.photo ?? null
  });
  const [isAdmin, setIsAdmin] = useState(member.role?.toLowerCase() === "admin");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    if (!member.role || member.role.toLowerCase() === "admin") return [];
    return member.role.split(",").map(c => c.trim()).filter(Boolean);
  });

  const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>(initialAssigned);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      const exists = prev.includes(cat);
      return exists ? prev.filter(c => c !== cat) : [...prev, cat];
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError("El nombre es obligatorio"); return; }
    
    const isNew = !member.id;
    if (isNew && !isAdmin && selectedCategories.length === 0) {
      setError("Debés seleccionar al menos una categoría o marcar como Administradora");
      return;
    }
    if (isNew && !form.password?.trim()) { setError("La contraseña es obligatoria para un nuevo usuario"); return; }

    const finalRole = isAdmin ? "Admin" : selectedCategories.join(", ");
    if (!finalRole.trim()) {
      setError("Debés seleccionar al menos una categoría o marcar como Administradora");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const url = isNew ? "/api/data/professionals" : `/api/data/professionals/${member.id}`;
      const method = isNew ? "POST" : "PATCH";

      const payload: any = {
        name: form.name,
        role: finalRole,
        username: form.username,
        phone: form.phone,
        color: form.color,
        initial: form.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
        commissionRate: Number(form.commissionRate) || 0,
        baseSalary: Number(form.baseSalary) || 0,
        salesTarget: Number(form.salesTarget) || 0,
        photo: form.photo,
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

      // Sync service assignments (skip for Admin)
      if (!isAdmin) {
        let serviceIds = assignedServiceIds;
        if (serviceIds.length === 0 && selectedCategories.length > 0) {
          serviceIds = allServices.filter(s => selectedCategories.includes(s.category)).map(s => s.id);
        }
        await fetchAPI("/api/data/professional-services/sync", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ professionalId: updated.id, serviceIds }),
        });
      }

      onSave(updated, isNew);
      onClose();
    } catch (err) {
      setError("No se pudo guardar. Verificá la conexión.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no debe superar los 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(f => ({ ...f, photo: reader.result as string }));
    };
    reader.readAsDataURL(file);
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

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
          {/* Avatar preview */}

          <div className="flex flex-col items-center justify-center mb-2 gap-3">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden relative group"
              style={{ backgroundColor: form.color + "22", border: `2px solid ${form.color}55`, color: form.color }}
            >
              {form.photo ? (
                <img src={form.photo} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                form.name.trim() ? form.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() : "?"
              )}
              <div 
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus size={16} className="text-white" />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] uppercase font-bold tracking-wider text-primary hover:text-primary/80 transition-colors"
              >
                Cambiar foto
              </button>
              {form.photo && (
                <button
                  onClick={() => setForm(f => ({ ...f, photo: "" }))}
                  className="text-[10px] uppercase font-bold tracking-wider text-red-500 hover:text-red-400 transition-colors"
                >
                  Quitar
                </button>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
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

          {/* Role / Categories */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
                Categorías / Sectores que atiende *
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => {
                    setIsAdmin(e.target.checked);
                    if (e.target.checked) setSelectedCategories([]);
                  }}
                  className="accent-primary"
                />
                <span className="text-[11px] font-medium">Es Administradora</span>
              </label>
            </div>

            {isAdmin ? (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-sm flex items-center gap-2 text-xs text-primary">
                <Star size={13} className="fill-primary" />
                <span>Acceso administrativo total (no se le asignan turnos ni servicios de belleza).</span>
              </div>
            ) : (
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Podés elegir más de una categoría (ej: Uñas y Pies):
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {categories.map(cat => {
                    const isChecked = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`flex items-center justify-between px-3 py-2 rounded-sm text-xs font-medium border transition-all text-left ${
                          isChecked
                            ? "bg-primary/15 border-primary text-foreground shadow-xs"
                            : "bg-background border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                        }`}
                      >
                        <span className="truncate pr-1">{cat}</span>
                        <div className={`w-4 h-4 rounded-xs flex items-center justify-center border text-[10px] flex-shrink-0 ${
                          isChecked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                        }`}>
                          {isChecked && <Check size={11} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
              Al guardar el teléfono, el sistema le notificará automáticamente sus turnos
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

          {/* Base Salary */}
          <div>
            <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Sueldo fijo (Opcional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
              <input
                type="number"
                min={0}
                placeholder="Ej: 50000"
                value={form.baseSalary ?? 0}
                onChange={e => setForm(f => ({ ...f, baseSalary: Number(e.target.value) }))}
                className="w-full bg-background border border-border rounded-sm pl-8 pr-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">
              Monto fijo por mes que se suma al cálculo en la pestaña Salarios.
            </p>
          </div>

          {/* Sales Target */}
          <div>
            <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Objetivo Ventas Shop (Opcional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
              <input
                type="number"
                min={0}
                placeholder="Ej: 100000"
                value={form.salesTarget ?? 0}
                onChange={e => setForm(f => ({ ...f, salesTarget: Number(e.target.value) }))}
                className="w-full bg-background border border-border rounded-sm pl-8 pr-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">
              Meta de ventas de productos para el mes (visible en Salarios).
            </p>
          </div>

          {/* Service assignments */}
          {!isAdmin && selectedCategories.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
                  Servicios específicos que realiza
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const catServiceIds = allServices
                      .filter(s => selectedCategories.includes(s.category))
                      .map(s => s.id);
                    const allSelected = catServiceIds.every(id => assignedServiceIds.includes(id));
                    if (allSelected) {
                      setAssignedServiceIds(prev => prev.filter(id => !catServiceIds.includes(id)));
                    } else {
                      setAssignedServiceIds(prev => [...new Set([...prev, ...catServiceIds])]);
                    }
                  }}
                  className="text-[10px] text-primary hover:underline font-medium"
                >
                  {allServices.filter(s => selectedCategories.includes(s.category)).every(s => assignedServiceIds.includes(s.id))
                    ? "Desmarcar todos"
                    : "Seleccionar todos"}
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto border border-border rounded-sm p-2 space-y-1.5 scrollbar-thin bg-background/50">
                {allServices
                  .filter(s => selectedCategories.includes(s.category) || assignedServiceIds.includes(s.id))
                  .map(s => (
                    <label key={s.id} className="flex items-center justify-between gap-2 text-xs cursor-pointer hover:bg-accent/5 px-1.5 py-1 rounded">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={assignedServiceIds.includes(s.id)}
                          onChange={(e) => {
                            setAssignedServiceIds(prev =>
                              e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id)
                            );
                          }}
                          className="accent-primary flex-shrink-0"
                        />
                        <span className="text-foreground/80 truncate">{s.name}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground bg-muted/40 border border-border/50 px-1.5 py-0.5 rounded-xs flex-shrink-0">
                        {s.category}
                      </span>
                    </label>
                  ))}
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">
                Si no seleccionás ninguno específico, se asignan automáticamente todos los servicios de sus sectores ({selectedCategories.join(", ")}).
              </p>
            </div>
          )}

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
  const [professionalServices, setProfessionalServices] = useState<{ professionalId: string; serviceId: string }[]>([]);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStaffAndServices = async () => {
    try {
      const [resMembers, resServices, resLinks] = await Promise.all([
        fetchAPI("/api/data/professionals"),
        fetchAPI("/api/data/services"),
        fetchAPI("/api/data/professional-services"),
      ]);
      setMembers(await resMembers.json());
      setServices(await resServices.json());
      setProfessionalServices(await resLinks.json());
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
      role: "",
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
                    className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden"
                    style={{ backgroundColor: member.color + "22", border: `2px solid ${member.color}44` }}
                  >
                    {member.photo ? (
                      <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      <span style={{ color: member.color }}>{member.initial}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">{member.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {member.role === "Admin" ? (
                        <span className="flex items-center gap-1 text-[10px] text-primary font-medium bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-xs">
                          <Star size={10} className="fill-primary" /> Admin
                        </span>
                      ) : (
                        (member.role || "Sin categoría").split(",").map((cat, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] text-muted-foreground font-medium bg-muted/40 border border-border/60 px-1.5 py-0.5 rounded-xs"
                          >
                            {cat.trim()}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex items-center gap-1 transition-all">
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
                {(member.baseSalary ?? 0) > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-semibold text-foreground text-[10px]">$</span>
                    <span className="text-[11px]">Sueldo fijo: <span className="font-semibold text-foreground">${member.baseSalary?.toLocaleString()}</span></span>
                  </div>
                )}
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
            allServices={services}
            assignedServiceIds={professionalServices
              .filter(ps => ps.professionalId === editing.id)
              .map(ps => ps.serviceId)}
            onClose={() => setEditing(null)}
            onSave={(updated, isNew) => {
              handleSaved(updated, isNew);
              fetchStaffAndServices();
            }}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
