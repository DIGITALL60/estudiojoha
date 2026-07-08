import { useState, useEffect } from "react";
import { X, Calendar, Clock, User, Trash2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { fetchAPI } from "@/lib/api";

import { fetchPublicInfo, whatsappUrl } from "@/lib/publicInfo";

interface Appointment {
  id: string;
  date: string;
  time: string;
  status: string;
  serviceName: string;
  professionalName: string;
}

export default function MisTurnosModal({ onClose }: { onClose: () => void }) {
  const [publicInfo, setPublicInfo] = useState<any>(null);
  
  useEffect(() => {
    fetchPublicInfo().then(setPublicInfo).catch(() => {});
  }, []);
  const [phone, setPhone] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [canceling, setCanceling] = useState<string | null>(null);

  const search = async () => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) {
      setError("Ingresá un teléfono válido");
      return;
    }
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const res = await fetchAPI(`/api/bookings/client/${encodeURIComponent(clean)}`);
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch {
      setError("Error al buscar turnos");
    } finally {
      setLoading(false);
    }
  };

  const handleReprogram = (app: Appointment) => {
    const phone = publicInfo?.settings?.business_phone || "";
    const customLink = publicInfo?.settings?.whatsapp_link || "";
    const baseWa = whatsappUrl(phone, customLink);
    const text = encodeURIComponent(`Hola! Necesito reprogramar mi turno de ${app.serviceName} del día ${app.date} a las ${app.time}hs.`);
    
    // Si ya es un enlace wa.me, agregar el texto
    if (baseWa.includes("wa.me") || baseWa.includes("api.whatsapp.com")) {
      window.open(`${baseWa}${baseWa.includes('?') ? '&' : '?'}text=${text}`, "_blank");
    } else {
      alert("Comunicate por WhatsApp para reprogramar.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }}
        className="bg-card border border-border rounded-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <h2 className="text-sm font-semibold text-foreground">Mis turnos</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <p className="text-xs text-muted-foreground">Ingresá el teléfono con el que reservaste para ver tus próximos turnos.</p>
          <div className="flex gap-2">
            <input
              type="tel"
              placeholder="Ej: 351 000 0000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
            <button
              onClick={search}
              disabled={loading}
              className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : "Buscar"}
            </button>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {searched && !loading && appointments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">No tenés turnos próximos con ese teléfono.</p>
          )}

          <div className="space-y-3">
            {appointments.map(app => (
              <div key={app.id} className="border border-border/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Calendar size={14} className="text-primary" />
                  {app.date} · {app.time}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock size={12} /> {app.serviceName}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User size={12} /> {app.professionalName}
                </div>
                <button
                  onClick={() => handleReprogram(app)}
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 px-3 py-2 rounded-md mt-3 w-full transition-colors"
                >
                  <Calendar size={12} />
                  Reprogramar Turno
                </button>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
