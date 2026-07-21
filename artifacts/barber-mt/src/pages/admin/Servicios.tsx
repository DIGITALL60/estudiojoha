import { fetchAPI } from "@/lib/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Clock, DollarSign, Edit2, Trash2, X, Save, AlertCircle, Sparkles, Eye, Zap, Sun, Droplets, PartyPopper, Scissors, Activity } from "lucide-react";
import AdminLayout from "./AdminLayout";

const CATEGORY_ICONS: Record<string, any> = {
  "Uñas": Sparkles,
  "Pies": Droplets,
  "Cejas y Pestañas": Eye,
  "Depi Definitiva": Zap,
  "Cama Solar": Sun,
  "Facial": Sparkles,
  "Eventos": PartyPopper,
  "default": Scissors
};

interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  cod: string | null;
  recipes?: { productId: string; amount: number }[];
}

export interface Product {
  id: string;
  name: string;
  unit: string;
}

// Removed hardcoded categories

function ServiceModal({
  service,
  categories,
  products,
  onClose,
  onSave,
}: {
  service: Service;
  categories: string[];
  products: Product[];
  onClose: () => void;
  onSave: (s: Service, isNew: boolean) => void;
}) {
  const [form, setForm] = useState({ ...service });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isNewCat, setIsNewCat] = useState(!categories.includes(service.category) && !!service.category);
  const [newCatValue, setNewCatValue] = useState(!categories.includes(service.category) ? service.category : "");

  const addRecipe = () => {
    setForm(f => ({ ...f, recipes: [...(f.recipes || []), { productId: products[0]?.id || "", amount: 1 }] }));
  };

  const updateRecipe = (idx: number, field: string, val: any) => {
    setForm(f => {
      const rs = [...(f.recipes || [])];
      rs[idx] = { ...rs[idx], [field]: val };
      return { ...f, recipes: rs };
    });
  };

  const removeRecipe = (idx: number) => {
    setForm(f => {
      const rs = [...(f.recipes || [])];
      rs.splice(idx, 1);
      return { ...f, recipes: rs };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.category.trim()) {
      setError("Nombre y categoría son obligatorios"); return;
    }
    setSaving(true); setError("");
    try {
      const isNew = !service.id;
      const url = isNew ? "/api/data/services" : `/api/data/services/${service.id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetchAPI(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onSave(updated, isNew);
      onClose();
    } catch {
      setError("Error al guardar. Verificá la conexión.");
    } finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
        className="bg-card border border-border shadow-2xl rounded-sm w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <h3 className="text-sm font-semibold text-foreground">{service.id ? "Editar servicio" : "Nuevo servicio"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Nombre *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Categoría *</label>
              <select
                value={isNewCat ? "__nueva__" : form.category}
                onChange={e => {
                  if (e.target.value === "__nueva__") {
                    setIsNewCat(true);
                    setForm(f => ({ ...f, category: "" }));
                  } else {
                    setIsNewCat(false);
                    setNewCatValue("");
                    setForm(f => ({ ...f, category: e.target.value }));
                  }
                }}
                className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary appearance-none cursor-pointer"
              >
                <option value="">-- Seleccioná una categoría --</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__nueva__">➕ Nueva categoría...</option>
              </select>
              {isNewCat && (
                <input
                  type="text"
                  autoFocus
                  value={newCatValue}
                  onChange={e => {
                    setNewCatValue(e.target.value);
                    setForm(f => ({ ...f, category: e.target.value }));
                  }}
                  placeholder="Ej. Extensiones de Cañas"
                  className="w-full mt-2 bg-background border border-primary/50 rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              )}
            </div>
          </div>
          <div>
            <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Código (Opcional)</label>
            <input type="text" value={form.cod || ""} onChange={e => setForm(f => ({ ...f, cod: e.target.value }))} placeholder="Ej. MAN1"
              className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Duración (min)</label>
              <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
                className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Precio ($)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-muted-foreground text-xs font-semibold">$</span>
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                  className="w-full bg-background border border-border rounded-sm pl-7 pr-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary" />
              </div>
            </div>
          </div>

          {/* Recetas / Insumos */}
          <div className="pt-2 border-t border-border/40">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">Insumos a descontar automáticamente</label>
              <button onClick={addRecipe} className="text-[10px] flex items-center gap-1 text-primary hover:text-primary/80 font-medium"><Plus size={10}/> Añadir</button>
            </div>
            {form.recipes?.map((r, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <select value={r.productId} onChange={e => updateRecipe(i, 'productId', e.target.value)} className="flex-1 bg-background border border-border rounded-sm px-2 py-1.5 text-xs">
                  <option value="">Seleccioná producto</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                </select>
                <input type="number" placeholder="Cant." value={r.amount} onChange={e => updateRecipe(i, 'amount', Number(e.target.value))} className="w-16 bg-background border border-border rounded-sm px-2 py-1.5 text-xs text-center" />
                <button onClick={() => removeRecipe(i)} className="text-red-400 hover:text-red-500"><Trash2 size={12}/></button>
              </div>
            ))}
            {(!form.recipes || form.recipes.length === 0) && <p className="text-[10px] text-muted-foreground italic">No se descuenta stock para este servicio.</p>}
          </div>

          {error && <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-sm px-3 py-2"><AlertCircle size={12} />{error}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border/40">
          <button onClick={onClose} className="text-xs px-4 py-2 rounded-sm border border-border text-muted-foreground hover:text-foreground">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving ? <><Save size={12} className="animate-spin" /> Guardando...</> : "Guardar"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Servicios() {
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [serviceProducts, setServiceProducts] = useState<{ serviceId: string; productId: string; amount: number }[]>([]);
  const [reports, setReports] = useState<{
    totalRevenue: number;
    paidSales: number;
    averageTicket: number;
    serviceStats: Record<string, { revenue: number, sales: number }>;
  } | null>(null);
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Service | null>(null);

  const dynamicCategories = ["Todas", ...new Set(services.map(s => s.category))];

  useEffect(() => {
    Promise.all([
      fetchAPI("/api/data/services").then(r => r.json()),
      fetchAPI("/api/data/products").then(r => r.json()),
      fetchAPI("/api/data/service-products").then(r => r.json()),
      fetchAPI("/api/data/reports/services-30d").then(r => r.json())
    ])
    .then(([svcs, prods, recipeLinks, reps]) => {
      setServices(svcs);
      setProducts(prods);
      setServiceProducts(recipeLinks);
      setReports(reps);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const handleSaved = (saved: Service, isNew: boolean) => {
    if (isNew) {
      setServices(prev => [...prev, saved]);
    } else {
      setServices(prev => prev.map(s => s.id === saved.id ? saved : s));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que querés eliminar este servicio?")) return;
    try {
      await fetchAPI(`/api/data/services/${id}`, { method: "DELETE" });
      setServices(prev => prev.filter(s => s.id !== id));
    } catch {
      alert("Error al eliminar");
    }
  };

  const handleNewService = () => {
    setEditing({ id: "", name: "", category: "", duration: 60, price: 0, cod: "", recipes: [] });
  };

  const openEditService = (service: Service) => {
    const recipes = serviceProducts
      .filter(sp => sp.serviceId === service.id)
      .map(sp => ({ productId: sp.productId, amount: sp.amount }));
    setEditing({ ...service, recipes });
  };

  const filtered = services.filter(s =>
    (activeCategory === "Todas" || s.category === activeCategory) &&
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, typeof services>);

  // Calculate top service
  let topServiceId = "";
  let maxRev = -1;
  if (reports && Object.keys(reports.serviceStats).length > 0) {
    for (const [id, stats] of Object.entries(reports.serviceStats)) {
      if (stats.revenue > maxRev) {
        maxRev = stats.revenue;
        topServiceId = id;
      }
    }
  }
  const topServiceName = topServiceId ? services.find(s => s.id === topServiceId)?.name : null;

  return (
    <AdminLayout
      title="Servicios"
      subtitle={`${services.length} activos · 0 pausados`}
      actions={
        <button onClick={handleNewService} className="flex items-center gap-2 bg-primary/20 text-primary text-xs font-semibold px-4 py-2 rounded-full hover:bg-primary/30 transition-colors">
          <Plus size={13} />
          Nuevo servicio
        </button>
      }
    >
      {/* Reportes - últimos 30 días */}
      <div className="bg-card/50 border border-border/50 rounded-xl p-6 mb-8 mt-2">
        <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
          <PartyPopper size={16} className="text-muted-foreground opacity-50" />
          Reportes · últimos 30 días
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground tracking-widest mb-3">Facturación total</span>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                <DollarSign size={14} className="text-green-500" />
              </div>
              <span className="text-xl font-bold text-foreground">
                {reports ? (reports.totalRevenue > 0 ? `$ ${reports.totalRevenue.toLocaleString("es-AR")}` : "0") : "—"}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col border-l border-border/50 pl-8">
            <span className="text-[10px] uppercase text-muted-foreground tracking-widest mb-3">Ventas pagas</span>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Activity size={14} className="text-blue-500" />
              </div>
              <span className="text-xl font-bold text-foreground">
                {reports ? reports.paidSales : "0"}
              </span>
            </div>
          </div>

          <div className="flex flex-col border-l border-border/50 pl-8">
            <span className="text-[10px] uppercase text-muted-foreground tracking-widest mb-3">Ticket promedio</span>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                <DollarSign size={14} className="text-purple-500" />
              </div>
              <span className="text-xl font-bold text-foreground">
                {reports ? (reports.averageTicket > 0 ? `$ ${reports.averageTicket.toLocaleString("es-AR")}` : "—") : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 pt-6">
          <span className="text-[10px] uppercase text-muted-foreground tracking-widest mb-3 block">Top servicios por facturación</span>
          <p className="text-sm font-semibold text-foreground">
            {topServiceName ? topServiceName : <span className="text-xs font-normal text-muted-foreground/80">Todavía no hay ventas pagas en los últimos 30 días.</span>}
          </p>
        </div>
      </div>

      {/* Categorías */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-[10px] uppercase text-muted-foreground tracking-widest font-semibold">Categoría</span>
        <div className="flex gap-2">
          {dynamicCategories.map(cat => {
            const count = cat === "Todas" ? services.length : grouped[cat]?.length || 0;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border ${
                  activeCategory === cat
                    ? "bg-primary/20 border-primary/50 text-primary"
                    : "bg-card/50 border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {cat} · {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Listado de Servicios */}
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Cargando servicios...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">No se encontraron servicios</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((service, i) => {
            const Icon = CATEGORY_ICONS[service.category] || CATEGORY_ICONS.default;
            const stats = reports?.serviceStats[service.id] || { revenue: 0, sales: 0 };
            
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border/50 rounded-xl overflow-hidden flex flex-col"
              >
                {/* Header Color Block */}
                <div className="h-32 bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center">
                  <Icon size={24} className="text-white/80" />
                </div>
                
                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <h4 className="text-sm font-bold text-foreground">{service.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    {service.duration} min · ${service.price.toLocaleString("es-AR")} · {service.category}
                  </p>
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/40">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase text-muted-foreground tracking-wider mb-1">30D · Facturación</span>
                      <span className="text-sm font-semibold text-foreground">
                        {stats.revenue > 0 ? `$ ${stats.revenue.toLocaleString("es-AR")}` : "—"}
                      </span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[9px] uppercase text-muted-foreground tracking-wider mb-1">Ventas</span>
                      <span className="text-sm font-semibold text-foreground">
                        {stats.sales}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-5">
                    <button onClick={() => openEditService(service)} className="flex-1 flex items-center justify-center gap-2 bg-background border border-border/50 hover:bg-accent/5 transition-colors py-2 rounded-lg text-xs font-semibold text-foreground">
                      <Edit2 size={12} /> Editar
                    </button>
                    <button onClick={() => handleDelete(service.id)} className="flex items-center justify-center gap-2 bg-background border border-border/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-colors px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {editing && <ServiceModal service={editing} categories={dynamicCategories.filter(c => c !== "Todas")} products={products} onClose={() => setEditing(null)} onSave={handleSaved} />}
      </AnimatePresence>
    </AdminLayout>
  );
}
