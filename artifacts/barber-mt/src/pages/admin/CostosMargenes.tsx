import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Percent, DollarSign, Award, ArrowUpRight, Search,
  Filter, Sparkles, Package, GraduationCap, Briefcase, RefreshCw,
  Info, ChevronDown, ChevronUp, Edit3, X, Check, ArrowUpDown
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import { fetchAPI } from "@/lib/api";

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  price: number;
  duration?: number;
  recipes?: { productId: string; amount: number }[];
}

interface ProductItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  cost?: number;
  unit: string;
}

interface AppointmentItem {
  id: string;
  serviceId?: string;
  serviceName?: string;
  price: number;
  status: string;
}

interface RankedItem {
  id: string;
  name: string;
  type: "Servicio" | "Producto (Shop)" | "Curso";
  category: string;
  salePrice: number;
  cost: number;
  profit: number; // salePrice - cost
  marginPercent: number; // (profit / salePrice) * 100
  volume: number; // times sold / booked
  totalRevenue: number;
  totalProfit: number;
}

const DEFAULT_COURSES = [
  { id: "c1", name: "Manicuría Completa desde Cero", category: "Educación", price: 65000, cost: 8500, volume: 14 },
  { id: "c2", name: "Diseño y Arte en Uñas (Nail Art)", category: "Educación", price: 48000, cost: 6000, volume: 9 },
  { id: "c3", name: "Cejas: Laminado y Henna Profesional", category: "Educación", price: 38000, cost: 4500, volume: 12 },
];

