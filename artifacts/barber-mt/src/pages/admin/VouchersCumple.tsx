import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Ticket, Gift, Cake, Plus, MessageSquare, Send, Calendar, Users, CheckSquare } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { fetchAPI } from "@/lib/api";

const voucherTypes = [
  {
    id: "cumple",
    label: "Voucher de Cumpleaños",
    icon: Cake,
    color: "#f472b6",
    bg: "bg-pink-400/10",
    border: "border-pink-400/30",
    description: "Enviado a clientes que cumplen años este mes.",
    defaultTemplate: `🎂 ¡Feliz cumpleaños, {nombre}! 🎂\n\nEn Estudio Joha Molinero te regalamos un *15% de descuento* en tu próxima visita 💜\n\nUsá el código: *CUMPLE-{nombre}-15*\n\n📅 Válido durante todo tu mes de cumpleaños\n📲 Reservar: https://wa.link/pga9u0\n\n¡Te esperamos para celebrarlo! 🥂`,
  },
  {
    id: "voucher",
    label: "Voucher de Regalo",
    icon: Gift,
    color: "#a78bfa",
    bg: "bg-violet-400/10",
    border: "border-violet-400/30",
    description: "Voucher de monto fijo para clientes especiales.",
    defaultTemplate: `🎁 ¡Tenés un voucher de regalo de Estudio Joha Molinero!\n\n*Valor: 10% OFF*\nCódigo: *REGALO-{nombre}*\n\n📲 Para usarlo, reservá tu turno: https://wa.link/pga9u0\n\n¡Disfrutalo! 💜`,
  },
];

