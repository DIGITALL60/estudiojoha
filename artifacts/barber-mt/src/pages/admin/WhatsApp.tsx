import { fetchAPI } from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import AdminLayout from "./AdminLayout";

type ConnectionStatus = "loading" | "connected" | "disconnected";

export default function WhatsApp() {
  const [status, setStatus] = useState<ConnectionStatus>("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetchAPI("/api/whatsapp/status");
      const data = await res.json();

      if (data.connected) {
        setStatus("connected");
        setQr(null);
      } else {
        setStatus("disconnected");
        // Only update QR if we received a new one – keep showing the old one
        // while the server is generating a fresh code.
        if (data.qr) {
          setQr(data.qr);
        }
      }
      setLastChecked(new Date());
    } catch (err) {
      console.error(err);
      setStatus("disconnected");
    }
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await checkStatus();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  useEffect(() => {
    // Initial check
    checkStatus();
    // Poll every 2.5 seconds for faster QR appearance
    const interval = setInterval(checkStatus, 2500);
    return () => clearInterval(interval);
  }, [checkStatus]);

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

          <div className="flex items-center justify-center gap-3 mb-6">
            <h2 className="text-xl font-semibold text-foreground">Estado de WhatsApp</h2>
            <button
              onClick={handleManualRefresh}
              title="Actualizar estado"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {status === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-8 flex flex-col items-center justify-center gap-3 text-muted-foreground"
              >
                <RefreshCw size={24} className="animate-spin" />
                <p className="text-sm">Comprobando conexión...</p>
              </motion.div>
            )}

            {status === "connected" && (
              <motion.div
                key="connected"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="py-6"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-medium text-sm mb-6">
                  <CheckCircle2 size={16} />
                  Conectado exitosamente
                </div>
                <p className="text-sm text-muted-foreground">
                  El bot de WhatsApp está en línea y enviará notificaciones automáticas cuando los
                  clientes reserven un turno.
                </p>
              </motion.div>
            )}

            {status === "disconnected" && (
              <motion.div
                key="disconnected"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-4"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 font-medium text-sm mb-6">
                  <AlertCircle size={16} />
                  Requiere vinculación
                </div>

                <AnimatePresence mode="wait">
                  {qr ? (
                    <motion.div
                      key="qr-ready"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center"
                    >
                      <p className="text-sm text-muted-foreground mb-4">
                        Abrí WhatsApp en tu teléfono, andá a{" "}
                        <strong>Dispositivos vinculados</strong> y escaneá este código QR:
                      </p>
                      <div className="bg-white p-4 rounded-xl shadow-sm mb-4 inline-block border border-border/50">
                        <img
                          src={qr}
                          alt="WhatsApp QR Code"
                          className="w-56 h-56"
                          key={qr} // Force re-render when QR changes
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        El código se actualiza automáticamente cada ~60 segundos.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="qr-loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-8 flex flex-col items-center justify-center gap-3 text-muted-foreground"
                    >
                      <RefreshCw size={24} className="animate-spin" />
                      <p className="text-sm">Generando código QR...</p>
                      <p className="text-xs opacity-60">
                        Si tarda más de 30 segundos, hacé clic en{" "}
                        <RefreshCw size={11} className="inline" /> arriba.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {lastChecked && (
            <p className="text-xs text-muted-foreground/50 mt-4">
              Última actualización:{" "}
              {lastChecked.toLocaleTimeString("es-AR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
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
            <li>
              El sistema envía mensajes con pausas naturales para evitar restricciones de WhatsApp.
            </li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
