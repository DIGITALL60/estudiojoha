import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  X,
  Phone,
  Cake,
  Mail,
  Calendar,
  Clock,
  User,
  DollarSign,
  FileText,
  MessageCircle,
  Copy,
  Check,
  Edit2,
  Trash2,
  Sparkles,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birthday: string | null;
  notes: string | null;
  createdAt: string | null;
}

export interface AppointmentItem {
  id: string;
  date: string;
  time: string;
  duration?: number;
  price?: number;
  status: string; // 'agendado' | 'completado' | 'cancelado' | 'ausente'
  paymentMethod?: string | null;
  notes?: string | null;
  clientId: string;
  professionalId?: string;
  serviceId?: string;
  clientName?: string;
  clientPhone?: string;
  professionalName?: string;
  professionalColor?: string;
  serviceName?: string;
}

const COLORS = ["#7c3aed", "#db2777", "#0891b2", "#d97706", "#16a34a", "#dc2626", "#ea580c", "#0d9488"];

function getInitial(name: string) {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

function getColor(id: string) {
  return COLORS[id.charCodeAt(0) % COLORS.length];
}

function cleanPhoneForWhatsApp(phone: string) {
  let d = (phone || "").replace(/\D/g, "");
  if (!d.startsWith("54") && d.length === 10) d = "549" + d;
  else if (d.startsWith("54") && !d.startsWith("549") && d.length === 12) d = "549" + d.slice(2);
  return d;
}

function formatDateAR(dateStr: string) {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatBirthdayAR(bStr: string) {
  if (!bStr) return "";
  try {
    const parts = bStr.split("-");
    if (parts.length === 3) {
      const [, m, d] = parts.map(Number);
      const date = new Date(2000, m - 1, d);
      return date.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
    }
    return bStr;
  } catch {
    return bStr;
  }
}

interface ClientHistoryModalProps {
  client: Client;
  appointments: AppointmentItem[];
  onClose: () => void;
  onEdit: () => void;
  onDelete?: () => void;
}

export default function ClientHistoryModal({
  client,
  appointments,
  onClose,
  onEdit,
  onDelete,
}: ClientHistoryModalProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);

  const color = getColor(client.id);

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(client.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Ordenar turnos de más reciente a más antiguo
  const clientAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const cmpDate = (b.date || "").localeCompare(a.date || "");
      if (cmpDate !== 0) return cmpDate;
      return (b.time || "").localeCompare(a.time || "");
    });
  }, [appointments]);

  const completedApps = clientAppointments.filter((a) => a.status === "completado");
  const scheduledApps = clientAppointments.filter((a) => a.status === "agendado");
  const cancelledApps = clientAppointments.filter((a) => a.status === "cancelado" || a.status === "ausente");
  const totalSpent = completedApps.reduce((acc, a) => acc + (a.price || 0), 0);
  const lastVisit = completedApps[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 12, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-lg sm:rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header seguro / no editable */}
        <div className="px-5 py-4 border-b border-border/80 bg-card flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-base font-bold shadow-inner"
              style={{
                backgroundColor: color + "22",
                border: `1.5px solid ${color}66`,
                color,
              }}
            >
              {getInitial(client.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-foreground truncate">
                  {client.name}
                </h2>
                <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">
                  {clientAppointments.length} turno{clientAppointments.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <Phone size={11} /> {client.phone}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 hover:bg-accent/40 px-1.5 py-0.5 rounded transition-colors"
                  title="Copiar número"
                >
                  {copiedPhone ? (
                    <>
                      <Check size={11} className="text-emerald-400" />
                      <span className="text-emerald-400">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
                <a
                  href={`https://wa.me/${cleanPhoneForWhatsApp(client.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-2 py-0.5 rounded shadow-sm transition-colors"
                  title="Abrir chat en WhatsApp"
                >
                  <MessageCircle size={11} /> WhatsApp
                </a>
                <a
                  href={`tel:${client.phone}`}
                  className="inline-flex items-center gap-1 text-[11px] bg-accent/60 hover:bg-accent text-foreground px-2 py-0.5 rounded border border-border/80 transition-colors"
                  title="Llamar"
                >
                  <Phone size={10} /> Llamar
                </a>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-sm hover:bg-accent/50 transition-colors"
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
          {/* Métricas del cliente */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-background border border-border/60 rounded-md p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Total Turnos
              </span>
              <span className="text-lg font-bold text-foreground mt-0.5 block">
                {clientAppointments.length}
              </span>
            </div>
            <div className="bg-background border border-border/60 rounded-md p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Completados
              </span>
              <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
                {completedApps.length}
              </span>
            </div>
            <div className="bg-background border border-border/60 rounded-md p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Invertido
              </span>
              <span className="text-lg font-bold text-foreground mt-0.5 block">
                ${totalSpent.toLocaleString("es-AR")}
              </span>
            </div>
            <div className="bg-background border border-border/60 rounded-md p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Última Visita
              </span>
              <span className="text-xs font-semibold text-foreground mt-1 block truncate">
                {lastVisit ? formatDateAR(lastVisit.date) : "Sin visitas"}
              </span>
            </div>
          </div>

          {/* Ficha Técnica / Observaciones (Lectura segura para no alterar fórmulas o notas) */}
          <div className="bg-primary/[0.04] border border-primary/20 rounded-md p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-primary">
                <FileText size={13} />
                <span>Ficha Técnica & Observaciones</span>
              </div>
              <span className="text-[10px] text-muted-foreground">Solo lectura</span>
            </div>
            {client.notes ? (
              <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed bg-background/50 p-2.5 rounded border border-border/30">
                {client.notes}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground italic bg-background/30 p-2 rounded">
                Sin observaciones, fórmulas de color o notas médicas registradas.
              </p>
            )}
          </div>

          {/* Datos complementarios */}
          {(client.email || client.birthday) && (
            <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground bg-background/50 border border-border/40 p-2.5 rounded-md">
              {client.email && (
                <span className="flex items-center gap-1.5">
                  <Mail size={12} className="text-muted-foreground/70" />
                  {client.email}
                </span>
              )}
              {client.birthday && (
                <span className="flex items-center gap-1.5">
                  <Cake size={12} className="text-pink-400" />
                  Cumpleaños: <strong className="text-foreground">{formatBirthdayAR(client.birthday)}</strong>
                </span>
              )}
            </div>
          )}

          {/* Historial de Turnos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <History size={14} className="text-primary" />
                <span>Historial de Turnos</span>
              </h3>
              <span className="text-[11px] text-muted-foreground">
                {clientAppointments.length} registro{clientAppointments.length !== 1 ? "s" : ""}
              </span>
            </div>

            {clientAppointments.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-border rounded-md p-6 bg-muted/10">
                <Clock size={28} className="text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs font-semibold text-foreground">Sin historial de turnos</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Este cliente aún no tiene turnos registrados en la agenda.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {clientAppointments.map((app) => {
                  const isCompleted = app.status === "completado";
                  const isScheduled = app.status === "agendado";
                  const isCancelled = app.status === "cancelado";
                  const isAbsent = app.status === "ausente";

                  return (
                    <div
                      key={app.id}
                      className="p-3.5 bg-background border border-border/70 rounded-md hover:border-primary/40 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Calendar size={12} className="text-primary" />
                            {formatDateAR(app.date)}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                            <Clock size={11} /> {app.time} hs
                          </span>
                        </div>

                        {/* Badge de estado */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isCompleted
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : isCancelled
                              ? "bg-red-500/10 text-red-400 border-red-500/30"
                              : isAbsent
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-primary/10 text-primary border-primary/30"
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>

                      {/* Servicio y profesional */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            {app.serviceName || "Servicio"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            {app.professionalName && (
                              <span className="flex items-center gap-1">
                                <User size={11} /> Atendido por:{" "}
                                <strong className="text-foreground font-medium">
                                  {app.professionalName}
                                </strong>
                              </span>
                            )}
                            {app.duration && <span>· {app.duration} min</span>}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-foreground">
                            ${(app.price ?? 0).toLocaleString("es-AR")}
                          </span>
                          {app.paymentMethod && (
                            <p className="text-[10px] text-muted-foreground">
                              {app.paymentMethod}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Notas específicas de la sesión de turno */}
                      {app.notes && (
                        <div className="text-[11px] bg-muted/40 p-2 rounded border border-border/40 text-foreground/80 mt-1">
                          <span className="font-semibold text-muted-foreground">Nota del turno: </span>
                          {app.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer con opción explícita de editar (separada y segura) */}
        <div className="px-5 py-3.5 border-t border-border bg-card flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="text-xs text-foreground hover:text-primary border border-border hover:border-primary/50 px-3.5 py-2 rounded-sm transition-colors flex items-center gap-1.5 font-medium"
              title="Modificar datos personales o notas del cliente"
            >
              <Edit2 size={13} /> Editar cliente
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-sm transition-colors flex items-center gap-1.5"
                title="Eliminar este cliente"
              >
                <Trash2 size={12} /> Eliminar
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bg-primary text-primary-foreground text-xs font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
