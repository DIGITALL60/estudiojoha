import { fetchAPI } from "@/lib/api";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, X, Edit2, Download, Phone, Trash2, Truck,
  MessageCircle, Mail, User, FileText, ShoppingBag, ExternalLink,
  Building, DollarSign, Calendar
} from "lucide-react";
import AdminLayout from "./AdminLayout";

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  category?: string | null;
  contactName?: string | null;
  notes?: string | null;
  createdAt?: string | null;
}

interface ExpenseItem {
  id: string;
  concept: string;
  amount: number;
  category: string;
  paymentMethod?: string;
  date: string;
  supplierId?: string | null;
  supplierName?: string | null;
}

const CATEGORIES = [
  "Todos",
  "Insumos",
  "Coloración",
  "Equipamiento",
  "Cuidado Capilar",
  "Servicios",
  "Otros",
];

const COLORS = ["#7c3aed", "#db2777", "#0891b2", "#d97706", "#16a34a", "#dc2626", "#ea580c", "#0d9488"];

function cleanPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("549")) return digits;
  if (digits.startsWith("54")) return `549${digits.slice(2)}`;
  if (digits.length >= 10) return `549${digits}`;
  return digits;
}

function SupplierModal({
  supplier,
  onClose,
  onSaved,
}: {
  supplier?: Supplier | null;
  onClose: () => void;
  onSaved: (s: Supplier) => void;
}) {
  const [form, setForm] = useState({
    name: supplier?.name ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    category: supplier?.category ?? "Insumos",
    contactName: supplier?.contactName ?? "",
    notes: supplier?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("El nombre del proveedor es obligatorio");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const isEdit = !!supplier;
      const res = await fetchAPI(isEdit ? `/api/data/suppliers/${supplier!.id}` : "/api/data/suppliers", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al guardar los datos del proveedor.");
      }
      const saved = await res.json();
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al guardar. Verificá la conexión.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95 }}
        className="bg-card border border-border rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              {supplier ? "Editar Proveedor" : "Nuevo Proveedor"}
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground block mb-1">
                Nombre de la Empresa / Proveedor *
              </label>
              <input
                type="text"
                placeholder="Ej. Distribuidora Capilar Bellísima"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground block mb-1">
                  Rubro / Categoría
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="Insumos">🧴 Insumos</option>
                  <option value="Coloración">🎨 Coloración</option>
                  <option value="Cuidado Capilar">✨ Cuidado Capilar</option>
                  <option value="Equipamiento">✂️ Equipamiento / Mobiliario</option>
                  <option value="Servicios">🔧 Servicios / Mantenimiento</option>
                  <option value="Limpieza">🧹 Limpieza</option>
                  <option value="Otros">📌 Otros</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground block mb-1">
                  Persona de Contacto / Vendedor
                </label>
                <input
                  type="text"
                  placeholder="Ej. Lucas (Vendedor L'Oréal)"
                  value={form.contactName}
                  onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground block mb-1">
                  Teléfono / WhatsApp (para hacer pedidos)
                </label>
                <input
                  type="tel"
                  placeholder="Ej. +54 9 351 123 4567"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="ventas@proveedor.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground block mb-1">
                Datos Bancarios / Alias / Días de Pedido / Notas
              </label>
              <textarea
                rows={3}
                placeholder="Ej. Alias: insumos.bellisima.mp - CBU: 00000... - Pedidos los lunes antes de las 13hs, entrega miércoles."
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                className="w-full bg-background border border-border rounded-md p-3 text-xs text-foreground focus:outline-none focus:border-primary resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border bg-card">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-md text-xs font-semibold hover:bg-muted text-foreground transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Guardando..." : supplier ? "Guardar Cambios" : "Crear Proveedor"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Modal para ver los gastos / compras asociados a este proveedor
function SupplierHistoryModal({
  supplier,
  expenses,
  onClose,
}: {
  supplier: Supplier;
  expenses: ExpenseItem[];
  onClose: () => void;
}) {
  const supplierExpenses = expenses.filter(
    (e) => e.supplierId === supplier.id || e.supplierName?.toLowerCase() === supplier.name.toLowerCase()
  );

  const totalSpent = supplierExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95 }}
        className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShoppingBag size={16} className="text-primary" />
              Historial de Compras — {supplier.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {supplierExpenses.length} egresos registrados · Total invertido: ${totalSpent.toLocaleString("es-AR")}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {supplierExpenses.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs">
              <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
              Todavía no hay egresos registrados a nombre de este proveedor.
            </div>
          ) : (
            <div className="space-y-2">
              {supplierExpenses.map((e) => (
                <div
                  key={e.id}
                  className="bg-background border border-border/60 rounded-md p-3 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold text-foreground">{e.concept}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {e.date}
                      </span>
                      <span>·</span>
                      <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{e.category}</span>
                      <span>·</span>
                      <span>{e.paymentMethod || "Efectivo"}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-rose-400 text-sm">
                      -${e.amount.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
          <span className="text-xs text-muted-foreground">
            Total acumulado: <strong className="text-foreground">${totalSpent.toLocaleString("es-AR")}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-card border border-border text-foreground rounded-md text-xs hover:bg-muted"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Proveedores() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [historySupplier, setHistorySupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      const [supRes, expRes] = await Promise.all([
        fetchAPI("/api/data/suppliers"),
        fetchAPI("/api/data/expenses"),
      ]);
      const supData = await supRes.json().catch(() => []);
      const expData = await expRes.json().catch(() => []);
      setSuppliers(Array.isArray(supData) ? supData : []);
      setExpenses(Array.isArray(expData) ? expData : []);
    } catch (err) {
      console.error("Error loading suppliers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaved = (saved: Supplier) => {
    setSuppliers((prev) => {
      const exists = prev.find((s) => s.id === saved.id);
      if (exists) return prev.map((s) => (s.id === saved.id ? saved : s));
      return [saved, ...prev];
    });
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    setDeleting(true);
    try {
      const res = await fetchAPI(`/api/data/suppliers/${supplierToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("No se pudo eliminar el proveedor");
      setSuppliers((prev) => prev.filter((s) => s.id !== supplierToDelete.id));
      setSupplierToDelete(null);
    } catch (err: any) {
      alert(err.message || "Error al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (activeCategory !== "Todos" && s.category !== activeCategory) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = (s.name || "").toLowerCase().includes(q);
        const matchContact = (s.contactName || "").toLowerCase().includes(q);
        const matchPhone = (s.phone || "").toLowerCase().includes(q);
        const matchNotes = (s.notes || "").toLowerCase().includes(q);
        const matchCat = (s.category || "").toLowerCase().includes(q);
        if (!matchName && !matchContact && !matchPhone && !matchNotes && !matchCat) {
          return false;
        }
      }
      return true;
    });
  }, [suppliers, search, activeCategory]);

  const exportCSV = () => {
    const headers = ["Proveedor", "Rubro", "Contacto", "Teléfono", "Email", "Notas"];
    const rows = filteredSuppliers.map((s) => [
      s.name,
      s.category || "Insumos",
      s.contactName || "",
      s.phone || "",
      s.email || "",
      (s.notes || "").replace(/\n/g, " "),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Proveedores_EstudioJoha.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout
      title="Proveedores"
      subtitle="Base de datos de proveedores, compras y contactos comerciales para pedidos"
    >
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 bg-card border border-border/50 rounded-lg p-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, vendedor, insumo, teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border border-border pl-8 pr-3 py-2 rounded-md text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 border border-border bg-card text-foreground rounded-md text-xs hover:bg-muted transition-colors"
          >
            <Download size={13} />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={() => {
              setEditingSupplier(null);
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={14} />
            <span>+ Nuevo Proveedor</span>
          </button>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Suppliers Grid / Cards */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">Cargando proveedores...</div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-lg p-10 text-center text-muted-foreground">
          <Truck size={40} className="mx-auto mb-3 opacity-30 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">No se encontraron proveedores</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            {search ? "No hay proveedores que coincidan con la búsqueda." : "Comenzá agregando tu primer proveedor para tener sus datos a mano al registrar egresos."}
          </p>
          <button
            onClick={() => {
              setEditingSupplier(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:bg-primary/90"
          >
            <Plus size={14} />
            <span>Registrar Proveedor</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier, idx) => {
            const supplierExpenses = expenses.filter(
              (e) => e.supplierId === supplier.id || e.supplierName?.toLowerCase() === supplier.name.toLowerCase()
            );
            const totalSpent = supplierExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
            const waPhone = supplier.phone ? cleanPhoneForWhatsApp(supplier.phone) : "";

            return (
              <motion.div
                key={supplier.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: idx * 0.03 }}
                className="bg-card border border-border/50 hover:border-primary/40 rounded-lg p-5 flex flex-col justify-between transition-all shadow-xs group"
              >
                <div>
                  {/* Header: Name and Category badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      >
                        {supplier.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors leading-tight">
                          {supplier.name}
                        </h3>
                        {supplier.contactName && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <User size={11} /> {supplier.contactName}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                      {supplier.category || "Insumos"}
                    </span>
                  </div>

                  {/* Contact Info Buttons */}
                  <div className="space-y-1.5 my-3 pt-2 border-t border-border/40 text-xs">
                    {supplier.phone ? (
                      <div className="flex items-center justify-between py-1">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Phone size={12} /> {supplier.phone}
                        </span>
                        <div className="flex items-center gap-1">
                          {waPhone && (
                            <a
                              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                                `¡Hola ${supplier.contactName || supplier.name}! Te escribo de Estudio Joha para hacerte un pedido.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="Abrir WhatsApp para pedir"
                            >
                              <MessageCircle size={11} />
                              <span>Pedir</span>
                            </a>
                          )}
                          <a
                            href={`tel:${supplier.phone}`}
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                            title="Llamar"
                          >
                            <Phone size={12} />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/60 italic">Sin teléfono registrado</p>
                    )}

                    {supplier.email && (
                      <div className="flex items-center gap-1.5 text-muted-foreground py-0.5">
                        <Mail size={12} />
                        <a
                          href={`mailto:${supplier.email}`}
                          className="hover:text-primary hover:underline truncate"
                        >
                          {supplier.email}
                        </a>
                      </div>
                    )}

                    {supplier.notes && (
                      <div className="bg-muted/30 border border-border/40 rounded p-2 text-[11px] text-muted-foreground mt-2 line-clamp-3">
                        <span className="font-semibold text-foreground/80 block mb-0.5">Notas / Datos de pago:</span>
                        {supplier.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer: Purchases stats & Actions */}
                <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                  <div>
                    <button
                      onClick={() => setHistorySupplier(supplier)}
                      className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                      title="Ver compras registradas"
                    >
                      <ShoppingBag size={12} />
                      <span>{supplierExpenses.length} compras</span>
                      {totalSpent > 0 && (
                        <span className="font-semibold text-foreground">
                          · ${totalSpent.toLocaleString("es-AR")}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingSupplier(supplier);
                        setShowModal(true);
                      }}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
                      title="Editar proveedor"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => setSupplierToDelete(supplier)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                      title="Eliminar proveedor"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <SupplierModal
            supplier={editingSupplier}
            onClose={() => setShowModal(false)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>

      {/* Purchases History Modal */}
      <AnimatePresence>
        {historySupplier && (
          <SupplierHistoryModal
            supplier={historySupplier}
            expenses={expenses}
            onClose={() => setHistorySupplier(null)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {supplierToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-card border border-border rounded-lg p-5 max-w-sm w-full shadow-2xl space-y-3"
            >
              <h3 className="font-semibold text-sm text-foreground">¿Eliminar proveedor?</h3>
              <p className="text-xs text-muted-foreground">
                Se eliminará el proveedor <strong className="text-foreground">{supplierToDelete.name}</strong> de la base de datos. Los egresos pasados se mantendrán registrados.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setSupplierToDelete(null)}
                  className="px-3 py-1.5 border border-border text-foreground text-xs rounded-md hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 bg-destructive text-destructive-foreground text-xs font-semibold rounded-md hover:bg-destructive/90"
                >
                  {deleting ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

