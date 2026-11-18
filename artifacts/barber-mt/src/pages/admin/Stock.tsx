import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, AlertTriangle, Package, Edit2, Trash2, ChevronDown, ChevronUp, X, Save, Check, Upload, Loader2, Image as ImageIcon, Truck, Calendar, History, RotateCcw, Archive } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { fetchAPI } from "@/lib/api";

export interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  price: number;
  imageUrl?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
}

export interface SupplierItem {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  contactName?: string | null;
}

export interface ConsumedSupplyItem {
  id: string;
  productId: string;
  productName: string;
  category: string;
  supplierName?: string | null;
  quantity: number;
  unit: string;
  cost: number;
  date: string;
  notes?: string | null;
  createdAt?: string;
}

export default function Stock() {
  const [stockItems, setStockItems] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [consumedSupplies, setConsumedSupplies] = useState<ConsumedSupplyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"Todos" | "Insumos" | "Shop" | "Utilizado">("Todos");
  const [sortBy, setSortBy] = useState<"name" | "stock">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [editing, setEditing] = useState<Product | null>(null);
  const [markingConsumed, setMarkingConsumed] = useState<Product | boolean | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await fetchAPI("/api/data/products");
      if (res.ok) setStockItems(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetchAPI("/api/data/suppliers");
      if (res.ok) setSuppliers(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConsumedSupplies = async () => {
    try {
      const res = await fetchAPI("/api/data/consumed-supplies");
      if (res.ok) setConsumedSupplies(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
    fetchConsumedSupplies();
  }, []);

  const handleDeleteConsumed = async (id: string) => {
    if (!confirm("¿Eliminar este registro de insumo agotado? Esto restaurará el stock correspondiente del producto.")) return;
    try {
      const res = await fetchAPI(`/api/data/consumed-supplies/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConsumedSupplies(prev => prev.filter(c => c.id !== id));
        fetchProducts();
      }
    } catch (err) {
      alert("Error al eliminar el registro");
    }
  };

  const filteredConsumed = consumedSupplies.filter(c => {
    const term = search.toLowerCase();
    return (
      c.productName.toLowerCase().includes(term) ||
      (c.supplierName && c.supplierName.toLowerCase().includes(term)) ||
      (c.notes && c.notes.toLowerCase().includes(term)) ||
      c.date.includes(term)
    );
  });

  const lowStockItems = stockItems.filter(i => i.stock <= i.minStock);

  const filtered = stockItems
    .filter(i => {
      if (filterType === "Insumos" && i.category !== "Insumos") return false;
      if (filterType === "Shop" && i.category !== "Shop") return false;
      const term = search.toLowerCase();
      return i.name.toLowerCase().includes(term) || (i.supplierName && i.supplierName.toLowerCase().includes(term));
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "name") return a.name.localeCompare(b.name) * dir;
      return (a.stock - b.stock) * dir;
    });

  const handleSort = (col: "name" | "stock") => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const handleNew = () => {
    setEditing({
      id: "",
      name: "",
      category: filterType === "Shop" ? "Shop" : "Insumos",
      stock: 0,
      minStock: 0,
      unit: "unidad",
      price: 0,
      imageUrl: "",
      supplierId: null,
      supplierName: null,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await fetchAPI(`/api/data/products/${id}`, { method: "DELETE" });
      setStockItems(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert("Error al eliminar");
    }
  };

  return (
    <AdminLayout
      title="Stock"
      subtitle={`${stockItems.length} productos · ${lowStockItems.length} con stock bajo`}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMarkingConsumed(true)}
            className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/30 text-xs font-semibold px-3 py-2 rounded-sm hover:bg-amber-500/20 transition-colors"
          >
            <Archive size={13} />
            Registrar insumo agotado
          </button>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-sm hover:bg-primary/90 transition-colors"
          >
            <Plus size={13} />
            Agregar producto
          </button>
        </div>
      }
    >
      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-400">{lowStockItems.length} productos bajo mínimo</p>
            <p className="text-xs text-muted-foreground mt-1">
              {lowStockItems.map(i => i.name).join(" - ")}
            </p>
          </div>
        </motion.div>
      )}

      {/* Stats Boxes */}
      {filterType === "Utilizado" ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col justify-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Insumos agotados</span>
            <span className="text-xl font-bold text-amber-500">{consumedSupplies.length}</span>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col justify-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Unidades gastadas</span>
            <span className="text-xl font-bold text-primary">
              {consumedSupplies.reduce((acc, c) => acc + (c.quantity || 0), 0)}
            </span>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col justify-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Costo total insumos</span>
            <span className="text-xl font-bold text-red-400">
              $ {consumedSupplies.reduce((acc, c) => acc + ((c.quantity || 1) * (c.cost || 0)), 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col justify-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Último descarte</span>
            <span className="text-sm font-semibold text-foreground">
              {consumedSupplies[0]?.date ? new Date(consumedSupplies[0].date + "T12:00:00").toLocaleDateString("es-AR") : "Sin registros"}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col justify-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Productos activos</span>
            <span className="text-xl font-bold text-primary">{stockItems.filter(i => i.stock > 0).length}</span>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col justify-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Bajo mínimo</span>
            <span className="text-xl font-bold text-amber-500">{lowStockItems.length}</span>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col justify-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Total productos</span>
            <span className="text-xl font-bold text-blue-400">{stockItems.length}</span>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col justify-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-2">Valor inventario</span>
            <span className="text-xl font-bold text-emerald-500">
              $ {stockItems.reduce((acc, i) => acc + (i.stock > 0 ? i.stock * i.price : 0), 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
        {/* Tabs */}
        <div className="flex bg-card border border-border/50 rounded-sm overflow-hidden p-1 gap-1 flex-shrink-0">
          {(["Todos", "Insumos", "Shop", "Utilizado"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-sm transition-colors ${filterType === tab ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
            >
              {tab === "Insumos" ? "Uso Interno" : tab === "Shop" ? "Venta Shop" : tab === "Utilizado" ? "Stock Utilizado" : "Todos"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={filterType === "Utilizado" ? "Buscar por insumo, proveedor, nota o fecha..." : "Buscar producto..."}
            className="w-full bg-card border border-border rounded-sm pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      {filterType === "Utilizado" ? (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="text-left px-4 py-3">
                  <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">Fecha Terminado</span>
                </th>
                <th className="text-left px-4 py-3">
                  <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">Insumo Agotado</span>
                </th>
                <th className="text-right px-4 py-3">
                  <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">Cantidad</span>
                </th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">
                  <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">Costo Estimado</span>
                </th>
                <th className="text-left px-4 py-3 hidden md:table-cell">
                  <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">Notas / Motivo</span>
                </th>
                <th className="px-4 py-3 w-16 text-right" />
              </tr>
            </thead>
            <tbody>
              {filteredConsumed.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                    No se registran insumos agotados en este momento. Podés usar "Registrar insumo agotado" arriba a la derecha.
                  </td>
                </tr>
              ) : (
                filteredConsumed.map((item, i) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border/20 last:border-0 hover:bg-accent/5 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Calendar size={12} className="text-amber-500" />
                        <span>{new Date(item.date + "T12:00:00").toLocaleDateString("es-AR")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-xs font-semibold text-foreground block">{item.productName}</span>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold bg-muted/40 px-1.5 py-0.5 rounded border border-border/40">
                            {item.category}
                          </span>
                          {item.supplierName && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-muted/40 px-1.5 py-0.5 rounded border border-border/40">
                              <Truck size={10} className="text-primary/80 flex-shrink-0" />
                              <span className="truncate max-w-[150px]">{item.supplierName}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-bold text-amber-500">
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">
                        ${((item.cost || 0) * (item.quantity || 1)).toLocaleString("es-AR")}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {item.notes || <span className="opacity-40 italic">Sin notas</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteConsumed(item.id)}
                        title="Eliminar registro y restaurar stock"
                        className="w-7 h-7 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="text-left px-4 py-3">
                  <button onClick={() => handleSort("name")} className="flex items-center gap-1 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors">
                    Producto
                    {sortBy === "name" && (sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                  </button>
                </th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">
                  <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">Categoría</span>
                </th>
                <th className="text-right px-4 py-3">
                  <button onClick={() => handleSort("stock")} className="flex items-center gap-1 text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors ml-auto">
                    Stock
                    {sortBy === "stock" && (sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                  </button>
                </th>
                <th className="text-right px-4 py-3 hidden md:table-cell">
                  <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted-foreground">Precio unit.</span>
                </th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const isLow = item.stock <= item.minStock;
                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border/20 last:border-0 hover:bg-accent/5 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-9 h-9 rounded-md object-cover border border-border/60 shadow-xs flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-muted/40 border border-border/40 flex items-center justify-center flex-shrink-0">
                            <Package size={14} className={isLow ? "text-amber-400" : "text-muted-foreground"} />
                          </div>
                        )}
                        <div>
                          <span className="text-xs font-semibold text-foreground block">{item.name}</span>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {item.supplierName && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-muted/40 px-1.5 py-0.5 rounded border border-border/40">
                                <Truck size={10} className="text-primary/80 flex-shrink-0" />
                                <span className="truncate max-w-[150px]">{item.supplierName}</span>
                              </span>
                            )}
                            {item.category === "Shop" && (
                              <span className="text-[9px] uppercase tracking-wider text-emerald-500 font-semibold bg-emerald-500/10 px-1.5 py-0.2 rounded inline-block">
                                Venta Shop
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-[11px] text-muted-foreground">{item.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isLow && <AlertTriangle size={11} className="text-amber-400" />}
                        <span className={`text-xs font-semibold ${isLow ? "text-amber-400" : "text-foreground"}`}>
                          {item.stock} {item.unit}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50">/ mín {item.minStock}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">${item.price.toLocaleString("es-AR")}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button
                          onClick={() => setMarkingConsumed(item)}
                          title="Registrar como agotado / tirado"
                          className="w-7 h-7 flex items-center justify-center rounded-sm text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10 transition-all"
                        >
                          <Archive size={12} />
                        </button>
                        <button onClick={() => setEditing(item)} className="w-7 h-7 flex items-center justify-center rounded-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="w-7 h-7 flex items-center justify-center rounded-sm text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <ProductModal
            product={editing}
            suppliers={suppliers}
            onSupplierCreated={(s) => setSuppliers(prev => [s, ...prev])}
            onClose={() => setEditing(null)}
            onSave={(p, isNew) => {
              if (isNew) setStockItems([...stockItems, p]);
              else setStockItems(stockItems.map(item => item.id === p.id ? p : item));
              setEditing(null);
            }}
          />
        )}
        {markingConsumed && (
          <MarkConsumedModal
            initialProduct={typeof markingConsumed === "object" ? markingConsumed : null}
            products={stockItems}
            onClose={() => setMarkingConsumed(null)}
            onSaved={() => {
              fetchProducts();
              fetchConsumedSupplies();
            }}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

function ProductModal({
  product,
  suppliers,
  onSupplierCreated,
  onClose,
  onSave
}: {
  product: Product;
  suppliers: SupplierItem[];
  onSupplierCreated: (s: SupplierItem) => void;
  onClose: () => void;
  onSave: (p: Product, isNew: boolean) => void;
}) {
  const [form, setForm] = useState(product);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [linkedServices, setLinkedServices] = useState<{serviceId: string, amount: number}[]>([]);
  const [filterCat, setFilterCat] = useState("Todas");
  const [showInlineSupplierModal, setShowInlineSupplierModal] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [newSupContact, setNewSupContact] = useState("");
  const [savingSup, setSavingSup] = useState(false);

  const handleSaveInlineSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return alert("Por favor ingresá el nombre del proveedor");
    setSavingSup(true);
    try {
      const res = await fetchAPI("/api/data/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSupName.trim(),
          phone: newSupPhone.trim() || null,
          contactName: newSupContact.trim() || null,
          category: form.category === "Insumos" ? "Insumos" : "General",
        }),
      });
      if (res.ok) {
        const created = await res.json();
        onSupplierCreated(created);
        setForm(prev => ({
          ...prev,
          supplierId: created.id,
          supplierName: created.name,
        }));
        setShowInlineSupplierModal(false);
        setNewSupName("");
        setNewSupPhone("");
        setNewSupContact("");
      } else {
        alert("Error al guardar proveedor");
      }
    } catch {
      alert("Error al guardar proveedor");
    } finally {
      setSavingSup(false);
    }
  };

  useEffect(() => {
    fetchAPI("/api/data/services").then(r => r.json()).then(setServices).catch(console.error);
    if (product.id) {
      fetchAPI("/api/data/service-products").then(r => r.json()).then(data => {
        const links = data.filter((d: any) => d.productId === product.id);
        setLinkedServices(links.map((l: any) => ({ serviceId: l.serviceId, amount: l.amount })));
      }).catch(console.error);
    }
  }, [product.id]);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert("Máximo 5MB. Por favor comprimí la imagen.");

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setForm(f => ({ ...f, imageUrl: base64 }));
      setUploadingImage(true);
      try {
        const res = await fetchAPI("/api/data/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, folder: "estudiojoha/products" }),
        });
        if (res.ok) {
          const { url } = await res.json();
          setForm(f => ({ ...f, imageUrl: url }));
        }
      } catch {
        // Fallback to base64
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (uploadingImage) {
      alert("Esperá a que termine de subirse la imagen.");
      return;
    }
    setSaving(true);
    const isNew = !product.id;
    try {
      const url = isNew ? "/api/data/products" : `/api/data/products/${product.id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetchAPI(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, services: linkedServices }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSave(await res.json(), isNew);
    } catch (err) {
      alert("Error saving");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }} className="bg-card border border-border shadow-2xl rounded-sm w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <h3 className="text-sm font-semibold mb-4">{product.id ? "Editar" : "Nuevo"} Producto</h3>
        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Nombre</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-background border border-border rounded-sm px-3 py-2 text-xs focus:border-primary focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Tipo de Producto</label>
              <select 
                value={form.category} 
                onChange={e => setForm({...form, category: e.target.value})} 
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-xs focus:border-primary focus:outline-none"
              >
                <option value="Insumos">Insumo (Uso Interno)</option>
                <option value="Shop">Producto (Venta Shop)</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Unidad</label>
              <select 
                value={form.unit} 
                onChange={e => setForm({...form, unit: e.target.value})} 
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-xs focus:border-primary focus:outline-none"
              >
                <option value="unidad">unidad</option>
                <option value="par">par</option>
                <option value="kit">kit</option>
                <option value="ml">ml (mililitro)</option>
                <option value="litro">litro</option>
                <option value="gramo">gramo</option>
                <option value="kg">kg (kilogramo)</option>
                <option value="cm">cm (centímetro)</option>
              </select>
            </div>
          </div>

          {/* Selector de Proveedor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-1.5">
                <Truck size={12} className="text-primary" />
                Proveedor {form.category === "Insumos" ? "(Uso Interno)" : "(Opcional)"}
              </label>
              {form.supplierId && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, supplierId: null, supplierName: null })}
                  className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                >
                  Quitar proveedor
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={form.supplierId || ""}
                onChange={e => {
                  const id = e.target.value;
                  const found = suppliers.find(s => s.id === id);
                  setForm({
                    ...form,
                    supplierId: id || null,
                    supplierName: found ? found.name : null,
                  });
                }}
                className="flex-1 bg-background border border-border rounded-sm px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">-- Sin proveedor asociado --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    🚚 {s.name} {s.contactName ? `(${s.contactName})` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowInlineSupplierModal(true)}
                className="px-2.5 py-2 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-sm hover:bg-primary/20 transition-colors flex items-center gap-1 shadow-2xs whitespace-nowrap"
                title="Registrar nuevo proveedor"
              >
                <Plus size={13} />
                <span>Nuevo</span>
              </button>
            </div>

            {(() => {
              const selectedSup = suppliers.find(s => s.id === form.supplierId);
              if (!selectedSup) return null;
              return (
                <div className="mt-1.5 flex items-center justify-between text-[11px] bg-muted/30 border border-border/50 rounded px-2.5 py-1.5 text-muted-foreground">
                  <span className="truncate mr-2">
                    {selectedSup.contactName && <strong className="text-foreground mr-1">{selectedSup.contactName} ·</strong>}
                    {selectedSup.phone || "Sin teléfono registrado"}
                  </span>
                  {selectedSup.phone && (
                    <a
                      href={`https://wa.me/${selectedSup.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hola ${selectedSup.contactName || selectedSup.name}, te consulto por stock del insumo "${form.name || "insumo"}" desde Estudio Joha.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-500 hover:text-emerald-400 font-semibold flex items-center gap-1 flex-shrink-0"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              );
            })()}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Stock</label>
              <input type="number" value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} className="w-full bg-background border border-border rounded-sm px-3 py-2 text-xs focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Stock Mínimo</label>
              <input type="number" value={form.minStock} onChange={e => setForm({...form, minStock: Number(e.target.value)})} className="w-full bg-background border border-border rounded-sm px-3 py-2 text-xs focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5">Precio Unit ($)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-muted-foreground text-xs font-semibold">$</span>
                <input type="number" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="w-full bg-background border border-border rounded-sm pl-7 pr-3 py-2 text-xs focus:border-primary focus:outline-none font-semibold" />
              </div>
            </div>
          </div>

          {/* Imagen del Producto */}
          <div>
            <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1.5 flex items-center justify-between">
              <span>Foto del Producto {form.category === "Shop" && <strong className="text-primary">(Venta Shop)</strong>}</span>
              {uploadingImage && <span className="text-[10px] text-primary flex items-center gap-1 font-semibold animate-pulse"><Loader2 size={10} className="animate-spin" /> Subiendo...</span>}
            </label>

            {form.imageUrl ? (
              <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border group bg-muted/20 flex items-center justify-center">
                <img src={form.imageUrl} alt="Vista previa" className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="cursor-pointer bg-primary text-primary-foreground text-xs px-2.5 py-1.5 rounded font-semibold hover:bg-primary/90 flex items-center gap-1">
                    <Upload size={12} /> Cambiar
                    <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, imageUrl: "" })}
                    className="bg-red-500/80 hover:bg-red-500 text-white text-xs px-2.5 py-1.5 rounded font-semibold flex items-center gap-1"
                  >
                    <X size={12} /> Quitar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-lg p-3.5 flex flex-col items-center justify-center gap-1 cursor-pointer bg-muted/10 hover:bg-muted/20 transition-all">
                  <Upload size={16} className="text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">Subir imagen del producto</span>
                  <span className="text-[10px] text-muted-foreground">PNG, JPG o WEBP (máx. 5MB)</span>
                  <input type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">o Link:</span>
                  <input
                    type="url"
                    placeholder="https://.../foto.jpg"
                    value={form.imageUrl || ""}
                    onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                    className="flex-1 bg-background border border-border rounded-sm px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {form.category === "Insumos" && (
          <div className="mt-4 border-t border-border/50 pt-4">
            <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-2">Servicios que lo utilizan</label>
            
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-none">
              {["Todas", ...Array.from(new Set(services.map(s => s.category)))].map(cat => (
                <button
                  key={cat as string}
                  onClick={(e) => { e.preventDefault(); setFilterCat(cat as string); }}
                  className={`px-3 py-1 text-[10px] rounded-full whitespace-nowrap border transition-colors ${filterCat === cat ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent border-border text-muted-foreground hover:border-primary/50'}`}
                >
                  {cat as string}
                </button>
              ))}
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
              {(() => {
                const visibleServices = services.filter(s => filterCat === "Todas" || s.category === filterCat);
                const allSelected = visibleServices.length > 0 && visibleServices.every(srv => linkedServices.some(l => l.serviceId === srv.id));
                
                const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
                  if (e.target.checked) {
                    const newLinks = visibleServices
                      .filter(srv => !linkedServices.some(l => l.serviceId === srv.id))
                      .map(srv => ({ serviceId: srv.id, amount: 1 }));
                    setLinkedServices([...linkedServices, ...newLinks]);
                  } else {
                    const visibleIds = new Set(visibleServices.map(s => s.id));
                    setLinkedServices(linkedServices.filter(l => !visibleIds.has(l.serviceId)));
                  }
                };

                return (
                  <div className="flex items-center gap-2 pb-2 mb-2 border-b border-border/40 sticky top-0 bg-card z-10">
                    <input 
                      type="checkbox" 
                      checked={allSelected}
                      onChange={handleSelectAll}
                      className="rounded-sm border-border accent-primary"
                    />
                    <span className="text-xs font-semibold text-foreground flex-1">Seleccionar todas</span>
                  </div>
                );
              })()}

              {services.filter(s => filterCat === "Todas" || s.category === filterCat).map(srv => {
                const linked = linkedServices.find(l => l.serviceId === srv.id);
                const isChecked = !!linked;
                return (
                  <div key={srv.id} className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={(e) => {
                        if (e.target.checked) {
                          setLinkedServices([...linkedServices, { serviceId: srv.id, amount: 1 }]);
                        } else {
                          setLinkedServices(linkedServices.filter(l => l.serviceId !== srv.id));
                        }
                      }}
                      className="rounded-sm border-border accent-primary"
                    />
                    <span className="text-xs text-foreground flex-1">{srv.name}</span>
                    {isChecked && (
                      <div className="flex items-center gap-1">
                        <input 
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={linked?.amount || 1}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setLinkedServices(linkedServices.map(l => l.serviceId === srv.id ? { ...l, amount: val } : l));
                          }}
                          className="w-16 bg-background border border-border rounded-sm px-2 py-1 text-xs focus:border-primary focus:outline-none"
                        />
                        <span className="text-[10px] text-muted-foreground">{form.unit}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-xs rounded-sm border border-border hover:bg-muted transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-xs rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>

        {/* Modal Crear Proveedor Rápido */}
        <AnimatePresence>
          {showInlineSupplierModal && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border shadow-2xl rounded-sm p-5 w-full max-w-sm"
              >
                <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Truck size={15} className="text-primary" />
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Nuevo Proveedor</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInlineSupplierModal(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                </div>

                <form onSubmit={handleSaveInlineSupplier} className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">
                      Nombre o Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      value={newSupName}
                      onChange={e => setNewSupName(e.target.value)}
                      placeholder="Ej: Distribuidora Bella..."
                      className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={newSupPhone}
                      onChange={e => setNewSupPhone(e.target.value)}
                      placeholder="Ej: 3512345678"
                      className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">
                      Contacto / Vendedor
                    </label>
                    <input
                      type="text"
                      value={newSupContact}
                      onChange={e => setNewSupContact(e.target.value)}
                      placeholder="Ej: Marcelo"
                      className="w-full bg-background border border-border rounded-sm px-3 py-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowInlineSupplierModal(false)}
                      className="px-3 py-1.5 rounded-sm border border-border text-xs text-muted-foreground hover:bg-muted/50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingSup}
                      className="px-3 py-1.5 rounded-sm bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {savingSup && <Loader2 size={12} className="animate-spin" />}
                      Guardar
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function MarkConsumedModal({
  initialProduct,
  products,
  onClose,
  onSaved,
}: {
  initialProduct?: Product | null;
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProduct?.id || "");
  const [quantity, setQuantity] = useState<number>(1);
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find(p => p.id === selectedProductId) || initialProduct;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = selectedProduct;
    if (!prod) {
      alert("Por favor selecciona un producto.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetchAPI("/api/data/consumed-supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: prod.id,
          productName: prod.name,
          category: prod.category || "Insumos",
          supplierName: prod.supplierName || null,
          quantity: Number(quantity) || 1,
          unit: prod.unit || "unidad",
          cost: prod.price || 0,
          date: date || new Date().toISOString().split("T")[0],
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Error al registrar insumo agotado");
      onSaved();
      onClose();
    } catch (err: any) {
      alert(err.message || "Error al registrar el insumo utilizado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border rounded-lg shadow-2xl max-w-md w-full overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <Archive size={16} className="text-amber-500" />
            <h3 className="font-semibold text-foreground text-sm">Registrar Insumo Agotado / Descartado</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">
              Producto o Insumo agotado *
            </label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              required
            >
              <option value="">-- Seleccionar producto --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock actual: {p.stock} {p.unit}) {p.supplierName ? `· Prov: ${p.supplierName}` : ""}
                </option>
              ))}
            </select>
            {selectedProduct && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Stock actual: <span className="font-medium text-foreground">{selectedProduct.stock} {selectedProduct.unit}</span>
                {selectedProduct.supplierName && ` · Proveedor: ${selectedProduct.supplierName}`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">
                Cantidad agotada / tirada *
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">
                Fecha cuando se terminó *
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-1">
              Notas / Motivo (opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Se terminó en cabina, frasco roto, vencido..."
              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3 text-xs text-amber-500 flex items-start gap-2">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>Al registrar el insumo como agotado, se descontará automáticamente del stock disponible y quedará registrado con su fecha.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-sm border border-border text-xs text-muted-foreground hover:bg-muted/50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-sm bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              Confirmar Insumo Agotado
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