export default function VouchersCumple() {
  const [activeType, setActiveType] = useState("cumple");
  const [clients, setClients] = useState<any[]>([]);
  const [sendingStatus, setSendingStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [sendResult, setSendResult] = useState<{sent: number, failed: number} | null>(null);
  
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  const [templates, setTemplates] = useState<Record<string, string>>({
    cumple: voucherTypes[0].defaultTemplate,
    voucher: voucherTypes[1].defaultTemplate
  });

  useEffect(() => {
    fetchAPI("/api/data/clients").then(r => r.json()).then(setClients).catch(console.error);
  }, []);

  const active = voucherTypes.find(v => v.id === activeType)!;
  const Icon = active.icon;
  const customTemplate = templates[activeType];

  const handleTemplateChange = (val: string) => {
    setTemplates(prev => ({ ...prev, [activeType]: val }));
  };

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  
  const targetClients = useMemo(() => {
    return activeType === "cumple" 
      ? clients.filter(c => {
          if (!c.birthday) return false;
          let m = null;
          if (c.birthday.includes("-")) {
            m = parseInt(c.birthday.split("-")[1], 10);
          } else if (c.birthday.includes("/")) {
            m = parseInt(c.birthday.split("/")[1], 10);
          }
          return m === currentMonth;
        })
      : clients; 
  }, [activeType, clients, currentMonth]);

  // Al cambiar de pestaña o cargar clientes, seleccionar todos por defecto (los que tengan teléfono)
  useEffect(() => {
    const withPhone = targetClients.filter(c => c.phone).map(c => c.id as string);
    setSelectedClientIds(new Set(withPhone));
  }, [targetClients]);

  const generateMessageText = (clientName: string) => {
    const firstName = clientName.split(" ")[0] || clientName;
    return customTemplate.replace(/{nombre}/g, firstName);
  };

  const handleBulkSend = async () => {
    setSendingStatus("sending");
    
    const finalClients = targetClients.filter(c => selectedClientIds.has(c.id));

    const messages = finalClients.map(c => ({
      phone: c.phone,
      message: generateMessageText(c.name)
    }));

    // Extract codes based on active type for registration in DB
    const codesToCreate = finalClients.map(c => {
      const firstName = c.name.split(" ")[0] || c.name;
      return activeType === "cumple" ? `CUMPLE-${firstName}-15`.toUpperCase() : `REGALO-${firstName}`.toUpperCase();
    });

    try {
      // 1. Create vouchers in backend
      await fetchAPI("/api/vouchers/bulk-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          codes: codesToCreate, 
          discountType: activeType === "cumple" ? "percent" : "percent", 
          discountValue: activeType === "cumple" ? 15 : 10 
        })
      });

      // 2. Send messages
      const res = await fetchAPI("/api/whatsapp/send-bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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

  const clientsWithPhoneCount = targetClients.filter(c => c.phone).length;
  const isAllSelected = selectedClientIds.size === clientsWithPhoneCount && clientsWithPhoneCount > 0;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedClientIds(new Set());
    } else {
      const withPhone = targetClients.filter(c => c.phone).map(c => c.id as string);
      setSelectedClientIds(new Set(withPhone));
    }
  };

  return (
    <AdminLayout
      title="Vouchers / Cumpleaños"
      subtitle="Campañas automáticas de fidelización"
    >
      <div className="flex items-center gap-3 mb-6">
        {voucherTypes.map(type => {
          const TypeIcon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => {
                setActiveType(type.id);
                setSendingStatus("idle");
                setSendResult(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-sm text-xs font-medium border transition-all ${
                activeType === type.id
                  ? `${type.bg} ${type.border} text-foreground`
                  : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              <TypeIcon size={13} style={{ color: activeType === type.id ? type.color : "" }} />
              {type.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Side: Configuration */}
        <motion.div
          key={activeType + "-config"}
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className={`bg-card border ${active.border} rounded-sm p-6 relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10" style={{ background: active.color, transform: "translate(30%, -30%)" }} />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-9 h-9 rounded-sm flex items-center justify-center ${active.bg}`}>
                  <Icon size={16} style={{ color: active.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{active.label}</h3>
                  <p className="text-[10px] text-muted-foreground">{active.description}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-sm p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Plantilla del mensaje</h3>
            <textarea
              value={customTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              rows={9}
              className="w-full bg-background border border-border rounded-sm px-3 py-3 text-xs text-foreground font-mono leading-relaxed focus:outline-none focus:border-primary transition-colors resize-none"
            />
            <p className="text-[9px] text-muted-foreground mt-2">
              Variables disponibles: <span className="text-primary font-mono">{"{nombre}"}</span>
            </p>
          </div>
        </motion.div>

        {/* Right Side: Target Audience and Send */}
        <motion.div
          key={activeType + "-targets"}
          initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
          className="space-y-4 flex flex-col h-full"
        >
          <div className="bg-card border border-border rounded-sm p-5 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users size={14} className="text-primary" />
                Destinatarios
              </h3>
              
              {clientsWithPhoneCount > 0 && (
                <div className="flex items-center gap-3">
                  <button 
                    onClick={toggleSelectAll}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <CheckSquare size={12} />
                    {isAllSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                  </button>
                  <span className="text-[10px] font-semibold text-foreground bg-muted px-2 py-1 rounded-sm">
                    {selectedClientIds.size} / {clientsWithPhoneCount}
                  </span>
                </div>
              )}
            </div>

            {targetClients.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-background border border-border border-dashed rounded-lg p-6 text-center">
                <Calendar size={32} className="mb-2 opacity-50" />
                <p className="text-sm font-medium">No hay clientes</p>
                <p className="text-xs opacity-70">
                  {activeType === "cumple" 
                    ? "Ningún cliente de tu base de datos tiene cargada una fecha de cumpleaños para este mes."
                    : "No hay clientes disponibles."}
                </p>
              </div>
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto max-h-[350px] pr-2">
                {targetClients.map((client) => {
                  const hasPhone = !!client.phone;
                  const isSelected = selectedClientIds.has(client.id);

                  return (
                    <div 
                      key={client.id} 
                      className={`flex items-center gap-3 p-3 bg-background border rounded-lg transition-colors ${
                        hasPhone ? (isSelected ? 'border-primary/40 bg-primary/5' : 'border-border/50') : 'border-border/20 opacity-50'
                      }`}
                    >
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
                        <div className="w-4 h-4" /> // placeholder for alignment
                      )}
                      
                      <div className="flex-1">
                        <p className="text-sm font-medium">{client.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{client.phone || "Sin teléfono (no se puede enviar)"}</span>
                          {activeType === "cumple" && client.birthday && (
                            <span className="text-[10px] font-semibold text-pink-500 bg-pink-500/10 px-1.5 py-0.5 rounded-sm">
                              🎂 {client.birthday}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Box */}
          <div className="bg-card border border-border rounded-sm p-5">
            {sendingStatus === "done" ? (
                <div className="text-sm text-emerald-500 bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20 text-center mb-4">
                  <p className="font-bold mb-1">¡Campaña iniciada con éxito!</p>
                  <p>Los mensajes se están enviando en segundo plano poco a poco para evitar bloqueos por SPAM de Meta.</p>
                </div>
            ) : sendingStatus === "error" ? (
              <div className="text-xs text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20 mb-4">
                Ocurrió un error al procesar el envío masivo. Intentá nuevamente.
              </div>
            ) : null}

            <button
              onClick={handleBulkSend}
              disabled={sendingStatus === "sending" || selectedClientIds.size === 0}
              className={`w-full flex items-center justify-center gap-2 text-white text-sm font-semibold px-4 py-4 rounded-xl transition-colors disabled:opacity-50 ${
                activeType === "cumple" ? "bg-pink-500 hover:bg-pink-600" : "bg-violet-500 hover:bg-violet-600"
              }`}
            >
              <Send size={16} />
              {sendingStatus === "sending" ? "Enviando en proceso (no cierres)..." : `Enviar a ${selectedClientIds.size} seleccionados`}
            </button>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
