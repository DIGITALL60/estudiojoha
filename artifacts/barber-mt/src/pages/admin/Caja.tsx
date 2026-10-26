import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronDown, Download, Wallet, Plus, Trash2, Pencil, TrendingUp, TrendingDown, BarChart3, Tag, Check, X, Calendar as CalendarIcon, Package } from "lucide-react";
import AdminLayout from "./AdminLayout";
import ClientSearchSelect from "@/components/ClientSearchSelect";
import ServiceSearchSelect, { type SelectedServiceItem } from "@/components/ServiceSearchSelect";
import ProductSearchSelect, { SelectedProductItem, ProductItem } from "@/components/ProductSearchSelect";
import CalendarPopover from "@/components/CalendarPopover";
import { fetchAPI } from "@/lib/api";

interface AppointmentRow {
  id: string; date: string; time: string; price: number; status: string;
  clientName: string; professionalName: string; serviceName: string; paymentMethod: string;
  shopSales?: number; notes?: string;
  clientId?: string; professionalId?: string; serviceId?: string;
}
interface Professional { id: string; name: string; }
interface Client { id: string; name: string; phone: string; }
interface Service { id: string; name: string; price: number; category?: string; duration?: number; }

interface ExpenseRow {
  id: string; concept: string; amount: number; category: string; paymentMethod?: string; date: string; professionalId?: string;
}

const DEFAULT_EXPENSE_CATEGORIES = [
  "General", "Alquiler", "Luz", "Gas", "Agua", "WiFi",
  "Supermercado", "Insumos", "Sueldos", "Marketing", "Otros"
];

const CATEGORY_ICONS: Record<string, string> = {
  "Alquiler": "🏠", "Luz": "💡", "Gas": "🔥", "Agua": "💧", "WiFi": "📶",
  "Supermercado": "🛒", "Insumos": "🧴", "Sueldos": "💼", "Marketing": "📢",
  "General": "📋", "Otros": "📌", "Limpieza": "🧹", "Publicidad": "📢",
  "Carga de celular": "📱", "Mentorias": "🎓", "Mentorías": "🎓"
};

const VIRTUAL_WALLETS = [
  "Mercado Pago",
  "Banco de Córdoba",
  "Naranja X",
  "Ualá",
  "Personal Pay",
  "Cuenta DNI",
  "Otra Billetera"
];

