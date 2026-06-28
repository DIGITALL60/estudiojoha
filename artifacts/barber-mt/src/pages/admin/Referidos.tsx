import { motion } from "framer-motion";
import { Gift, Users, Share2, Plus, Copy, TrendingUp } from "lucide-react";
import AdminLayout from "./AdminLayout";

const referralStats = [
  { label: "Total referidos", value: "0", icon: Users, color: "text-primary", bg: "bg-primary/10" },
  { label: "Referidos este mes", value: "0", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { label: "Descuentos otorgados", value: "$0", icon: Gift, color: "text-violet-400", bg: "bg-violet-400/10" },
];

export default function Referidos() {
  const refCode = "JOHA-REF-001";
  const refLink = `https://wa.link/pga9u0?ref=${refCode}`;

  return (
    <AdminLayout title="Referidos" subtitle="Programa de referidos y recompensas">
      <div className="grid grid-cols-3 gap-4 mb-6">
        {referralStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-card border border-border rounded-sm p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">{stat.label}</p>
                <div className={`w-7 h-7 rounded-sm flex items-center justify-center ${stat.bg}`}>
                  <Icon size={12} className={stat.color} />
                </div>
              </div>
              <p className={`text-2xl font-light ${stat.color}`}>{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Referral link */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-sm p-5 mb-4"
      >
        <div className="flex items-center gap-2 mb-4">
          <Share2 size={14} className="text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Tu link de referidos</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-background border border-border rounded-sm px-3 py-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono truncate">{refLink}</span>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(refLink)}
            className="flex items-center gap-1.5 bg-primary/10 border border-primary/30 text-primary px-3 py-2.5 rounded-sm text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <Copy size={12} />
            Copiar
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Compartí este link con tus clientes para que refieran nuevas clientas</p>
      </motion.div>

      {/* Empty referrals */}
      <div className="bg-card border border-border rounded-sm p-12 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Gift size={24} className="text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Sin referidos todavía</h3>
        <p className="text-xs text-muted-foreground mb-5 max-w-xs mx-auto">
          Cuando tus clientes refieran nuevas personas, aparecerán aquí con sus recompensas.
        </p>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-sm hover:bg-primary/90 transition-colors mx-auto">
          <Plus size={13} />
          Configurar programa
        </button>
      </div>
    </AdminLayout>
  );
}
