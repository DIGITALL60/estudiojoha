import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Users, Clock, Send, CheckSquare } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { fetchAPI } from "@/lib/api";

const messageTemplate = `Hola {nombre} 👋

Hace un tiempo que no te vemos en Estudio Joha Molinero y te extrañamos 💜

¿Querés retomar? Reservá tu turno con un *10% de descuento* usando el código:

✨ *{codigo}* ✨

📲 Reservar: https://wa.link/pga9u0

¡Te esperamos!`;

export default function Reactivacion() {
  const [clients, setClients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState("30d");

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsRes, appsRes] = await Promise.all([
        fetchAPI("/api/data/clients").then((r) => r.json()),
        fetchAPI("/api/data/appointments").then((r) => r.json()),
      ]);
      setClients(clientsRes);
      setAppointments(appsRes);
    } catch (err) {
      console.error("Error loading reactivacion data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const inactiveClients = useMemo(() => {
    const now = new Date();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    const res = {
      "90d": [] as any[],
      "60d": [] as any[],
      "30d": [] as any[],
    };

    clients.forEach((c) => {
      const clientApps = appointments.filter((a) => a.clientId === c.id && a.status === "completado");

      if (clientApps.length === 0) {
        const createdDate = c.createdAt ? new Date(c.createdAt) : new Date();
        const diffDays = (now.getTime() - createdDate.getTime()) / MS_PER_DAY;

        if (diffDays >= 90) {
          res["90d"].push(c);
        } else if (diffDays >= 60) {
          res["60d"].push(c);
        } else if (diffDays >= 30) {
          res["30d"].push(c);
        }
        return;
      }

      // Find last appointment date
      const latestDate = clientApps.reduce((latest, app) => {
        const appDate = new Date(app.date + "T" + (app.time || "00:00"));
        return appDate > latest ? appDate : latest;
      }, new Date(0));

      const diffDays = (now.getTime() - latestDate.getTime()) / MS_PER_DAY;

      if (diffDays >= 90) {
        res["90d"].push(c);
      } else if (diffDays >= 60) {
        res["60d"].push(c);
      } else if (diffDays >= 30) {
        res["30d"].push(c);
      }
    });

    return res;
  }, [clients, appointments]);

  const segments = [
    { id: "90d", label: "Sin visitas 90+ días", count: inactiveClients["90d"].length, color: "#f87171" },
    { id: "60d", label: "Sin visitas 60+ días", count: inactiveClients["60d"].length, color: "#fb923c" },
    { id: "30d", label: "Sin visitas 30+ días", count: inactiveClients["30d"].length, color: "#facc15" },
  ];

  const currentSegmentClients = useMemo(() => {
    return inactiveClients[selectedSegment as keyof typeof inactiveClients] || [];
  }, [inactiveClients, selectedSegment]);

  const [showModal, setShowModal] = useState(false);
  const [discount, setDiscount] = useState(10);
  const [validity, setValidity] = useState(7);
  const [customTemplate, setCustomTemplate] = useState(messageTemplate);
  const [sendingStatus, setSendingStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [sendResult, setSendResult] = useState<{sent: number, failed: number} | null>(null);

  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // When segment changes, pre-select all valid clients
    const withPhone = currentSegmentClients.filter(c => c.phone).map(c => c.id as string);
    setSelectedClientIds(new Set(withPhone));
  }, [currentSegmentClients]);

  const handleLaunchCampaign = () => {
    setShowModal(true);
    setSendingStatus("idle");
    setSendResult(null);
  };

  const generateMessageText = (clientName: string) => {
    const code = `VOLVISTE-${discount}OFF`;
    return customTemplate
      .replace(/{nombre}/g, clientName)
      .replace(/{codigo}/g, code);
  };

  const generateWhatsAppLink = (clientName: string, clientPhone: string) => {
    if (!clientPhone) return "#";
    let cleanPhone = clientPhone.replace(/\D/g, "");
    if (cleanPhone.length === 10) cleanPhone = "549" + cleanPhone;
    const text = generateMessageText(clientName);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const handleBulkSend = async () => {
    setSendingStatus("sending");
    
    const finalClients = currentSegmentClients.filter(c => selectedClientIds.has(c.id));

    const messages = finalClients.map(c => ({
      phone: c.phone,
      message: generateMessageText(c.name)
    }));

    const codeToCreate = `VOLVISTE-${discount}OFF`;

    try {
      // 1. Create voucher in backend
      await fetchAPI("/api/vouchers/bulk-create", {
        method: "POST",
        body: JSON.stringify({ 
          codes: [codeToCreate], 
          discountType: "percent", 
          discountValue: discount 
        })
      });

      // 2. Send messages
      const res = await fetchAPI("/api/whatsapp/send-bulk", {
        method: "POST",
        body: JSON.stringify({ messages })
      });
      const data = await res.json();
      if (data.success) {
        setSendingStatus("done");
        setSendResult({ sent: data.sent, failed: data.failed });
      } else {
        setSendingStatus("error");
      }
    } catch (e) {
      setSendingStatus("error");
    }
  };

  const clientsWithPhoneCount = currentSegmentClients.filter(c => c.phone).length;
  const isAllSelected = selectedClientIds.size === clientsWithPhoneCount && clientsWithPhoneCount > 0;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedClientIds(new Set());
    } else {
      const withPhone = currentSegmentClients.filter(c => c.phone).map(c => c.id as string);
      setSelectedClientIds(new Set(withPhone));
    }
  };

  return (
    <AdminLayout title="Reactivación" subtitle="Campañas para clientes inactivos">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {segments.map((seg, i) => (
          <motion.div
            key={seg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            onClick={() => setSelectedSegment(seg.id)}
            className={`bg-card border rounded-sm p-4 cursor-pointer hover:border-primary/50 transition-colors ${
              selectedSegment === seg.id ? "border-primary" : "border-border/50"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
              <Users size={12} className="text-muted-foreground" />
            </div>
            <p className="text-xl font-light text-foreground">
              {loading ? <span className="text-muted-foreground/30">—</span> : seg.count}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{seg.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Message template */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-sm p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={14} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Plantilla de mensaje</h3>
          </div>
          <textarea
            value={customTemplate}
            onChange={(e) => setCustomTemplate(e.target.value)}
            rows={12}
            className="w-full bg-background border border-border rounded-sm px-3 py-3 text-xs text-foreground font-mono leading-relaxed focus:outline-none focus:border-primary transition-colors resize-none"
          />
          <p className="text-[9px] text-muted-foreground mt-2">
            Variables disponibles: <span className="text-primary font-mono">{"{nombre}"}</span>,{" "}
            <span className="text-primary font-mono">{"{codigo}"}</span>
          </p>
        </motion.div>

        {/* Campaign setup */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.27 }}
          className="space-y-4"
        >
          <div className="bg-card border border-border rounded-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Configurar campaña</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground block mb-1.5">
                  Segmento Seleccionado
                </label>
                <select
                  value={selectedSegment}
                  onChange={(e) => setSelectedSegment(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="90d">Sin visitas 90+ días</option>
                  <option value="60d">Sin visitas 60+ días</option>
                  <option value="30d">Sin visitas 30+ días</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground block mb-1.5">
                  Descuento (%)
                </label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground block mb-1.5">
                  Vigencia del código (días)
                </label>
                <input
                  type="number"
                  value={validity}
                  onChange={(e) => setValidity(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {currentSegmentClients.length === 0 ? (
            <div className="bg-amber-400/10 border border-amber-400/30 rounded-sm p-4">
              <div className="flex items-start gap-2">
                <Clock size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-400">Sin clientes inactivos</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    No hay clientes en el segmento seleccionado actualmente.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-sm p-4">
              <div className="flex items-start gap-2">
                <Users size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-500">Clientes listos</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Se encontraron {currentSegmentClients.length} clientes inactivos en este segmento.
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLaunchCampaign}
            disabled={loading || currentSegmentClients.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-3 rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send size={13} />
            Lanzar campaña de WhatsApp
          </button>
        </motion.div>
      </div>

      {/* Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl border border-border/50 flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-border/50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Campaña de Reactivación</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Revisá la lista y seleccioná a quiénes enviar el mensaje ({selectedSegment})
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground p-2"
              >
                ✕
              </button>
            </div>
            
            {clientsWithPhoneCount > 0 && (
              <div className="px-5 py-3 bg-muted/20 border-b border-border/50 flex justify-between items-center">
                <button 
                  onClick={toggleSelectAll}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <CheckSquare size={12} />
                  {isAllSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
                <span className="text-[10px] font-semibold text-foreground bg-muted px-2 py-1 rounded-sm">
                  {selectedClientIds.size} / {clientsWithPhoneCount} seleccionados
                </span>
              </div>
            )}

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              {currentSegmentClients.map((client) => {
                const hasPhone = !!client.phone;
                const isSelected = selectedClientIds.has(client.id);

                return (
                  <div 
                    key={client.id} 
                    className={`bg-background border rounded-lg p-3 flex items-center justify-between transition-colors ${
                      hasPhone ? (isSelected ? 'border-primary/40 bg-primary/5' : 'border-border/50') : 'border-border/20 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {hasPhone ? (
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSet = new Set(selectedClientIds);
                            if (e.target.checked) newSet.add(client.id);
                            else newSet.delete(client.id);
                            setSelectedClientIds(newSet);
                          }}
                          className="w-4 h-4 accent-primary rounded-sm cursor-pointer"
                        />
                      ) : (
                        <div className="w-4 h-4" /> // placeholder
                      )}
                      <div>
                        <p className="font-medium text-sm">{client.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{client.phone || "Sin teléfono"}</p>
                      </div>
                    </div>
                    <a
                      href={generateWhatsAppLink(client.name, client.phone)}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                        !client.phone 
                          ? 'bg-muted text-muted-foreground pointer-events-none' 
                          : 'bg-[#25D366] hover:bg-[#20b858] text-white'
                      }`}
                    >
                      <MessageSquare size={12} />
                      Manual
                    </a>
                  </div>
                );
              })}
            </div>

            <div className="p-5 border-t border-border/50 bg-background/50 rounded-b-xl">
              {sendingStatus === "done" ? (
                <div className="text-sm text-emerald-500 bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20 text-center">
                  <p className="font-bold mb-1">¡Campaña finalizada!</p>
                  <p>Se enviaron {sendResult?.sent} mensajes. Fallaron {sendResult?.failed}.</p>
                </div>
              ) : sendingStatus === "error" ? (
                <div className="text-sm text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                  Ocurrió un error al procesar el envío masivo. Intentá nuevamente.
                </div>
              ) : (
                <button
                  onClick={handleBulkSend}
                  disabled={sendingStatus === "sending" || selectedClientIds.size === 0}
                  className="w-full bg-[#b5506a] hover:bg-[#9c4258] text-white font-bold py-3 px-4 rounded-xl flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Send size={16} />
                  {sendingStatus === "sending" ? "Enviando en proceso (no cierres)..." : `Enviar a ${selectedClientIds.size} seleccionados`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