const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Caja() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newExpense, setNewExpense] = useState({ concept: "", amount: "", category: "General", paymentMethod: "Efectivo", wallet: "Mercado Pago" });
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProductItem[]>([]);
  const [activeTab, setActiveTab] = useState<"dia" | "mes" | "rapido">("dia");
  const [quickAction, setQuickAction] = useState<"cobro" | "shop" | "egreso">("cobro");
  const [newQuickApp, setNewQuickApp] = useState({ clientId: "", professionalId: "", serviceId: "", amount: "", paymentMethod: "Efectivo", time: "10:00" });
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedServicesWithQty, setSelectedServicesWithQty] = useState<SelectedServiceItem[]>([]);
  const [bankAccount, setBankAccount] = useState("Banco de Córdoba");
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);

  // Estados para Categorías personalizadas y dinámicas
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("estudiojoha_custom_expense_categories");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const allExpenseCategories = useMemo(() => {
    return Array.from(new Set([...DEFAULT_EXPENSE_CATEGORIES, ...customCategories]));
  }, [customCategories]);

  // Estados de edición (Lápiz para modificar sin borrar)
  const [editingExpense, setEditingExpense] = useState<{
    id: string;
    concept: string;
    amount: string;
    category: string;
    paymentMethod: string;
    wallet: string;
    date: string;
  } | null>(null);

  const [editingAppointment, setEditingAppointment] = useState<{
    id: string;
    clientName: string;
    serviceName: string;
    price: string;
    shopSales: string;
    paymentMethod: string;
    professionalId: string;
    date: string;
    time: string;
    notes: string;
  } | null>(null);

  // Estados de Calendario
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);
  const [showQuickCalendar, setShowQuickCalendar] = useState(false);

  // Estados de Voucher y Descuento
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code?: string;
    type: "percent" | "fixed";
    value: number;
    label: string;
    amountSaved: number;
  } | null>(null);
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState("");

  const chosenServices = useMemo(() => {
    if (selectedServicesWithQty.length > 0) return selectedServicesWithQty;
    return services.filter(s => selectedServiceIds.includes(s.id)).map(s => ({ ...s, qty: 1 }));
  }, [services, selectedServiceIds, selectedServicesWithQty]);

  const servicesSubtotal = useMemo(() => {
    return chosenServices.reduce((acc, s) => acc + (s.price || 0) * (s.qty || 1), 0);
  }, [chosenServices]);

  const productsSubtotal = useMemo(() => {
    return selectedProducts.reduce((sum, p) => sum + p.price * p.qty, 0);
  }, [selectedProducts]);

  // Filtrar exclusivamente los productos para Venta Shop (excluye uso interno / insumos)
  const shopOnlyProducts = useMemo(() => {
    return products.filter((p) => {
      const cat = (p.category || "").trim().toLowerCase();
      if (cat === "insumos" || cat.includes("insumo") || cat.includes("interno") || cat.includes("uso interno")) {
        return false;
      }
      return true;
    });
  }, [products]);

  const activeSubtotal = useMemo(() => {
    if (quickAction === "shop") {
      return productsSubtotal;
    }
    return servicesSubtotal;
  }, [quickAction, productsSubtotal, servicesSubtotal]);

  const [selectedDate, setSelectedDate] = useState(getLocalDateString());

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchAPI("/api/data/appointments").then(r => r.json()),
      fetchAPI("/api/data/expenses").then(r => r.json()),
      fetchAPI("/api/data/professionals").then(r => r.json()),
      fetchAPI("/api/data/clients").then(r => r.json()),
      fetchAPI("/api/data/services").then(r => r.json()),
      fetchAPI("/api/data/products").then(r => r.json()).catch(() => []),
      fetchAPI("/api/data/settings").then(r => r.json()).catch(() => ({})),
    ])
      .then(([apps, exps, profs, clis, srvs, prods, settings]) => {
        setAppointments(apps);
        setExpenses(exps);
        setProfessionals(profs);
        setClients(clis);
        setServices(srvs);
        setProducts(Array.isArray(prods) ? prods : []);

        if (settings && settings.custom_expense_categories) {
          try {
            const parsed = JSON.parse(settings.custom_expense_categories);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCustomCategories(prev => {
                const combined = Array.from(new Set([...prev, ...parsed]));
                localStorage.setItem("estudiojoha_custom_expense_categories", JSON.stringify(combined));
                return combined;
              });
            }
          } catch (e) {}
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleAddCustomCategory = async (nameToAdd?: string) => {
    const raw = (nameToAdd || newCategoryName).trim();
    if (!raw) return;
    const formatted = raw.charAt(0).toUpperCase() + raw.slice(1);
    
    if (allExpenseCategories.map(c => c.toLowerCase()).includes(formatted.toLowerCase())) {
      alert(`La categoría "${formatted}" ya existe.`);
      setNewExpense(prev => ({ ...prev, category: formatted }));
      setShowCategoryModal(false);
      setNewCategoryName("");
      return;
    }

    setSavingCategory(true);
    const updated = Array.from(new Set([...customCategories, formatted]));
    setCustomCategories(updated);
    try {
      localStorage.setItem("estudiojoha_custom_expense_categories", JSON.stringify(updated));
      await fetchAPI("/api/data/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_expense_categories: JSON.stringify(updated) }),
      });
    } catch (err) {
      console.error("Error al guardar categoría en backend:", err);
    } finally {
      setSavingCategory(false);
      setNewExpense(prev => ({ ...prev, category: formatted }));
      if (editingExpense) {
        setEditingExpense(prev => prev ? { ...prev, category: formatted } : null);
      }
      setShowCategoryModal(false);
      setNewCategoryName("");
    }
  };

  const handleDeleteCustomCategory = async (catToDelete: string) => {
    if (!confirm(`¿Eliminar la categoría personalizada "${catToDelete}"?`)) return;
    const updated = customCategories.filter(c => c !== catToDelete);
    setCustomCategories(updated);
    try {
      localStorage.setItem("estudiojoha_custom_expense_categories", JSON.stringify(updated));
      await fetchAPI("/api/data/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_expense_categories: JSON.stringify(updated) }),
      });
    } catch (e) {}
    if (newExpense.category === catToDelete) {
      setNewExpense(prev => ({ ...prev, category: "General" }));
    }
  };

  // ── Day filter ──
  const todayApps = appointments.filter(a => a.date === selectedDate);
  const completedApps = todayApps.filter(a => a.status === "completado");
  const pendingApps = todayApps.filter(a => a.status === "agendado" || a.status === "confirmado");

  const cobrado = completedApps.reduce((sum, a) => sum + a.price, 0);
  const shopToday = completedApps.reduce((sum, a) => sum + (a.shopSales || 0), 0);
  const pendiente = pendingApps.reduce((sum, a) => sum + a.price, 0);
  const dayExpenses = expenses.filter(e => e.date === selectedDate);
  const totalEgresos = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const neto = cobrado + shopToday - totalEgresos;

  // ── Month filter ──
  const selectedMonth = selectedDate.slice(0, 7); // YYYY-MM
  const monthApps = appointments.filter(a => a.date.startsWith(selectedMonth) && a.status === "completado");
  const monthExpenses = expenses.filter(e => e.date.startsWith(selectedMonth));
  const monthCobrado = monthApps.reduce((sum, a) => sum + a.price, 0);
  const monthShop = monthApps.reduce((sum, a) => sum + (a.shopSales || 0), 0);
  const monthEgresos = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const monthNeto = monthCobrado + monthShop - monthEgresos;

  // ── By category (month) ──
  const byCategory = monthExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const byMethod = completedApps.reduce((acc, a) => {
    const method = a.paymentMethod || "Efectivo";
    acc[method] = (acc[method] || 0) + a.price;
    return acc;
  }, {} as Record<string, number>);

  const byProfessional = completedApps.reduce((acc, a) => {
    acc[a.professionalName] = (acc[a.professionalName] || 0) + a.price;
    return acc;
  }, {} as Record<string, number>);

  const applyPercentageDiscount = (pct: number, label: string) => {
    const baseAmount = activeSubtotal > 0 ? activeSubtotal : Number(newQuickApp.amount) || 0;
    if (baseAmount <= 0) {
      setVoucherError("Primero seleccioná un servicio o producto, o ingresá un monto.");
      return;
    }
    const saved = Math.round((baseAmount * pct) / 100);
    setAppliedDiscount({
      type: "percent",
      value: pct,
      label,
      amountSaved: saved,
    });
    setNewQuickApp(prev => ({ ...prev, amount: String(Math.max(0, baseAmount - saved)) }));
    setDiscountInput("");
    setVoucherError("");
  };

  const applyFixedDiscount = (fixedVal: number, label: string) => {
    const baseAmount = activeSubtotal > 0 ? activeSubtotal : Number(newQuickApp.amount) || 0;
    if (baseAmount <= 0) {
      setVoucherError("Primero seleccioná un servicio o producto, o ingresá un monto.");
      return;
    }
    const saved = Math.min(baseAmount, fixedVal);
    setAppliedDiscount({
      type: "fixed",
      value: fixedVal,
      label,
      amountSaved: saved,
    });
    setNewQuickApp(prev => ({ ...prev, amount: String(Math.max(0, baseAmount - saved)) }));
    setDiscountInput("");
    setVoucherError("");
  };

  const handleApplyDiscount = async () => {
    const raw = discountInput.trim();
    if (!raw) return;

    const baseAmount = activeSubtotal > 0 ? activeSubtotal : Number(newQuickApp.amount) || 0;
    if (baseAmount <= 0) {
      setVoucherError("Primero seleccioná un servicio o producto, o ingresá un monto.");
      return;
    }

    setVoucherError("");

    // 1. Detectar si escribió porcentaje explícito (ej: "15%", "%15", "10 %")
    if (raw.endsWith("%") || raw.startsWith("%")) {
      const pct = parseFloat(raw.replace("%", "").trim());
      if (!isNaN(pct) && pct > 0 && pct <= 100) {
        applyPercentageDiscount(pct, `${pct}% OFF`);
        return;
      }
    }

    // 2. Detectar si escribió monto fijo explícito (ej: "$2000", "$ 1500", "-1500")
    if (raw.startsWith("$") || raw.startsWith("-")) {
      const fixedVal = parseFloat(raw.replace(/[^\d.]/g, ""));
      if (!isNaN(fixedVal) && fixedVal > 0) {
        applyFixedDiscount(fixedVal, `-$${fixedVal.toLocaleString("es-AR")}`);
        return;
      }
    }

    // 3. Validar contra el sistema de cupones / vouchers de base de datos
    setValidatingVoucher(true);
    try {
      const res = await fetchAPI("/api/vouchers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: raw }),
      });
      const data = await res.json();
      if (data.valid) {
        let saved = 0;
        if (data.discountType === "percent") {
          saved = Math.round((baseAmount * Number(data.discountValue)) / 100);
        } else {
          saved = Math.min(baseAmount, Number(data.discountValue));
        }

        const discountObj = {
          code: raw.toUpperCase(),
          type: data.discountType as "percent" | "fixed",
          value: Number(data.discountValue),
          label: `Cupón ${raw.toUpperCase()} (${data.discountType === "percent" ? data.discountValue + "%" : "$" + Number(data.discountValue).toLocaleString("es-AR")})`,
          amountSaved: saved,
        };

        setAppliedDiscount(discountObj);
        setNewQuickApp(prev => ({ ...prev, amount: String(Math.max(0, baseAmount - saved)) }));
        setDiscountInput("");
        return;
      }
    } catch {
      // Continuar al fallback numérico
    } finally {
      setValidatingVoucher(false);
    }

    // 4. Si no fue cupón de BD, verificar si es número directo
    const numericVal = parseFloat(raw.replace(/[^\d.]/g, ""));
    if (!isNaN(numericVal) && numericVal > 0) {
      if (numericVal <= 90 && !raw.includes("00")) {
        applyPercentageDiscount(numericVal, `${numericVal}% OFF`);
        return;
      }
      applyFixedDiscount(numericVal, `-$${numericVal.toLocaleString("es-AR")}`);
      return;
    }

    setVoucherError("Cupón no encontrado. Podés ingresar un % (ej: 15%) o monto (ej: $1000).");
  };

  const handleQuickDiscount = (pct: number) => {
    applyPercentageDiscount(pct, `${pct}% OFF`);
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountInput("");
    setVoucherError("");
    if (activeSubtotal > 0) {
      setNewQuickApp(prev => ({ ...prev, amount: String(activeSubtotal) }));
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.concept || !newExpense.amount) return;
    const finalMethod = newExpense.paymentMethod === "Transferencia"
      ? `Transferencia (${newExpense.wallet || "Mercado Pago"})`
      : newExpense.paymentMethod;

    try {
      await fetchAPI("/api/data/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: newExpense.concept.trim(),
          amount: Number(newExpense.amount),
          category: newExpense.category,
          paymentMethod: finalMethod,
          payment_method: finalMethod,
          date: selectedDate,
        }),
      });
      setNewExpense({ concept: "", amount: "", category: "General", paymentMethod: "Efectivo", wallet: "Mercado Pago" });
      setShowExpenseForm(false);
      loadData();
    } catch {
      alert("Error al registrar egreso");
    }
  };

  const handleAddQuickApp = async (type: "cobro" | "shop") => {
    if (!newQuickApp.clientId) {
      alert("Por favor seleccioná un cliente usando la lupita de búsqueda");
      return;
    }

    if (type === "cobro") {
      if (selectedServiceIds.length === 0) {
        alert("Por favor tildá al menos un servicio");
        return;
      }
    } else {
      if (!newQuickApp.professionalId) {
        alert("Por favor seleccioná un profesional");
        return;
      }
      if (selectedProducts.length === 0 && (!newQuickApp.amount || Number(newQuickApp.amount) <= 0)) {
        alert("Por favor seleccioná al menos un producto o ingresá un monto para la venta shop");
        return;
      }
    }

    if (!newQuickApp.amount || Number(newQuickApp.amount) <= 0) {
      alert("Por favor ingresá un monto válido");
      return;
    }

    // SI ES VENTA SHOP
    if (type === "shop") {
      const totalEntered = Number(newQuickApp.amount);
      const originalSum = productsSubtotal > 0 ? productsSubtotal : totalEntered;

      let shopNotes = "";
      if (selectedProducts.length > 0) {
        shopNotes = `[SHOP_SALES]${JSON.stringify(selectedProducts.map(p => ({ id: p.id, name: p.name, price: p.price, qty: p.qty })))}[/SHOP_SALES]`;
      }
      if (appliedDiscount) {
        const discText = `[DESCUENTO] ${appliedDiscount.label} (-$${appliedDiscount.amountSaved.toLocaleString("es-AR")}). Original: $${originalSum.toLocaleString("es-AR")} -> Cobrado: $${totalEntered.toLocaleString("es-AR")}`;
        shopNotes = shopNotes ? `${shopNotes} ${discText}` : discText;
      }

      // Asignar un serviceId de referencia
      const shopServiceId = services.find(s => 
        s.name.toLowerCase().includes("shop") || 
        s.name.toLowerCase().includes("venta") ||
        s.name.toLowerCase().includes("producto")
      )?.id || services[0]?.id || "";

      try {
        await fetchAPI("/api/data/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: newQuickApp.clientId,
            professionalId: newQuickApp.professionalId,
            serviceId: shopServiceId,
            date: selectedDate,
            time: newQuickApp.time,
            duration: 15,
            price: 0,
            shopSales: totalEntered,
            status: "completado",
            paymentMethod: newQuickApp.paymentMethod === "Transferencia" ? `Transferencia (${bankAccount})` : newQuickApp.paymentMethod,
            notes: shopNotes || undefined,
          }),
        });

        if (appliedDiscount?.code) {
          await fetchAPI("/api/vouchers/redeem", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: appliedDiscount.code,
              clientId: newQuickApp.clientId,
            }),
          }).catch(console.error);
        }

        setSelectedProducts([]);
        setAppliedDiscount(null);
        setDiscountInput("");
        setVoucherError("");
        setNewQuickApp({ clientId: "", professionalId: "", serviceId: "", amount: "", paymentMethod: "Efectivo", time: "10:00" });
        alert("¡Venta de shop registrada exitosamente!");
        loadData();
      } catch {
        alert("Error al guardar la venta de shop");
      }
      return;
    }

    // SI ES COBRO DE SERVICIOS (Con soporte para cantidad y múltiples profesionales en simultáneo)
    const chosen: SelectedServiceItem[] = selectedServicesWithQty.length > 0
      ? selectedServicesWithQty
      : services.filter(s => selectedServiceIds.includes(s.id)).map(s => ({ ...s, qty: 1 }));

    // Validar que cada servicio tenga un profesional asignado
    for (const srv of chosen) {
      const assignedProf = srv.professionalId || newQuickApp.professionalId;
      if (!assignedProf) {
        alert(`Por favor asignale una profesional al servicio "${srv.name}" antes de guardar`);
        return;
      }
    }

    const totalEntered = Number(newQuickApp.amount);
    const originalSum = chosen.reduce((acc, s) => acc + (s.price || 0) * (s.qty || 1), 0);

    // Calcular distribución de precios si hay múltiples servicios o cantidades
    const prices = chosen.map((s, idx) => {
      const sItemTotal = (s.price || 0) * (s.qty || 1);
      if (chosen.length === 1) return totalEntered;
      if (originalSum === 0) return Math.round(totalEntered / chosen.length);
      if (idx === chosen.length - 1) {
        const previousSums = chosen
          .slice(0, -1)
          .reduce((acc, prevS) => acc + Math.round((((prevS.price || 0) * (prevS.qty || 1)) / originalSum) * totalEntered), 0);
        return totalEntered - previousSums;
      }
      return Math.round((sItemTotal / originalSum) * totalEntered);
    });

    let discountNote = "";
    if (appliedDiscount) {
      discountNote = `[DESCUENTO] ${appliedDiscount.label} (-$${appliedDiscount.amountSaved.toLocaleString("es-AR")}). Original: $${originalSum.toLocaleString("es-AR")} -> Cobrado: $${totalEntered.toLocaleString("es-AR")}`;
    }

    try {
      await Promise.all(
        chosen.map((srv, idx) => {
          const srvProfId = srv.professionalId || newQuickApp.professionalId;
          const qtyNote = (srv.qty || 1) > 1 ? `[CANTIDAD: ${srv.qty}]` : "";
          const combinedNotes = [qtyNote, discountNote].filter(Boolean).join(" ");

          return fetchAPI("/api/data/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: newQuickApp.clientId,
              professionalId: srvProfId,
              serviceId: srv.id,
              date: selectedDate,
              time: newQuickApp.time,
              duration: (srv.duration || 30) * (srv.qty || 1),
              price: prices[idx],
              shopSales: 0,
              status: "completado",
              paymentMethod: newQuickApp.paymentMethod === "Transferencia" ? `Transferencia (${bankAccount})` : newQuickApp.paymentMethod,
              notes: combinedNotes || undefined,
            }),
          });
        })
      );

      // Si fue un cupón oficial de base de datos, canjearlo
      if (appliedDiscount?.code) {
        await fetchAPI("/api/vouchers/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: appliedDiscount.code,
            clientId: newQuickApp.clientId,
          }),
        }).catch(console.error);
      }

      setSelectedServiceIds([]);
      setSelectedServicesWithQty([]);
      setAppliedDiscount(null);
      setDiscountInput("");
      setVoucherError("");
      setNewQuickApp({ clientId: "", professionalId: "", serviceId: "", amount: "", paymentMethod: "Efectivo", time: "10:00" });
      alert(
        chosen.length > 1
          ? `¡Se registraron ${chosen.length} servicios para la clienta con éxito!`
          : "Registro guardado exitosamente"
      );
      loadData();
    } catch {
      alert("Error al guardar el registro");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("¿Eliminar este egreso?")) return;
    await fetchAPI(`/api/data/expenses/${id}`, { method: "DELETE" });
    loadData();
  };

  const handleSaveEditExpense = async () => {
    if (!editingExpense) return;
    if (!editingExpense.concept.trim()) {
      alert("Por favor ingresá un concepto.");
      return;
    }
    if (!editingExpense.amount || Number(editingExpense.amount) < 0) {
      alert("Por favor ingresá un monto válido.");
      return;
    }

    const finalMethod = editingExpense.paymentMethod === "Transferencia"
      ? `Transferencia (${editingExpense.wallet || "Mercado Pago"})`
      : editingExpense.paymentMethod;

    try {
      await fetchAPI(`/api/data/expenses/${editingExpense.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: editingExpense.concept.trim(),
          amount: Number(editingExpense.amount),
          category: editingExpense.category,
          paymentMethod: finalMethod,
          payment_method: finalMethod,
          date: editingExpense.date,
        }),
      });
      setEditingExpense(null);
      loadData();
    } catch {
      alert("Error al guardar los cambios del egreso");
    }
  };

  const handleSaveEditAppointment = async () => {
    if (!editingAppointment) return;
    try {
      await fetchAPI(`/api/data/appointments/${editingAppointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price: Number(editingAppointment.price) || 0,
          shopSales: Number(editingAppointment.shopSales) || 0,
          paymentMethod: editingAppointment.paymentMethod,
          professionalId: editingAppointment.professionalId || undefined,
          date: editingAppointment.date,
          time: editingAppointment.time,
          notes: editingAppointment.notes || undefined,
        }),
      });
      setEditingAppointment(null);
      loadData();
    } catch {
      alert("Error al guardar los cambios del cobro");
    }
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm("¿Eliminar este registro cargado por error? Se borrará permanentemente de la caja sin afectar la tasa de asistencia de la clienta.")) return;
    try {
      await fetchAPI(`/api/data/appointments/${id}`, {
        method: "DELETE"
      });
      loadData();
    } catch {
      alert("Error al eliminar el registro");
    }
  };

  const todayISO = getLocalDateString();
  const isTodaySelected = selectedDate === todayISO;
  const dateObj = new Date(selectedDate + "T12:00:00");
  const displayDate = dateObj.toLocaleDateString("es-AR", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const displayMonth = dateObj.toLocaleDateString("es-AR", { month: 'long', year: 'numeric' });

  const formattedNavDate = isTodaySelected
    ? `Hoy (${dateObj.toLocaleDateString("es-AR", { day: 'numeric', month: 'short' })})`
    : dateObj.toLocaleDateString("es-AR", { weekday: 'short', day: 'numeric', month: 'short' });

  const handleExportCSV = () => {
    const rows = completedApps.map(a => [
      a.date, a.time, a.clientName, a.serviceName, a.professionalName,
      a.paymentMethod || "Efectivo", a.price, a.shopSales || 0
    ]);
    const headers = ["Fecha", "Hora", "Cliente", "Servicio", "Profesional", "Método de Pago", "Servicio $", "Shop $"];
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `caja_${selectedDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout
      title="Caja"
      subtitle={activeTab === "dia" ? displayDate.charAt(0).toUpperCase() + displayDate.slice(1) : `Balance de ${displayMonth}`}
      actions={
        <div className="flex items-center gap-2">
          {/* Navegador de fecha con botón de calendario desplegable */}
          <div className="relative z-30 flex items-center">
            <div className="flex items-center gap-1 bg-card border border-border/80 shadow-sm rounded-lg p-1">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(selectedDate + "T12:00:00");
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(getLocalDateString(d));
                }}
                className="p-1.5 hover:bg-accent/15 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                title="Día anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={() => setShowCalendarPopover(prev => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  showCalendarPopover
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-accent/10 text-foreground"
                }`}
                title="Desplegar calendario para elegir día"
              >
                <CalendarIcon size={14} className={showCalendarPopover ? "text-primary-foreground" : "text-primary"} />
                <span className="capitalize">{formattedNavDate}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${showCalendarPopover ? "rotate-180" : "text-muted-foreground"}`} />
              </button>

              <button
                type="button"
                onClick={() => {
                  const d = new Date(selectedDate + "T12:00:00");
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(getLocalDateString(d));
                }}
                className="p-1.5 hover:bg-accent/15 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                title="Día siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {!isTodaySelected && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayISO)}
                className="ml-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
                title="Volver a la fecha de hoy"
              >
                Hoy
              </button>
            )}

            <CalendarPopover
              selectedDate={selectedDate}
              onSelectDate={d => setSelectedDate(d)}
              isOpen={showCalendarPopover}
              onClose={() => setShowCalendarPopover(false)}
              align="right"
            />
          </div>

          <button onClick={handleExportCSV} className="flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/20 transition-colors">
            <Download size={13} /> CSV
          </button>
        </div>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border/50 rounded-lg p-1 w-fit mb-6 overflow-x-auto max-w-full">
        {([["dia", "📅 Día"], ["mes", "📊 Balance Mensual"], ["rapido", "⚡ Carga Rápida"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${activeTab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "dia" ? (
          <motion.div key="dia" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Cobrado", value: cobrado, color: "text-foreground", bg: "from-primary/10 to-transparent", action: "cobro" },
                { label: "Shop", value: shopToday, color: "text-emerald-400", bg: "from-emerald-500/10 to-transparent", action: "shop" },
                { label: "Egresos", value: totalEgresos, color: "text-red-400", bg: "from-red-500/5 to-transparent", action: "egreso" },
                { label: "Neto del día", value: neto, color: neto >= 0 ? "text-emerald-400" : "text-red-400", bg: neto >= 0 ? "from-emerald-500/10 to-transparent" : null },
              ].map((card) => (
                <div key={card.label} className="bg-card border border-border/50 rounded-xl p-4 relative overflow-hidden group">
                  {card.bg && <div className={`absolute inset-0 bg-gradient-to-br ${card.bg} pointer-events-none`} />}
                  <div className="flex items-center justify-between mb-2 relative z-10">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{card.label}</span>
                    {card.action && (
                      <button 
                        onClick={() => { setQuickAction(card.action as any); setActiveTab("rapido"); }} 
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border/50 hover:bg-accent rounded-full p-1 text-muted-foreground hover:text-foreground"
                        title={`Agregar ${card.label} rápido`}
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                  <span className={`text-xl font-bold relative z-10 ${card.color}`}>$ {card.value.toLocaleString("es-AR")}</span>
                </div>
              ))}
            </div>

            {/* Pending */}
            {pendingApps.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
                <span className="text-amber-400 text-lg">⏳</span>
                <div className="text-xs">
                  <span className="font-semibold text-amber-400">{pendingApps.length} turno{pendingApps.length > 1 ? "s" : ""} pendiente{pendingApps.length > 1 ? "s" : ""}</span>
                  <span className="text-muted-foreground ml-2">· $ {pendiente.toLocaleString("es-AR")} esperado</span>
                </div>
              </div>
            )}

            {/* Egresos section */}
            <div className="bg-card border border-border/50 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-widest font-bold text-foreground flex items-center gap-2">
                  <TrendingDown size={12} className="text-red-400" /> Egresos del día
                </span>
                <button onClick={() => setShowExpenseForm(!showExpenseForm)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80">
                  <Plus size={12} /> Registrar egreso
                </button>
              </div>
              <AnimatePresence>
                {showExpenseForm && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="p-3.5 bg-background border border-border/60 rounded-xl space-y-2.5 mb-4 shadow-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <input
                          placeholder="Concepto (ej: Pago Mili, Insumos, Gas)"
                          value={newExpense.concept}
                          onChange={e => setNewExpense(f => ({ ...f, concept: e.target.value }))}
                          className="bg-card border border-border rounded-md px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                        />
                        <div className="flex items-center gap-1.5">
                          <select
                            value={newExpense.category}
                            onChange={e => setNewExpense(f => ({ ...f, category: e.target.value }))}
                            className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                          >
                            {allExpenseCategories.map(c => (
                              <option key={c} value={c}>{CATEGORY_ICONS[c] || "🏷️"} {c}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setShowCategoryModal(true)}
                            className="px-2 py-2 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/20 transition-colors flex items-center gap-1 shadow-2xs whitespace-nowrap"
                            title="Agregar nueva categoría"
                          >
                            <Plus size={13} />
                            <span>Nueva</span>
                          </button>
                        </div>
                        <div className="relative flex items-center">
                          <span className="absolute left-3 text-muted-foreground text-xs font-semibold">$</span>
                          <input
                            type="number"
                            placeholder="Monto"
                            value={newExpense.amount}
                            onChange={e => setNewExpense(f => ({ ...f, amount: e.target.value }))}
                            className="w-full bg-card border border-border rounded-md pl-7 pr-3 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                        <div>
                          <select
                            value={newExpense.paymentMethod}
                            onChange={e => setNewExpense(f => ({ ...f, paymentMethod: e.target.value }))}
                            className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                          >
                            <option value="Efectivo">💵 Efectivo</option>
                            <option value="Transferencia">📱 Transferencia / Billetera</option>
                            <option value="Tarjeta">💳 Tarjeta</option>
                          </select>
                        </div>

                        {newExpense.paymentMethod === "Transferencia" ? (
                          <div>
                            <select
                              value={newExpense.wallet}
                              onChange={e => setNewExpense(f => ({ ...f, wallet: e.target.value }))}
                              className="w-full bg-card border border-primary/50 text-foreground font-medium rounded-md px-3 py-2 text-xs focus:border-primary focus:outline-none"
                            >
                              {VIRTUAL_WALLETS.map(w => (
                                <option key={w} value={w}>📱 {w}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground px-1 hidden sm:block">
                            Salida de caja en efectivo
                          </div>
                        )}

                        <div className="sm:text-right">
                          <button
                            onClick={handleAddExpense}
                            className="w-full sm:w-auto bg-primary text-primary-foreground text-xs px-5 py-2 rounded-md font-semibold hover:bg-primary/90 transition-colors shadow-xs"
                          >
                            Guardar Egreso
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {dayExpenses.length > 0 ? (
                <div className="space-y-2">
                  {dayExpenses.map(e => {
                    const rawMethod = e.paymentMethod || (e as any).payment_method || "Efectivo";
                    const isTransfer = rawMethod.startsWith("Transferencia");
                    const isCard = rawMethod.startsWith("Tarjeta");
                    const badgeStyle = isTransfer
                      ? "bg-blue-500/15 text-blue-500 border-blue-500/30"
                      : isCard
                      ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                      : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";

                    return (
                      <div key={e.id} className="flex items-center justify-between text-xs py-2 border-b border-border/20 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{CATEGORY_ICONS[e.category] || "📋"}</span>
                          <div>
                            <span className="font-medium text-foreground">{e.concept}</span>
                            <span className="text-muted-foreground ml-2 text-[10px] uppercase tracking-wider bg-border/30 px-1.5 py-0.5 rounded">{e.category}</span>
                            <span className={`ml-1.5 text-[10px] uppercase tracking-wider border px-1.5 py-0.5 rounded font-semibold ${badgeStyle}`}>
                              {rawMethod}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-red-400">$ {e.amount.toLocaleString("es-AR")}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const walletName = isTransfer && rawMethod.includes("(")
                                ? rawMethod.replace("Transferencia (", "").replace(")", "").trim()
                                : "Mercado Pago";
                              const mainMethod = isTransfer ? "Transferencia" : (rawMethod.startsWith("Tarjeta") ? "Tarjeta" : "Efectivo");

                              setEditingExpense({
                                ...e,
                                amount: String(e.amount),
                                paymentMethod: mainMethod,
                                wallet: walletName,
                                date: e.date,
                              });
                            }}
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded hover:bg-accent/15"
                            title="Editar egreso"
                          >
                            <Pencil size={13} />
                          </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(e.id)}
                          className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors rounded hover:bg-accent/15"
                          title="Eliminar egreso"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Sin egresos registrados para este día.</p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-card border border-border/50 rounded-xl p-5">
                <span className="text-[10px] uppercase tracking-widest font-bold text-foreground mb-4 block">Por método de pago</span>
                {Object.keys(byMethod).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(byMethod).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-semibold text-foreground">$ {v.toLocaleString("es-AR")}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">Sin ventas hoy</p>}
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-5">
                <span className="text-[10px] uppercase tracking-widest font-bold text-foreground mb-4 block">Por profesional</span>
                {Object.keys(byProfessional).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(byProfessional).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-semibold text-foreground">$ {v.toLocaleString("es-AR")}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">Sin ventas hoy</p>}
              </div>
            </div>

            {/* Detail table */}
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50">
                <span className="text-[10px] uppercase tracking-widest font-bold text-foreground">Detalle de cobros</span>
              </div>
              {completedApps.length > 0 ? (
                <table className="w-full">
                  <tbody>
                    {completedApps.map((a, i) => {
                      const receiptMatch = a.notes?.includes("[COMPROBANTE]") ? a.notes.split("[COMPROBANTE]")[1] : null;
                      const discountMatch = a.notes?.match(/\[DESCUENTO\]\s*([^.]+?)(?:\.|$)/);
                      const shopMatch = a.notes?.match(/\[SHOP_SALES\](.*?)\[\/SHOP_SALES\]/);
                      let shopProductsDesc = "";
                      if (shopMatch) {
                        try {
                          const parsed = JSON.parse(shopMatch[1]);
                          shopProductsDesc = parsed.map((p: any) => `${p.name}${p.qty > 1 ? ` x${p.qty}` : ""}`).join(", ");
                        } catch {}
                      }
                      const isPureShop = (a.shopSales || 0) > 0 && a.price === 0;
                      const qtyMatch = a.notes?.match(/\[CANTIDAD:\s*(\d+)\]/);
                      const qtyText = qtyMatch ? ` (x${qtyMatch[1]})` : "";

                      return (
                        <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-accent/5 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-foreground">{a.clientName}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {a.time} · {isPureShop ? (
                                  <span className="text-emerald-400 font-semibold">
                                    🛍️ {shopProductsDesc || "Venta Shop"}
                                  </span>
                                ) : (
                                  <span className="font-medium text-foreground/90">
                                    {a.serviceName}{qtyText}
                                  </span>
                                )}
                              </span>
                              {discountMatch && (
                                <span className="w-fit mt-1 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  🏷️ {discountMatch[1].trim()}
                                </span>
                              )}
                              {receiptMatch && (
                                <button
                                  type="button"
                                  onClick={() => setViewReceipt(receiptMatch)}
                                  className="w-fit mt-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                                >
                                  📷 Ver Comprobante
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <span className="text-xs text-muted-foreground">{a.professionalName}</span>
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <span className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-sm uppercase tracking-wider">{a.paymentMethod || "Efectivo"}</span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  $ {(isPureShop ? a.shopSales! : a.price).toLocaleString("es-AR")}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const prof = professionals.find(p => p.name === a.professionalName || p.id === a.professionalId);
                                    setEditingAppointment({
                                      id: a.id,
                                      clientName: a.clientName,
                                      serviceName: a.serviceName,
                                      price: String(a.price || 0),
                                      shopSales: String(a.shopSales || 0),
                                      paymentMethod: a.paymentMethod || "Efectivo",
                                      professionalId: a.professionalId || prof?.id || "",
                                      date: a.date,
                                      time: a.time,
                                      notes: a.notes || "",
                                    });
                                  }}
                                  className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded hover:bg-accent/15"
                                  title="Editar cobro"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelAppointment(a.id)}
                                  className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors rounded hover:bg-accent/15"
                                  title="Anular cobro"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              {!isPureShop && (a.shopSales || 0) > 0 && (
                                <span className="text-[10px] text-emerald-400">+ $ {a.shopSales!.toLocaleString("es-AR")} shop</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="py-16 flex flex-col items-center justify-center text-muted-foreground">
                  <Wallet size={24} className="mb-3 opacity-50" />
                  <p className="text-xs">No hay ventas registradas para este día.</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : activeTab === "rapido" ? (
          <motion.div key="rapido" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="max-w-2xl">
            <div className="flex gap-2 mb-4 bg-background border border-border/50 p-1 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => {
                  setQuickAction("cobro");
                  setAppliedDiscount(null);
                  setNewQuickApp(prev => ({ ...prev, amount: servicesSubtotal > 0 ? String(servicesSubtotal) : "" }));
                }}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${quickAction === "cobro" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Cobro de Servicio
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickAction("shop");
                  setAppliedDiscount(null);
                  setNewQuickApp(prev => ({ ...prev, amount: productsSubtotal > 0 ? String(productsSubtotal) : "" }));
                }}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${quickAction === "shop" ? "bg-emerald-500 text-white shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"}`}
              >
                🛍️ Venta Shop
              </button>
              <button
                type="button"
                onClick={() => setQuickAction("egreso")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${quickAction === "egreso" ? "bg-red-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Registrar Egreso
              </button>
            </div>
            
            <div className="bg-card border border-border/50 rounded-xl p-5 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/40">
                <span className="text-[10px] uppercase tracking-widest font-bold text-foreground flex items-center gap-2">
                  <Plus size={14} className={quickAction === "egreso" ? "text-red-400" : quickAction === "shop" ? "text-emerald-400" : "text-primary"} /> 
                  {quickAction === "egreso" ? "Nuevo Egreso" : quickAction === "shop" ? "Nueva Venta de Shop" : "Nuevo Ingreso por Servicio"}
                </span>

                {/* Selector rápido de fecha para la carga */}
                <div className="relative z-20 flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarIcon size={13} className="text-primary" />
                    <span>Fecha:</span>
                    <strong className="text-foreground capitalize">{displayDate.split(",")[0] || displayDate}, {dateObj.getDate()} de {displayMonth.split(" ")[0]}</strong>
                    {isTodaySelected && (
                      <span className="text-[9px] bg-primary/15 text-primary font-bold px-1.5 py-0.5 rounded">
                        Hoy
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQuickCalendar(prev => !prev)}
                    className="text-[11px] font-semibold text-primary hover:text-primary/90 bg-primary/10 hover:bg-primary/20 border border-primary/25 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                  >
                    <span>Cambiar día</span>
                    <ChevronDown size={11} className={`transition-transform duration-150 ${showQuickCalendar ? "rotate-180" : ""}`} />
                  </button>
                  <CalendarPopover
                    selectedDate={selectedDate}
                    onSelectDate={d => setSelectedDate(d)}
                    isOpen={showQuickCalendar}
                    onClose={() => setShowQuickCalendar(false)}
                    align="right"
                  />
                </div>
              </div>

              {quickAction === "egreso" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Concepto del gasto
                    </label>
                    <input
                      placeholder="Concepto (ej: Pago Gas, Insumos, Sueldo)"
                      value={newExpense.concept}
                      onChange={e => setNewExpense(f => ({ ...f, concept: e.target.value }))}
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Categoría
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={newExpense.category}
                        onChange={e => setNewExpense(f => ({ ...f, category: e.target.value }))}
                        className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                      >
                        {allExpenseCategories.map(c => (
                          <option key={c} value={c}>{CATEGORY_ICONS[c] || "🏷️"} {c}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="px-2 py-2 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/20 transition-colors flex items-center gap-1 shadow-2xs whitespace-nowrap"
                        title="Agregar nueva categoría (ej: Limpieza, Publicidad, Carga de celular, Mentorías...)"
                      >
                        <Plus size={13} />
                        <span>Nueva</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Monto a egresar
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-muted-foreground text-xs font-semibold">$</span>
                      <input
                        type="number"
                        placeholder="Monto"
                        value={newExpense.amount}
                        onChange={e => setNewExpense(f => ({ ...f, amount: e.target.value }))}
                        className="w-full bg-background border border-border rounded-md pl-7 pr-3 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Selector Forma de Egreso / Billetera */}
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Forma de Pago del Egreso
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={newExpense.paymentMethod}
                        onChange={e => setNewExpense(f => ({ ...f, paymentMethod: e.target.value }))}
                        className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none font-medium"
                      >
                        <option value="Efectivo">💵 Efectivo</option>
                        <option value="Transferencia">📱 Transferencia / Billetera</option>
                        <option value="Tarjeta">💳 Tarjeta</option>
                      </select>

                      {newExpense.paymentMethod === "Transferencia" && (
                        <select
                          value={newExpense.wallet}
                          onChange={e => setNewExpense(f => ({ ...f, wallet: e.target.value }))}
                          className="flex-1 bg-background border border-primary/50 text-foreground font-semibold rounded-md px-2.5 py-2 text-xs focus:border-primary focus:outline-none animate-in fade-in-50 duration-150"
                        >
                          {VIRTUAL_WALLETS.map(w => (
                            <option key={w} value={w}>📱 {w}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-2 pt-1">
                    <button onClick={handleAddExpense} className="w-full bg-primary text-primary-foreground text-xs px-4 py-2.5 rounded-md font-semibold hover:bg-primary/90 transition-colors shadow-sm">
                      Guardar Egreso
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Buscador de cliente con Lupita */}
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Cliente
                    </label>
                    <ClientSearchSelect
                      clients={clients}
                      value={newQuickApp.clientId}
                      onChange={(clientId) => setNewQuickApp(prev => ({ ...prev, clientId }))}
                      placeholder="🔍 Buscar cliente por nombre o teléfono..."
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                      Profesional Principal (o asigná abajo por servicio)
                    </label>
                    <select
                      value={newQuickApp.professionalId}
                      onChange={e => {
                        const profId = e.target.value;
                        setNewQuickApp(prev => ({ ...prev, professionalId: profId }));
                        if (profId) {
                          setSelectedServicesWithQty(prev => prev.map(s => ({
                            ...s,
                            professionalId: s.professionalId || profId,
                          })));
                        }
                      }}
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    >
                      <option value="">-- Seleccionar Profesional Principal --</option>
                      {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  
                  {/* Buscador de servicio o selector de productos según la pestaña activa */}
                  {quickAction === "shop" ? (
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground block flex items-center justify-between">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Package size={12} /> Productos para Venta Shop ({shopOnlyProducts.length})
                        </span>
                        {productsSubtotal > 0 && (
                          <span className="text-emerald-400 font-bold text-[10px]">
                            Subtotal: ${productsSubtotal.toLocaleString("es-AR")}
                          </span>
                        )}
                      </label>
                      <ProductSearchSelect
                        products={shopOnlyProducts}
                        selectedProducts={selectedProducts}
                        onChange={(prods) => {
                          setSelectedProducts(prods);
                          const sum = prods.reduce((acc, p) => acc + p.price * p.qty, 0);
                          if (appliedDiscount) {
                            let saved = 0;
                            if (appliedDiscount.type === "percent") {
                              saved = Math.round((sum * appliedDiscount.value) / 100);
                            } else {
                              saved = Math.min(sum, appliedDiscount.value);
                            }
                            setAppliedDiscount(prev => prev ? { ...prev, amountSaved: saved } : null);
                            setNewQuickApp(prev => ({
                              ...prev,
                              amount: sum > 0 ? String(Math.max(0, sum - saved)) : (prods.length === 0 ? "" : prev.amount)
                            }));
                          } else {
                            setNewQuickApp(prev => ({
                              ...prev,
                              amount: sum > 0 ? String(sum) : (prods.length === 0 ? "" : prev.amount)
                            }));
                          }
                        }}
                        placeholder="🔍 Buscar producto de venta shop (ej: tips, aceite, antifaz...)..."
                      />
                    </div>
                  ) : (
                    <div className="sm:col-span-2">
                      <ServiceSearchSelect
                        services={services}
                        professionals={professionals}
                        defaultProfessionalId={newQuickApp.professionalId}
                        selectedServiceIds={selectedServiceIds}
                        selectedServices={selectedServicesWithQty}
                        onChange={(ids, selectedSrvs) => {
                          setSelectedServiceIds(ids);
                          setSelectedServicesWithQty(selectedSrvs);
                          const sum = selectedSrvs.reduce((acc, s) => acc + (s.price || 0) * (s.qty || 1), 0);
                          if (appliedDiscount) {
                            let saved = 0;
                            if (appliedDiscount.type === "percent") {
                              saved = Math.round((sum * appliedDiscount.value) / 100);
                            } else {
                              saved = Math.min(sum, appliedDiscount.value);
                            }
                            setAppliedDiscount(prev => prev ? { ...prev, amountSaved: saved } : null);
                            setNewQuickApp(prev => ({
                              ...prev,
                              serviceId: ids[0] || "",
                              amount: sum > 0 ? String(Math.max(0, sum - saved)) : (ids.length === 0 ? "" : prev.amount)
                            }));
                          } else {
                            setNewQuickApp(prev => ({
                              ...prev,
                              serviceId: ids[0] || "",
                              amount: sum > 0 ? String(sum) : (ids.length === 0 ? "" : prev.amount)
                            }));
                          }
                        }}
                        placeholder="🔍 Buscar servicios con tildes (podés tildar varios y asignar profesional)..."
                      />
                    </div>
                  )}

                  <div className="sm:col-span-2 flex flex-col sm:flex-row gap-2">
                    <select
                      value={newQuickApp.paymentMethod}
                      onChange={e => setNewQuickApp(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-xs"
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Tarjeta">Tarjeta</option>
                      <option value="Mercado Pago">Mercado Pago</option>
                      <option value="Cuenta Corriente">Cuenta Corriente</option>
                    </select>

                    {newQuickApp.paymentMethod === "Transferencia" && (
                      <select
                        value={bankAccount}
                        onChange={e => setBankAccount(e.target.value)}
                        className="flex-1 bg-background border border-primary/50 text-foreground font-medium rounded-md px-2.5 py-2 text-xs focus:border-primary focus:outline-none animate-in fade-in-50 duration-150"
                      >
                        <option value="Banco de Córdoba">🏦 Banco de Córdoba</option>
                        <option value="Naranja X">🍊 Naranja X</option>
                        <option value="Ualá">💳 Ualá</option>
                        <option value="Personal Pay">📱 Personal Pay</option>
                      </select>
                    )}
                  </div>

                  {/* Monto Cobrado (Columna Izquierda) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground block flex items-center justify-between h-4">
                      <span>{quickAction === "shop" ? "Monto venta shop" : "Monto a cobrar"}</span>
                      {appliedDiscount && <span className="text-emerald-400 font-bold text-[9px]">con descuento</span>}
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-muted-foreground text-xs font-semibold">$</span>
                      <input
                        type="number"
                        placeholder={quickAction === "shop" ? "Monto Venta Shop" : "Monto Cobrado"}
                        value={newQuickApp.amount}
                        onChange={e => setNewQuickApp(f => ({ ...f, amount: e.target.value }))}
                        className="w-full bg-background border border-border rounded-md pl-7 pr-3 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                    {appliedDiscount ? (
                      <p className="text-[10px] text-muted-foreground flex items-center justify-between px-0.5 pt-0.5">
                        <span className="line-through text-muted-foreground/70">${activeSubtotal.toLocaleString("es-AR")}</span>
                        <span className="text-emerald-400 font-semibold font-mono">Ahorro: -${appliedDiscount.amountSaved.toLocaleString("es-AR")}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/50 px-0.5 pt-0.5">
                        {activeSubtotal > 0
                          ? `Subtotal ${quickAction === "shop" ? "productos" : "servicios"}: $${activeSubtotal.toLocaleString("es-AR")}`
                          : "Ingreso directo"}
                      </p>
                    )}
                  </div>

                  {/* Cuadro de Voucher / Descuento / Código (Columna Derecha - según foto) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground block flex items-center justify-between h-4">
                      <span className="flex items-center gap-1 text-primary">
                        <Tag size={11} /> Voucher / Descuento / Código
                      </span>
                      {appliedDiscount && (
                        <span className="text-emerald-400 font-bold text-[9px]">Aplicado ✅</span>
                      )}
                    </label>

                    {appliedDiscount ? (
                      <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-md text-xs">
                        <div className="min-w-0">
                          <p className="font-bold text-emerald-400 truncate flex items-center gap-1">
                            <Check size={12} /> {appliedDiscount.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Ahorro de ${appliedDiscount.amountSaved.toLocaleString("es-AR")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveDiscount}
                          className="text-muted-foreground hover:text-red-400 p-1 transition-colors ml-2"
                          title="Quitar descuento"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex gap-1.5">
                          <div className="relative flex-1 flex items-center">
                            <Tag size={12} className="absolute left-2.5 text-muted-foreground pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Ej: 15%, $2000 o CÓDIGO"
                              value={discountInput}
                              onChange={e => {
                                setDiscountInput(e.target.value);
                                setVoucherError("");
                              }}
                              onKeyDown={e => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleApplyDiscount();
                                }
                              }}
                              className="w-full bg-background border border-border rounded-md pl-7 pr-2 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={!discountInput.trim() || validatingVoucher}
                            onClick={handleApplyDiscount}
                            className="bg-primary/15 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 px-3 py-2 rounded-md text-xs font-semibold transition-colors disabled:opacity-40"
                          >
                            {validatingVoucher ? "..." : "Aplicar"}
                          </button>
                        </div>

                        {/* Botones rápidos de descuento para tablet */}
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[9px] text-muted-foreground uppercase font-bold mr-0.5">Rápido:</span>
                          {[10, 15, 20, 25, 30].map(pct => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => handleQuickDiscount(pct)}
                              className="text-[10px] font-semibold bg-muted/40 hover:bg-primary/20 hover:text-primary border border-border px-1.5 py-0.5 rounded transition-colors"
                            >
                              -{pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {voucherError && (
                      <p className="text-[10px] text-red-400 font-medium">{voucherError}</p>
                    )}
                  </div>

                  {/* Botón Guardar Ingreso */}
                  <div className="sm:col-span-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleAddQuickApp(quickAction)}
                      className={`w-full text-xs px-4 py-2.5 rounded-md font-semibold transition-colors shadow-sm ${
                        quickAction === "shop"
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      Guardar {quickAction === "shop" ? "Venta Shop" : "Ingreso"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="mes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {/* Monthly summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Ingresos Servicios", value: monthCobrado, color: "text-foreground", icon: <TrendingUp size={14} className="text-primary" /> },
                { label: "Ventas Shop", value: monthShop, color: "text-emerald-400", icon: <Tag size={14} className="text-emerald-400" /> },
                { label: "Gastos del mes", value: monthEgresos, color: "text-red-400", icon: <TrendingDown size={14} className="text-red-400" /> },
                { label: "Ganancia neta", value: monthNeto, color: monthNeto >= 0 ? "text-emerald-400" : "text-red-400", icon: <BarChart3 size={14} className={monthNeto >= 0 ? "text-emerald-400" : "text-red-400"} /> },
              ].map((card) => (
                <div key={card.label} className="bg-card border border-border/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {card.icon}
                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{card.label}</span>
                  </div>
                  <span className={`text-xl font-bold ${card.color}`}>$ {card.value.toLocaleString("es-AR")}</span>
                </div>
              ))}
            </div>

            {/* Balance bar */}
            <div className="bg-card border border-border/50 rounded-xl p-5 mb-6">
              <span className="text-[10px] uppercase tracking-widest font-bold text-foreground mb-4 block">Balance visual del mes</span>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Ingresos totales</span>
                    <span className="font-semibold text-foreground">$ {(monthCobrado + monthShop).toLocaleString("es-AR")}</span>
                  </div>
                  <div className="h-3 bg-border/30 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Gastos</span>
                    <span className="font-semibold text-red-400">$ {monthEgresos.toLocaleString("es-AR")}</span>
                  </div>
                  <div className="h-3 bg-border/30 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-500 to-red-400/60 rounded-full"
                      style={{ width: monthCobrado + monthShop > 0 ? `${Math.min(100, (monthEgresos / (monthCobrado + monthShop)) * 100)}%` : "0%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown by category */}
            <div className="bg-card border border-border/50 rounded-xl p-5 mb-6">
              <span className="text-[10px] uppercase tracking-widest font-bold text-foreground mb-4 block">Gastos por categoría</span>
              {Object.keys(byCategory).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-base w-6">{CATEGORY_ICONS[cat] || "📋"}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{cat}</span>
                          <span className="font-semibold text-foreground">$ {amt.toLocaleString("es-AR")}</span>
                        </div>
                        <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
                          <div className="h-full bg-red-400/70 rounded-full"
                            style={{ width: monthEgresos > 0 ? `${(amt / monthEgresos) * 100}%` : "0%" }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground">Sin gastos registrados este mes.</p>}
            </div>

            {/* Monthly expense list */}
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest font-bold text-foreground">Todos los egresos del mes</span>
              </div>
              {monthExpenses.length > 0 ? (
                <div className="divide-y divide-border/20">
                  {monthExpenses.sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                    <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-accent/5">
                      <div className="flex items-center gap-3">
                        <span className="text-base">{CATEGORY_ICONS[e.category] || "📋"}</span>
                        <div>
                          <p className="text-xs font-medium text-foreground">{e.concept}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{e.date} · {e.category}</span>
                            {(() => {
                              const rawMethod = e.paymentMethod || (e as any).payment_method || "Efectivo";
                              const isTransfer = rawMethod.startsWith("Transferencia");
                              const isCard = rawMethod.startsWith("Tarjeta");
                              const badgeStyle = isTransfer
                                ? "bg-blue-500/15 text-blue-500 border-blue-500/30"
                                : isCard
                                ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                                : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
                              return (
                                <span className={`text-[9px] uppercase tracking-wider border px-1 py-0.2 rounded font-semibold ${badgeStyle}`}>
                                  {rawMethod}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-red-400">$ {e.amount.toLocaleString("es-AR")}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const rawMethod = e.paymentMethod || (e as any).payment_method || "Efectivo";
                            const isTransfer = rawMethod.startsWith("Transferencia");
                            const walletName = isTransfer && rawMethod.includes("(")
                              ? rawMethod.replace("Transferencia (", "").replace(")", "").trim()
                              : "Mercado Pago";
                            const mainMethod = isTransfer ? "Transferencia" : (rawMethod.startsWith("Tarjeta") ? "Tarjeta" : "Efectivo");

                            setEditingExpense({
                              ...e,
                              amount: String(e.amount),
                              paymentMethod: mainMethod,
                              wallet: walletName,
                              date: e.date,
                            });
                          }}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded hover:bg-accent/15"
                          title="Editar egreso"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(e.id)}
                          className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors rounded hover:bg-accent/15"
                          title="Eliminar egreso"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground p-5">Sin egresos este mes.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Editar Egreso */}
      <AnimatePresence>
        {editingExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card border border-border/80 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-accent/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Pencil size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Editar Egreso</h3>
                    <p className="text-[11px] text-muted-foreground">Modificá los datos sin necesidad de borrar y recargar</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/20 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Concepto
                  </label>
                  <input
                    type="text"
                    value={editingExpense.concept}
                    onChange={e => setEditingExpense(prev => prev ? { ...prev, concept: e.target.value } : null)}
                    placeholder="Ej: Pago Mili, Insumos, etc."
                    className="w-full bg-background border border-border/80 rounded-lg px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Categoría
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={editingExpense.category}
                        onChange={e => setEditingExpense(prev => prev ? { ...prev, category: e.target.value } : null)}
                        className="flex-1 bg-background border border-border/80 rounded-lg px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all"
                      >
                        {allExpenseCategories.map(c => (
                          <option key={c} value={c}>{CATEGORY_ICONS[c] || "🏷️"} {c}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(true)}
                        className="p-2.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors flex items-center justify-center shadow-2xs flex-shrink-0"
                        title="Agregar nueva categoría"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Monto
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-muted-foreground text-xs font-semibold">$</span>
                      <input
                        type="number"
                        value={editingExpense.amount}
                        onChange={e => setEditingExpense(prev => prev ? { ...prev, amount: e.target.value } : null)}
                        placeholder="0"
                        className="w-full bg-background border border-border/80 rounded-lg pl-7 pr-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-semibold"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Forma de Egreso
                    </label>
                    <select
                      value={editingExpense.paymentMethod}
                      onChange={e => setEditingExpense(prev => prev ? { ...prev, paymentMethod: e.target.value } : null)}
                      className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all"
                    >
                      <option value="Efectivo">💵 Efectivo</option>
                      <option value="Transferencia">📱 Transferencia / Billetera</option>
                      <option value="Tarjeta">💳 Tarjeta</option>
                    </select>
                  </div>

                  {editingExpense.paymentMethod === "Transferencia" ? (
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Billetera Virtual / Banco
                      </label>
                      <select
                        value={editingExpense.wallet}
                        onChange={e => setEditingExpense(prev => prev ? { ...prev, wallet: e.target.value } : null)}
                        className="w-full bg-background border border-primary/50 text-foreground font-medium rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary transition-all"
                      >
                        {VIRTUAL_WALLETS.map(w => (
                          <option key={w} value={w}>📱 {w}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Fecha del egreso
                      </label>
                      <input
                        type="date"
                        value={editingExpense.date}
                        onChange={e => setEditingExpense(prev => prev ? { ...prev, date: e.target.value } : null)}
                        className="w-full bg-background border border-border/80 rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all"
                      />
                    </div>
                  )}
                </div>

                {editingExpense.paymentMethod === "Transferencia" && (
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Fecha del egreso
                    </label>
                    <input
                      type="date"
                      value={editingExpense.date}
                      onChange={e => setEditingExpense(prev => prev ? { ...prev, date: e.target.value } : null)}
                      className="w-full bg-background border border-border/80 rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/50 bg-accent/5">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/20 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditExpense}
                  className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Check size={14} /> Guardar Cambios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Editar Cobro / Registro */}
      <AnimatePresence>
        {editingAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card border border-border/80 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-accent/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Pencil size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Editar Cobro / Venta</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {editingAppointment.clientName} · {editingAppointment.serviceName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingAppointment(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/20 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Monto Servicio ($)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-muted-foreground text-xs font-semibold">$</span>
                      <input
                        type="number"
                        value={editingAppointment.price}
                        onChange={e => setEditingAppointment(prev => prev ? { ...prev, price: e.target.value } : null)}
                        className="w-full bg-background border border-border/80 rounded-lg pl-7 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Venta Shop ($)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-muted-foreground text-xs font-semibold">$</span>
                      <input
                        type="number"
                        value={editingAppointment.shopSales}
                        onChange={e => setEditingAppointment(prev => prev ? { ...prev, shopSales: e.target.value } : null)}
                        className="w-full bg-background border border-border/80 rounded-lg pl-7 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all font-semibold text-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Método de Pago
                  </label>
                  <select
                    value={editingAppointment.paymentMethod}
                    onChange={e => setEditingAppointment(prev => prev ? { ...prev, paymentMethod: e.target.value } : null)}
                    className="w-full bg-background border border-border/80 rounded-lg px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia (Banco de Córdoba)">Transferencia (Banco de Córdoba)</option>
                    <option value="Transferencia (Naranja X)">Transferencia (Naranja X)</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                    <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                    <option value="Cuenta Corriente">Cuenta Corriente</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Profesional Asignado
                  </label>
                  <select
                    value={editingAppointment.professionalId}
                    onChange={e => setEditingAppointment(prev => prev ? { ...prev, professionalId: e.target.value } : null)}
                    className="w-full bg-background border border-border/80 rounded-lg px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="">Seleccionar profesional...</option>
                    {professionals.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={editingAppointment.date}
                      onChange={e => setEditingAppointment(prev => prev ? { ...prev, date: e.target.value } : null)}
                      className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Hora
                    </label>
                    <input
                      type="time"
                      value={editingAppointment.time}
                      onChange={e => setEditingAppointment(prev => prev ? { ...prev, time: e.target.value } : null)}
                      className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Observaciones / Notas
                  </label>
                  <input
                    type="text"
                    value={editingAppointment.notes}
                    onChange={e => setEditingAppointment(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    placeholder="Notas o detalles adicionales..."
                    className="w-full bg-background border border-border/80 rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border/50 bg-accent/5">
                <button
                  type="button"
                  onClick={() => setEditingAppointment(null)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/20 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditAppointment}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Check size={14} /> Guardar Cambios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Ver Comprobante */}
      <AnimatePresence>
        {viewReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setViewReceipt(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-card border border-border shadow-2xl rounded-2xl max-w-lg w-full overflow-hidden p-4 relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/50 mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Comprobante de Pago</h4>
                <button onClick={() => setViewReceipt(null)} className="p-1 rounded-md text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              </div>
              <img src={viewReceipt} alt="Comprobante" className="w-full max-h-[70vh] object-contain rounded-lg border border-border/50" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Nueva Categoría de Egreso */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs" onClick={() => setShowCategoryModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-card border border-border shadow-2xl rounded-2xl max-w-md w-full overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-accent/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Tag size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Nueva Categoría de Egreso</h3>
                    <p className="text-[11px] text-muted-foreground">Ej: Limpieza, Publicidad, Carga de celular, Mentorías...</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/20 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    Nombre de la Categoría
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomCategory();
                        }
                      }}
                      placeholder="Ej: Limpieza, Publicidad, Carga de celular..."
                      className="flex-1 bg-background border border-border rounded-lg px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                    <button
                      type="button"
                      disabled={savingCategory || !newCategoryName.trim()}
                      onClick={() => handleAddCustomCategory()}
                      className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-xs"
                    >
                      {savingCategory ? "Guardando..." : "Agregar"}
                    </button>
                  </div>
                </div>

                {/* Categorías personalizadas existentes */}
                {customCategories.length > 0 && (
                  <div className="pt-2 border-t border-border/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                      Tus categorías personalizadas ({customCategories.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      {customCategories.map(cat => (
                        <span
                          key={cat}
                          className="inline-flex items-center gap-1.5 bg-background border border-border px-2.5 py-1 rounded-md text-xs font-medium text-foreground"
                        >
                          <span>{CATEGORY_ICONS[cat] || "🏷️"}</span>
                          <span>{cat}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomCategory(cat)}
                            className="p-0.5 text-muted-foreground hover:text-red-400 rounded transition-colors"
                            title="Eliminar esta categoría"
                          >
                            <Trash2 size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end px-6 py-3 border-t border-border/50 bg-accent/5">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent/20 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
