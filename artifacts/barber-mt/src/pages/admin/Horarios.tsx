import { fetchAPI } from "@/lib/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Plus, Trash2, AlertCircle, CalendarX, ChevronLeft, ChevronRight } from "lucide-react";
import AdminLayout from "./AdminLayout";

interface Professional { id: string; name: string; role: string; color: string; initial: string; }
interface Schedule { id: string; professionalId: string; dayOfWeek: number; startTime: string; endTime: string; }
interface BlockedDate { id: string; professionalId: string; date: string; reason: string | null; }

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const BLOCK_REASONS = ["Vacaciones", "Feriado", "Enfermedad", "Capacitación", "Personal", "Otro"];

function formatISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Horarios() {
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string>("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"horarios" | "bloqueos">("horarios");

  const [newSchedule, setNewSchedule] = useState({ dayOfWeek: "1", startTime: "09:00", endTime: "18:00" });
  const [blockReason, setBlockReason] = useState("Vacaciones");
  const [blockCustomReason, setBlockCustomReason] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedBlockDates, setSelectedBlockDates] = useState<Set<string>>(new Set());

  const isAdmin = user?.role?.toLowerCase() === "admin";
  const selectedProf = professionals.find(p => p.id === selectedProfessional);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      setUser(parsedUser);
      setSelectedProfessional(parsedUser.id);
    }
    fetchAPI("/api/data/professionals").then(r => r.json()).then(setProfessionals).catch(console.error);
  }, []);

  const loadData = () => {
    if (!selectedProfessional) return;
    setLoading(true);
    Promise.all([
      fetchAPI("/api/data/schedules").then(r => r.json()),
      fetchAPI("/api/data/blocked-dates").then(r => r.json()),
    ]).then(([sched, blocked]) => {
      setSchedules(sched.filter((s: Schedule) => s.professionalId === selectedProfessional));
      setBlockedDates(blocked.filter((b: BlockedDate) => b.professionalId === selectedProfessional));
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [selectedProfessional]);

  const handleAddSchedule = async () => {
    if (!selectedProfessional) return;
    setSaving(true);
    try {
      const res = await fetchAPI("/api/data/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professionalId: selectedProfessional,
          dayOfWeek: Number(newSchedule.dayOfWeek),
          startTime: newSchedule.startTime,
          endTime: newSchedule.endTime,
        })
      });
      if (res.ok) {
        const created = await res.json();
        setSchedules(prev => [...prev, created]);
      }
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const handleDeleteSchedule = async (id: string) => {
    await fetchAPI(`/api/data/schedules/${id}`, { method: "DELETE" });
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const handleBlockDates = async () => {
    if (selectedBlockDates.size === 0 || !selectedProfessional) return;
    setSaving(true);
    const reason = blockReason === "Otro" ? blockCustomReason : blockReason;
    let blocked = 0;
    for (const date of Array.from(selectedBlockDates)) {
      try {
        const res = await fetchAPI("/api/data/blocked-dates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ professionalId: selectedProfessional, date, reason }),
        });
        if (res.ok) {
          const created = await res.json();
          setBlockedDates(prev => [...prev, created]);
          blocked++;
        }
      } catch { /* already blocked or other error */ }
    }
    setSelectedBlockDates(new Set());
    setSaving(false);
    if (blocked > 0) loadData();
  };

  const handleUnblock = async (id: string) => {
    await fetchAPI(`/api/data/blocked-dates/${id}`, { method: "DELETE" });
    setBlockedDates(prev => prev.filter(b => b.id !== id));
  };

  // Calendar logic
  const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const lastDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // Mon-based
  const calendarDays: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i + 1))
  ];
  const blockedSet = new Set(blockedDates.map(b => b.date));

  const toggleCalendarDay = (d: Date) => {
    const iso = formatISO(d);
    if (blockedSet.has(iso)) return; // already blocked
    const next = new Set(selectedBlockDates);
    if (next.has(iso)) next.delete(iso);
    else next.add(iso);
    setSelectedBlockDates(next);
  };

  return (
    <AdminLayout title="Horarios" subtitle="Configurá turnos de trabajo y días libres">
      <div className="max-w-3xl space-y-5">
        {/* Professional selector (admin only) */}
        {isAdmin && (
          <div className="bg-card border border-border rounded-xl p-4">
            <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-2">Ver horarios de</label>
            <div className="flex flex-wrap gap-2">
              {professionals.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProfessional(p.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium border transition-all ${selectedProfessional === p.id ? "border-transparent text-white" : "border-border text-muted-foreground"}`}
                  style={selectedProfessional === p.id ? { backgroundColor: p.color } : {}}
                >
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ backgroundColor: p.color + "30", color: p.color }}>{p.initial}</span>
                  {p.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-border/50 rounded-lg p-1 w-fit">
          {([["horarios", "🕐 Horarios semanales"], ["bloqueos", "🚫 Bloquear días"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "horarios" ? (
            <motion.div key="horarios" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {/* Add schedule */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Clock size={14} className="text-primary" /> Agregar horario de trabajo
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-2">Día</label>
                    <select value={newSchedule.dayOfWeek} onChange={e => setNewSchedule(s => ({ ...s, dayOfWeek: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary">
                      {DAYS.map((day, idx) => <option key={idx} value={idx}>{day}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-2">Desde</label>
                    <input type="time" value={newSchedule.startTime} onChange={e => setNewSchedule(s => ({ ...s, startTime: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-2">Hasta</label>
                    <input type="time" value={newSchedule.endTime} onChange={e => setNewSchedule(s => ({ ...s, endTime: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary" />
                  </div>
                  <button onClick={handleAddSchedule} disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 text-xs">
                    <Plus size={13} /> {saving ? "Guardando..." : "Agregar"}
                  </button>
                </div>
              </div>

              {/* Current schedules */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Horarios configurados</h3>
                  <span className="text-[10px] text-muted-foreground">{selectedProf?.name}</span>
                </div>
                {loading ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">Cargando...</div>
                ) : schedules.length === 0 ? (
                  <div className="p-8 text-center">
                    <AlertCircle size={24} className="mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No hay horarios configurados.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Agregá al menos un día y horario para que aparezca en el sistema de reservas.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {DAYS.map((dayName, idx) => {
                      const daySchedules = schedules.filter(s => s.dayOfWeek === idx);
                      if (!daySchedules.length) return null;
                      return (
                        <div key={idx} className="flex items-center gap-4 px-5 py-3 hover:bg-accent/5">
                          <div className="w-24 flex-shrink-0">
                            <span className="text-xs font-semibold text-foreground">{dayName}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 flex-1">
                            {daySchedules.map(s => (
                              <span key={s.id} className="flex items-center gap-2 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                                {s.startTime} – {s.endTime}
                                <button onClick={() => handleDeleteSchedule(s.id)}
                                  className="text-primary/60 hover:text-red-400 transition-colors ml-1">×</button>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div key="bloqueos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {/* Calendar picker */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <CalendarX size={14} className="text-red-400" /> Seleccioná los días a bloquear
                  </h3>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}
                      className="p-1 hover:bg-accent/10 rounded"><ChevronLeft size={14} /></button>
                    <span className="text-xs font-semibold px-2 capitalize">
                      {calendarMonth.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
                    </span>
                    <button onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}
                      className="p-1 hover:bg-accent/10 rounded"><ChevronRight size={14} /></button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["L", "M", "X", "J", "V", "S", "D"].map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((d, i) => {
                    if (!d) return <div key={i} />;
                    const iso = formatISO(d);
                    const isBlocked = blockedSet.has(iso);
                    const isSelected = selectedBlockDates.has(iso);
                    const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));
                    return (
                      <button key={i} onClick={() => !isPast && toggleCalendarDay(d)} disabled={isPast}
                        className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all font-medium
                          ${isPast ? "opacity-20 cursor-not-allowed" : "cursor-pointer"}
                          ${isBlocked ? "bg-red-500/20 text-red-400 border border-red-500/30" : ""}
                          ${isSelected ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 scale-105" : ""}
                          ${!isBlocked && !isSelected && !isPast ? "hover:bg-accent/10 text-foreground" : ""}`}>
                        {d.getDate()}
                        {isBlocked && <span className="absolute text-[6px] top-0.5 right-0.5">🚫</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/30">
                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" /> Ya bloqueado
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" /> Seleccionado
                  </span>
                </div>
              </div>

              {/* Reason + confirm */}
              {selectedBlockDates.size > 0 && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-400 mb-3">
                    {selectedBlockDates.size} día{selectedBlockDates.size > 1 ? "s" : ""} seleccionado{selectedBlockDates.size > 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Motivo</label>
                      <select value={blockReason} onChange={e => setBlockReason(e.target.value)}
                        className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs">
                        {BLOCK_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    {blockReason === "Otro" && (
                      <div className="flex-1 min-w-[140px]">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Describí el motivo</label>
                        <input value={blockCustomReason} onChange={e => setBlockCustomReason(e.target.value)}
                          placeholder="Ej: Cumpleaños" className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs" />
                      </div>
                    )}
                    <button onClick={handleBlockDates} disabled={saving}
                      className="bg-red-500 text-white text-xs font-semibold px-5 py-2 rounded-lg hover:bg-red-500/90 disabled:opacity-50 flex items-center gap-2">
                      <CalendarX size={12} /> {saving ? "Bloqueando..." : "Bloquear días"}
                    </button>
                    <button onClick={() => setSelectedBlockDates(new Set())}
                      className="text-xs text-muted-foreground hover:text-foreground px-3 py-2">Cancelar</button>
                  </div>
                </motion.div>
              )}

              {/* Blocked dates list */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border/50 bg-muted/20">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Días bloqueados</h3>
                </div>
                {blockedDates.length === 0 ? (
                  <div className="p-8 text-center">
                    <CalendarX size={24} className="mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">No hay días bloqueados para {selectedProf?.name || "esta profesional"}.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {[...blockedDates].sort((a, b) => a.date.localeCompare(b.date)).map(b => {
                      const d = new Date(b.date + "T12:00:00");
                      const isPast = b.date < new Date().toISOString().split("T")[0];
                      return (
                        <div key={b.id} className={`flex items-center justify-between px-5 py-3 hover:bg-accent/5 ${isPast ? "opacity-40" : ""}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-500/10 rounded-lg flex flex-col items-center justify-center">
                              <span className="text-[10px] text-muted-foreground uppercase">{DAYS_SHORT[d.getDay()]}</span>
                              <span className="text-sm font-bold text-red-400">{d.getDate()}</span>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-foreground">
                                {d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                              </p>
                              {b.reason && <p className="text-[10px] text-muted-foreground">{b.reason}</p>}
                            </div>
                          </div>
                          <button onClick={() => handleUnblock(b.id)}
                            className="text-xs text-muted-foreground hover:text-red-400 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-400/10 transition-colors">
                            <Trash2 size={12} /> Quitar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
