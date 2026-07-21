import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Smartphone, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import AdminLayout from "./AdminLayout";

export default function WhatsApp() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AdminLayout title="WhatsApp" subtitle="Conexión del bot de mensajería">
      <div className="max-w-xl mx-auto mt-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-sm p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <MessageSquare size={28} className="text-emerald-500" />
          </div>

          <div className="flex items-center justify-center gap-3 mb-6">
            <h2 className="text-xl font-semibold text-foreground">Estado de WhatsApp</h2>
          </div>

          <motion.div
            key="connected"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-2"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-medium text-sm mb-6">
              <CheckCircle2 size={16} />
              Meta Cloud API Activa y Conectada
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              El bot de WhatsApp oficial está en línea. Envía notificaciones automáticas y recibe reservas de tus clientes a través del Webhook de Meta.
            </p>

            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground bg-background rounded-lg p-4 border border-border/50">
              <div className="flex flex-col items-center gap-2">
                <ShieldCheck size={18} className="text-primary" />
                <span className="font-semibold text-foreground">Oficial y Seguro</span>
                <span className="opacity-70">Anti-baneo nativo</span>
              </div>
              <div className="w-px h-10 bg-border/50"></div>
              <div className="flex flex-col items-center gap-2">
                <Zap size={18} className="text-amber-500" />
                <span className="font-semibold text-foreground">Sin escanear QR</span>
                <span className="opacity-70">Siempre conectado a internet</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <div className="mt-6 bg-muted/20 border border-border/50 rounded-sm p-5 text-sm text-muted-foreground">
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
            <Smartphone size={16} />
            ¿Cómo funciona el nuevo sistema oficial?
          </h3>
          <ul className="list-disc list-inside space-y-1 ml-1 text-xs">
            <li>Ya no necesitas escanear códigos QR ni tener el teléfono prendido o con batería.</li>
            <li>El sistema se conecta directamente a los servidores de Meta (Facebook/WhatsApp).</li>
            <li>No necesitas mantener esta pestaña abierta. El bot funciona 24/7 en segundo plano.</li>
            <li>Es 100% oficial, por lo que el riesgo de bloqueo o suspensión de la línea es nulo.</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}
