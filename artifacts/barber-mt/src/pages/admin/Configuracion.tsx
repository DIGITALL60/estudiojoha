import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Globe, Check, Loader2 } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { fetchAPI } from "@/lib/api";

const toggleSettings = [
  { id: "whatsapp_notif", label: "Notificaciones por WhatsApp", desc: "Enviar alertas de turnos y recordatorios por WhatsApp" },
  { id: "birthday_auto", label: "Voucher de cumpleaños automático", desc: "Crea y envía vouchers el día del cumpleaños del cliente" },
  { id: "reminder_24h", label: "Recordatorio 24 hs antes", desc: "Enviar recordatorio al cliente 24 hs antes del turno (cron 18:00)" },
  { id: "reminder_2h", label: "Recordatorio 2 hs antes", desc: "Próximamente: recordatorio 2 hs antes del turno" },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${enabled ? "bg-primary" : "bg-muted"}`}
    >
      <motion.div
        animate={{ x: enabled ? 20 : 2 }}
        transition={{ duration: 0.2 }}
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

export default function Configuracion() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsappLink, setWhatsappLink] = useState("");
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    whatsapp_notif: true,
    birthday_auto: false,
    reminder_24h: true,
    reminder_2h: false,
  });

  useEffect(() => {
    Promise.all([
      fetchAPI("/api/data/settings").then(r => r.json()),
      fetchAPI("/api/data/professionals").then(r => r.json()),
    ])
      .then(([settings, profs]: [Record<string, string>, any[]]) => {
        setBusinessName(settings.business_name || "");
        setEmail(settings.business_email || "");
        setPhone(settings.business_phone || "");
        setAddress(settings.business_address || "");
        setInstagram(settings.business_instagram || "");
        setWhatsappLink(settings.whatsapp_link || "");
        setToggles({
          whatsapp_notif: settings.whatsapp_notif !== "false",
          birthday_auto: settings.birthday_auto === "true",
          reminder_24h: settings.reminder_24h !== "false",
          reminder_2h: settings.reminder_2h === "true",
        });

        const admin = profs.find(p => p.role?.toLowerCase() === "admin");
        if (admin) {
          setAdminId(admin.id);
          if (!settings.business_phone && admin.phone) setPhone(admin.phone);
          if (!settings.business_email && admin.email) setEmail(admin.email);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchAPI("/api/data/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          business_email: email,
          business_phone: phone,
          business_address: address,
          business_instagram: instagram,
          whatsapp_link: whatsappLink,
          whatsapp_notif: String(toggles.whatsapp_notif),
          birthday_auto: String(toggles.birthday_auto),
          reminder_24h: String(toggles.reminder_24h),
          reminder_2h: String(toggles.reminder_2h),
        }),
      });

      if (adminId) {
        await fetchAPI(`/api/data/professionals/${adminId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, email, name: businessName }),
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Configuración" subtitle="Cargando ajustes...">
        <div className="py-20 text-center text-sm text-muted-foreground">Cargando...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Configuración"
      subtitle="Estos datos impactan en la web pública, WhatsApp y recordatorios"
      actions={
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-sm transition-all ${
            saved ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"
          } disabled:opacity-60`}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
          {saving ? "Guardando..." : saved ? "Guardado" : "Guardar cambios"}
        </button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-sm overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border/40 bg-muted/20 flex items-center gap-2">
              <Globe size={13} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Datos del negocio</h3>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: "Nombre del negocio", value: businessName, set: setBusinessName, type: "text" },
                { label: "Email de contacto", value: email, set: setEmail, type: "email" },
                { label: "Teléfono / WhatsApp", value: phone, set: setPhone, type: "text" },
                { label: "Dirección", value: address, set: setAddress, type: "text" },
                { label: "Instagram", value: instagram, set: setInstagram, type: "text" },
                { label: "Link de reserva WhatsApp", value: whatsappLink, set: setWhatsappLink, type: "text" },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground block mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-sm overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border/40 bg-muted/20 flex items-center gap-2">
              <Bell size={13} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Notificaciones</h3>
            </div>
            <div className="p-4 space-y-4">
              {toggleSettings.map(setting => (
                <div key={setting.id} className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">{setting.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{setting.desc}</p>
                  </div>
                  <Toggle
                    enabled={toggles[setting.id]}
                    onChange={() => setToggles(t => ({ ...t, [setting.id]: !t[setting.id] }))}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}
