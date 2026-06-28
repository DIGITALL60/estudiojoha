import { fetchAPI } from "@/lib/api";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Smartphone, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import AdminLayout from "./AdminLayout";

export default function WhatsApp() {
  const [status, setStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [qr, setQr] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      const res = await fetchAPI("/api/whatsapp/status");
      const data = await res.json();
      
      if (data.connected) {
        setStatus("connected");
        setQr(null);
      } else {
        setStatus("disconnected");
        setQr(data.qr);
      }
    } catch (err) {
      console.error(err);
      setStatus("disconnected");
    }
  };

  useEffect(() => {
    checkStatus();
    // Poll every 3 seconds
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminLayout title="WhatsApp" subtitle="Conexión del bot de mensajería">
      <div className="max-w-xl mx-auto mt-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-sm p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <MessageSquare size={28} className="text-primary" />
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-2">Estado de WhatsApp</h2>
          
          {status === "loading" && (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <RefreshCw size={24} className="animate-spin" />
              <p className="text-sm">Comprobando conexión...</p>
            </div>
          )}

          {status === "connected" && (
            <div className="py-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-medium text-sm mb-6">
                <CheckCircle2 size={16} />
                Conectado exitosamente
              </div>
              <p className="text-sm text-muted-foreground">
                El bot de WhatsApp está en línea y enviará notificaciones automáticas cuando los clientes reserven un turno.
              </p>
            </div>
          )}

          {status === "disconnected" && (
            <div className="py-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 font-medium text-sm mb-6">
                <AlertCircle size={16} />
                Requiere vinculación
              </div>
              
              {qr ? (
                <div className="flex flex-col items-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Abrí WhatsApp en tu teléfono, andá a <strong>Dispositivos vinculados</strong> y escaneá este código QR:
                  </p>
                  <div className="bg-white p-4 rounded-xl shadow-sm mb-4 inline-block border border-border/50">
                    <img src={qr} alt="WhatsApp QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El código se actualiza automáticamente.
                  </p>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <RefreshCw size={24} className="animate-spin" />
                  <p className="text-sm">Generando código QR...</p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        <div className="mt-6 bg-muted/20 border border-border/50 rounded-sm p-5 text-sm text-muted-foreground">
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
            <Smartphone size={16} />
            ¿Cómo funciona?
          </h3>
          <ul className="list-disc list-inside space-y-1 ml-1 text-xs">
            <li>El sistema usa este número para enviar confirmaciones a tus clientes.</li>
            <li>No necesitas mantener esta pestaña abierta una vez conectado.</li>
            <li>Si cerrás la sesión desde el celular, deberás volver a escanear el QR aquí.</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