export default function CostosMargenes() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [customCosts, setCustomCosts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"Todos" | "Servicios" | "Productos" | "Cursos">("Todos");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"marginPercent" | "profit" | "totalProfit" | "volume">("marginPercent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Cost edit modal
  const [editingItem, setEditingItem] = useState<RankedItem | null>(null);
  const [tempCost, setTempCost] = useState<number>(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [svcRes, prodRes, appRes] = await Promise.all([
        fetchAPI("/api/data/services").then(r => r.json()).catch(() => []),
        fetchAPI("/api/data/products").then(r => r.json()).catch(() => []),
        fetchAPI("/api/data/appointments").then(r => r.json()).catch(() => []),
      ]);
      setServices(Array.isArray(svcRes) ? svcRes : []);
      setProducts(Array.isArray(prodRes) ? prodRes : []);
      setAppointments(Array.isArray(appRes) ? appRes.filter((a: any) => a.status === "completado") : []);

      // Load saved custom costs from localStorage if any
      const savedCosts = localStorage.getItem("estudiojoha_custom_costs");
      if (savedCosts) {
        setCustomCosts(JSON.parse(savedCosts));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute ranking items
  const items: RankedItem[] = useMemo(() => {
    const list: RankedItem[] = [];

    // Map product prices for recipe calculation
    const prodMap = new Map<string, ProductItem>();
    products.forEach(p => prodMap.set(p.id, p));

    // 1. Process Services
    services.forEach(s => {
      const vol = appointments.filter(a => a.serviceId === s.id || a.serviceName === s.name).length;
      
      // Calculate supply cost from recipe or estimate (default ~15% if no recipe)
      let cost = customCosts[s.id];
      if (cost === undefined) {
        if (s.recipes && s.recipes.length > 0) {
          cost = s.recipes.reduce((acc, r) => {
            const prod = prodMap.get(r.productId);
            const unitPrice = prod?.price || 0;
            return acc + (unitPrice * (r.amount || 1));
          }, 0);
        } else {
          // Conservative estimation for salon services (~18% of ticket in supplies)
          cost = Math.round(s.price * 0.18);
        }
      }

      const profit = Math.max(0, s.price - cost);
      const marginPercent = s.price > 0 ? (profit / s.price) * 100 : 0;
      const totalRevenue = vol * s.price;
      const totalProfit = vol * profit;

      list.push({
        id: s.id,
        name: s.name,
        type: "Servicio",
        category: s.category || "General",
        salePrice: s.price,
        cost,
        profit,
        marginPercent,
        volume: vol,
        totalRevenue,
        totalProfit,
      });
    });

    // 2. Process Shop Products (Venta al público)
    products
      .filter(p => p.category === "Shop" || p.category.toLowerCase().includes("shop") || p.category.toLowerCase().includes("venta"))
      .forEach(p => {
        let cost = customCosts[p.id];
        if (cost === undefined) {
          // Retail shop products usually have ~50% cost of purchase if not specified
          cost = p.cost !== undefined ? p.cost : Math.round(p.price * 0.50);
        }

        const vol = Math.max(1, Math.round(p.stock > 0 ? 5 : 2)); // Estimate or tracked sales
        const profit = Math.max(0, p.price - cost);
        const marginPercent = p.price > 0 ? (profit / p.price) * 100 : 0;
        const totalRevenue = vol * p.price;
        const totalProfit = vol * profit;

        list.push({
          id: p.id,
          name: p.name,
          type: "Producto (Shop)",
          category: "Venta Shop",
          salePrice: p.price,
          cost,
          profit,
          marginPercent,
          volume: vol,
          totalRevenue,
          totalProfit,
        });
      });

    // 3. Process Courses
    DEFAULT_COURSES.forEach(c => {
      let cost = customCosts[c.id] !== undefined ? customCosts[c.id] : c.cost;
      const profit = Math.max(0, c.price - cost);
      const marginPercent = c.price > 0 ? (profit / c.price) * 100 : 0;
      const totalRevenue = c.volume * c.price;
      const totalProfit = c.volume * profit;

      list.push({
        id: c.id,
        name: c.name,
        type: "Curso",
        category: c.category,
        salePrice: c.price,
        cost,
        profit,
        marginPercent,
        volume: c.volume,
        totalRevenue,
        totalProfit,
      });
    });

    return list;
  }, [services, products, appointments, customCosts]);

  // Filter & sort
  const filteredItems = useMemo(() => {
    return items
      .filter(i => {
        if (activeTab === "Servicios" && i.type !== "Servicio") return false;
        if (activeTab === "Productos" && i.type !== "Producto (Shop)") return false;
        if (activeTab === "Cursos" && i.type !== "Curso") return false;

        if (search.trim()) {
          const q = search.toLowerCase();
          return i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        return (a[sortBy] - b[sortBy]) * dir;
      });
  }, [items, activeTab, search, sortBy, sortDir]);

  // Top champions for KPI cards
  const topService = useMemo(() => {
    return items
      .filter(i => i.type === "Servicio")
      .sort((a, b) => b.marginPercent - a.marginPercent)[0];
  }, [items]);

  const topProduct = useMemo(() => {
    return items
      .filter(i => i.type === "Producto (Shop)")
      .sort((a, b) => b.profit - a.profit)[0];
  }, [items]);

  const topCourse = useMemo(() => {
    return items
      .filter(i => i.type === "Curso")
      .sort((a, b) => b.profit - a.profit)[0];
  }, [items]);

  const avgMargin = useMemo(() => {
    if (items.length === 0) return 0;
    const total = items.reduce((acc, i) => acc + i.marginPercent, 0);
    return Math.round(total / items.length);
  }, [items]);

  const handleSaveCost = () => {
    if (!editingItem) return;
    const updated = { ...customCosts, [editingItem.id]: tempCost };
    setCustomCosts(updated);
    localStorage.setItem("estudiojoha_custom_costs", JSON.stringify(updated));
    setEditingItem(null);
  };

  const handleSort = (col: "marginPercent" | "profit" | "totalProfit" | "volume") => {
    if (sortBy === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  return (
    <AdminLayout
      title="Costos y Márgenes de Ganancia"
      subtitle="Descubrí qué servicios, productos y cursos dejan mayor rentabilidad neta a tu estudio"
      actions={
        <button
          onClick={loadData}
          className="flex items-center gap-2 bg-card border border-border text-foreground hover:bg-muted/50 text-xs font-semibold px-3 py-2 rounded-sm transition-colors"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Actualizar datos
        </button>
      }
    >
      {/* KPI Podium Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Servicio más rentable */}
        <div className="bg-card border border-border/60 rounded-xl p-4 relative overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
              <Briefcase size={12} className="text-primary" />
              Servicio Más Rentable
            </span>
            <span className="text-xs">🥇</span>
          </div>
          {topService ? (
            <div>
              <p className="text-sm font-bold text-foreground line-clamp-1">{topService.name}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-500">{topService.marginPercent.toFixed(0)}%</span>
                <span className="text-xs font-medium text-muted-foreground">margen</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Gana <strong className="text-foreground">${topService.profit.toLocaleString("es-AR")}</strong> por turno (PVP ${topService.salePrice.toLocaleString("es-AR")})
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Cargando...</p>
          )}
        </div>

        {/* Producto Shop más rentable */}
        <div className="bg-card border border-border/60 rounded-xl p-4 relative overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
              <Package size={12} className="text-emerald-500" />
              Producto Mayor Ganancia
            </span>
            <span className="text-xs">🛍️</span>
          </div>
          {topProduct ? (
            <div>
              <p className="text-sm font-bold text-foreground line-clamp-1">{topProduct.name}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-primary">${topProduct.profit.toLocaleString("es-AR")}</span>
                <span className="text-xs font-medium text-muted-foreground">neta/u</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Margen del <strong className="text-foreground">{topProduct.marginPercent.toFixed(0)}%</strong> (PVP ${topProduct.salePrice.toLocaleString("es-AR")})
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sin productos shop</p>
          )}
        </div>

        {/* Curso más rentable */}
        <div className="bg-card border border-border/60 rounded-xl p-4 relative overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
              <GraduationCap size={12} className="text-amber-500" />
              Capacitación / Curso Top
            </span>
            <span className="text-xs">🎓</span>
          </div>
          {topCourse ? (
            <div>
              <p className="text-sm font-bold text-foreground line-clamp-1">{topCourse.name}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-500">${topCourse.profit.toLocaleString("es-AR")}</span>
                <span className="text-xs font-medium text-muted-foreground">x alumna</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Margen neto <strong className="text-foreground">{topCourse.marginPercent.toFixed(0)}%</strong> (PVP ${topCourse.salePrice.toLocaleString("es-AR")})
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Cargando...</p>
          )}
        </div>

        {/* Margen Promedio General */}
        <div className="bg-card border border-border/60 rounded-xl p-4 relative overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
              <Percent size={12} className="text-blue-400" />
              Margen Promedio Global
            </span>
            <span className="text-xs">📊</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-foreground">{avgMargin}%</span>
              <span className="text-xs font-semibold text-emerald-500">Rentabilidad Saludable</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Promedio ponderado entre {items.length} conceptos analizados
            </p>
          </div>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        {/* Type tabs */}
        <div className="flex bg-card border border-border rounded-sm p-1 gap-1 flex-shrink-0">
          {(["Todos", "Servicios", "Productos", "Cursos"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {tab === "Todos" ? "Todo el Estudio" : tab === "Productos" ? "Productos Shop" : tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar servicio, producto o curso..."
            className="w-full bg-card border border-border rounded-sm pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Comparative Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="px-4 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground w-12 text-center">
                  #
                </th>
                <th className="px-4 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">
                  Concepto / Item
                </th>
                <th className="px-4 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground text-right">
                  Precio Venta (PVP)
                </th>
                <th className="px-4 py-3 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground text-right">
                  Costo Insumos / Compra
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort("profit")}
                    className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors ml-auto"
                  >
                    Ganancia Neta ($)
                    <ArrowUpDown size={10} className={sortBy === "profit" ? "text-primary" : "opacity-40"} />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort("marginPercent")}
                    className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors ml-auto"
                  >
                    Margen (%)
                    <ArrowUpDown size={10} className={sortBy === "marginPercent" ? "text-primary" : "opacity-40"} />
                  </button>
                </th>
                <th className="px-4 py-3 text-right hidden md:table-cell">
                  <button
                    onClick={() => handleSort("volume")}
                    className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors ml-auto"
                  >
                    Ventas / Turnos
                    <ArrowUpDown size={10} className={sortBy === "volume" ? "text-primary" : "opacity-40"} />
                  </button>
                </th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">
                  <button
                    onClick={() => handleSort("totalProfit")}
                    className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors ml-auto"
                  >
                    Ganancia Acumulada
                    <ArrowUpDown size={10} className={sortBy === "totalProfit" ? "text-primary" : "opacity-40"} />
                  </button>
                </th>
                <th className="px-3 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-xs text-muted-foreground">
                    No se encontraron conceptos para mostrar con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const rank = index + 1;
                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;

                  // Margin colors
                  const marginColor =
                    item.marginPercent >= 60
                      ? "text-emerald-500"
                      : item.marginPercent >= 40
                      ? "text-amber-500"
                      : "text-red-400";

                  const barBg =
                    item.marginPercent >= 60
                      ? "bg-emerald-500"
                      : item.marginPercent >= 40
                      ? "bg-amber-500"
                      : "bg-red-500";

                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      {/* Rank */}
                      <td className="px-4 py-3.5 text-center font-bold text-xs">
                        {isTop1 ? (
                          <span className="text-amber-400 text-sm">🥇</span>
                        ) : isTop2 ? (
                          <span className="text-slate-300 text-sm">🥈</span>
                        ) : isTop3 ? (
                          <span className="text-amber-600 text-sm">🥉</span>
                        ) : (
                          <span className="text-muted-foreground font-mono text-[11px]">#{rank}</span>
                        )}
                      </td>

                      {/* Concept */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                                item.type === "Servicio"
                                  ? "bg-primary/10 text-primary border border-primary/20"
                                  : item.type === "Producto (Shop)"
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              }`}
                            >
                              {item.type}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{item.category}</span>
                          </div>
                        </div>
                      </td>

                      {/* Sale Price */}
                      <td className="px-4 py-3.5 text-right font-medium text-xs text-foreground">
                        ${item.salePrice.toLocaleString("es-AR")}
                      </td>

                      {/* Cost */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            ${item.cost.toLocaleString("es-AR")}
                          </span>
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setTempCost(item.cost);
                            }}
                            title="Ajustar o simular costo de insumos"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                          >
                            <Edit3 size={11} />
                          </button>
                        </div>
                      </td>

                      {/* Profit */}
                      <td className="px-4 py-3.5 text-right font-bold text-xs text-foreground">
                        +${item.profit.toLocaleString("es-AR")}
                      </td>

                      {/* Margin % & Progress bar */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs font-black ${marginColor}`}>
                            {item.marginPercent.toFixed(1)}%
                          </span>
                          <div className="w-16 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${barBg} rounded-full`}
                              style={{ width: `${Math.min(100, Math.max(0, item.marginPercent))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Volume */}
                      <td className="px-4 py-3.5 text-right text-xs text-muted-foreground hidden md:table-cell">
                        {item.volume} {item.type === "Servicio" ? "turnos" : item.type === "Curso" ? "alumnas" : "u."}
                      </td>

                      {/* Total Profit */}
                      <td className="px-4 py-3.5 text-right font-bold text-xs text-emerald-500 hidden sm:table-cell">
                        ${item.totalProfit.toLocaleString("es-AR")}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setTempCost(item.cost);
                          }}
                          className="w-7 h-7 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Simular / Ajustar costo"
                        >
                          <Edit3 size={12} />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explanation Banner */}
      <div className="mt-6 bg-card border border-border/60 rounded-lg p-4 flex items-start gap-3 text-xs text-muted-foreground">
        <Info size={16} className="text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground mb-0.5">¿Cómo se calcula el margen de ganancia?</p>
          <p>
            El <strong>Margen (%)</strong> representa el porcentaje del precio que queda libre de costos directos de insumos:{" "}
            <code>(Precio de Venta - Costo de Insumos) ÷ Precio de Venta × 100</code>. Podés hacer clic en el lápiz al lado de cualquier costo para simular cómo impactaría un aumento de insumos o ajustar el valor exacto de tus recetas.
          </p>
        </div>
      </div>

      {/* Modal to adjust cost */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-lg shadow-2xl max-w-sm w-full overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <Percent size={15} className="text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">Ajustar Costo Directo</h3>
                </div>
                <button onClick={() => setEditingItem(null)} className="text-muted-foreground hover:text-foreground">
                  <X size={15} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <span className="text-xs font-semibold text-foreground block">{editingItem.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    Precio actual al público: <strong>${editingItem.salePrice.toLocaleString("es-AR")}</strong>
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                    Costo de Insumos / Compra ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={tempCost}
                    onChange={e => setTempCost(Number(e.target.value) || 0)}
                    className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm text-foreground font-semibold focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Live simulation */}
                <div className="bg-muted/30 border border-border/40 rounded p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ganancia Neta resultante:</span>
                    <strong className="text-foreground">
                      ${Math.max(0, editingItem.salePrice - tempCost).toLocaleString("es-AR")}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margen de Rentabilidad:</span>
                    <strong className="text-emerald-500">
                      {editingItem.salePrice > 0
                        ? (((editingItem.salePrice - tempCost) / editingItem.salePrice) * 100).toFixed(1)
                        : 0}
                      %
                    </strong>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-3 py-1.5 rounded-sm border border-border text-xs text-muted-foreground hover:bg-muted/50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCost}
                    className="px-3 py-1.5 rounded-sm bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5"
                  >
                    <Check size={12} />
                    Guardar y Recalcular
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
