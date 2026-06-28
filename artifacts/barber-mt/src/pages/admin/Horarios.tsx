import { fetchAPI } from "@/lib/api";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Plus, Save, Trash2, AlertCircle } from "lucide-react";
import AdminLayout from "./AdminLayout";

interface Professional {
  id: string;
  name: string;
  role: string;
}

interface Schedule {
  id: string;
  professionalId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function Horarios() {
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string>("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [newSchedule, setNewSchedule] = useState({
    dayOfWeek: "1",
    startTime: "09:00",
    endTime: "18:00"
  });

  const isAdmin = user?.role?.toLowerCase() === "admin";

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      setUser(parsedUser);
      setSelectedProfessional(parsedUser.id);
    }
    
    // Fetch professionals for dropdown
    fetchAPI("/api/data/professionals")
      .then(r => r.json())
      .then(setProfessionals)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedProfessional) return;
    setLoading(true);
    fetchAPI("/api/data/schedules")
      .then(r => r.json())
      .then(data => {
        setSchedules(data.filter((s: Schedule) => s.professionalId === selectedProfessional));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedProfessional]);

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
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await fetchAPI(`/api/data/schedules/${id}`, { method: "DELETE" });
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminLayout
      title="Mis Horarios"
      subtitle="Configurá tus días y horas de trabajo"
    >
      <div className="max-w-3xl space-y-6">
        {isAdmin && (
          <div className="bg-card border border-border p-5 rounded-sm">
            <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-2">
              Ver horarios de
            </label>
            <select 
              value={selectedProfessional}
              onChange={(e) => setSelectedProfessional(e.target.value)}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              {professionals.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
              ))}
            </select>
          </div>
        )}

        <div className="bg-card border border-border p-5 rounded-sm">
          <h3 className="text-sm font-semibold mb-4">Agregar nuevo horario</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-2">Día</label>
              <select
                value={newSchedule.dayOfWeek}
                onChange={e => setNewSchedule(s => ({ ...s, dayOfWeek: e.target.value }))}
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-primary"
              >
                {DAYS.map((day, idx) => (
                  <option key={idx} value={idx}>{day}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-2">Desde</label>
              <input
                type="time"
                value={newSchedule.startTime}
                onChange={e => setNewSchedule(s => ({ ...s, startTime: e.target.value }))}
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-2">Hasta</label>
              <input
                type="time"
                value={newSchedule.endTime}
                onChange={e => setNewSchedule(s => ({ ...s, endTime: e.target.value }))}
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={handleAddSchedule}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-sm hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus size={14} /> {saving ? "Agregando..." : "Agregar"}
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/20">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock size={16} className="text-primary" /> Horarios configurados
            </h3>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Cargando horarios...</div>
          ) : schedules.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle size={24} className="mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No hay horarios configurados para este profesional.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {schedules.map(schedule => (
                <div key={schedule.id} className="flex items-center justify-between p-4 hover:bg-accent/5">
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium">
                      {DAYS[schedule.dayOfWeek]}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {schedule.startTime} - {schedule.endTime}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSchedule(schedule.id)}
                    className="text-red-400 hover:text-red-500 hover:bg-red-400/10 p-2 rounded-sm transition-colors"
                    title="Eliminar horario"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
