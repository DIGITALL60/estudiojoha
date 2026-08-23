import { fetchAPI } from "@/lib/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, X, Search, Calendar } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import AdminLayout from "./AdminLayout";

interface Professional { id: string; name: string; color: string; initial: string; }
interface Client { id: string; name: string; phone: string; }
interface Service { id: string; name: string; duration: number; price: number; }
interface Product { id: string; name: string; price: number; stock: number; }
interface Appointment {
  id: string; date: string; time: string; duration: number; price: number;
  status: string; clientName: string; professionalColor: string;
  professionalName: string; serviceName: string; notes?: string;
  clientId: string; clientNotes?: string;
}

const hours = Array.from({ length: 14 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`);
const viewModes = [{ id: "dia", label: "Día" }, { id: "semana", label: "Semana" }, { id: "mes", label: "Mes" }];
const STATUS_COLORS: Record<string, string> = {
  agendado: "border-l-2 bg-primary/10 border-primary text-foreground",
  confirmado: "border-l-2 bg-teal-500/10 border-teal-500 text-foreground",
  completado: "border-l-2 bg-emerald-500/10 border-emerald-500 text-foreground",
  cancelado: "border-l-2 bg-red-500/10 border-red-500 text-foreground",
};


function NewTurnModal({ onClose, defaultDate, defaultTime = "10:00", onCreated, isAdmin }: { onClose: () => void; defaultDate: string; defaultTime?: string; onCreated: () => void; isAdmin: boolean }) {
  const [professionals, setProfessionals] = useState<(Professional & { role?: string })[]>([]);
  const [professionalServices, setProfessionalServices] = useState<{ professionalId: string; serviceId: string }[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<(Service & { category?: string })[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [creatingClient, setCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [price, setPrice] = useState("0");
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAPI("/api/data/professionals").then(r => r.json()).then(setProfessionals).catch(console.error);
    fetchAPI("/api/data/clients").then(r => r.json()).then(setClients).catch(console.error);
    fetchAPI("/api/data/services").then(r => r.json()).then(setServices).catch(console.error);
    fetchAPI("/api/data/professional-services").then(r => r.json()).then(setProfessionalServices).catch(console.error);
  }, []);

  const selectedService = services.find(s => s.id === serviceId);

  const eligibleProfessionals = professionals.filter(p => {
    if (p.role?.toLowerCase() === "admin") return false;
    if (!serviceId) return true;
    const explicit = professionalServices.some(ps => ps.professionalId === p.id && ps.serviceId === serviceId);
    if (explicit) return true;
    const hasAny = professionalServices.some(ps => ps.professionalId === p.id);
    if (!hasAny && selectedService && p.role === selectedService.category) return true;
    return false;
  });

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch)
  );

  const handleServiceChange = (id: string) => {
    setServiceId(id);
    setProfessionalId("");
    const srv = services.find(s => s.id === id);
    if (srv) { setPrice(String(srv.price)); setDuration(String(srv.duration)); }
  };

  const handleCreate = async () => {
    let clientId = selectedClient?.id;

    if (creatingClient) {
      if (!newClientName.trim()) {
        setError("El nombre del cliente es obligatorio");
        return;
      }
      if (isAdmin && !newClientPhone.trim()) {
        setError("El teléfono es obligatorio");
        return;
      }
      try {
        const res = await fetchAPI("/api/data/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newClientName.trim(), phone: isAdmin ? newClientPhone.trim() : "" }),
        });
        if (!res.ok) throw new Error();
        const created = await res.json();
        clientId = created.id;
      } catch {
        setError("Error al crear el cliente");
        return;
      }
    }

    if (!clientId || !professionalId || !serviceId || !date || !time) {
      setError("Completá todos los campos obligatorios"); return;
    }
    setSaving(true); setError("");
    try {
      const res = await fetchAPI("/api/data/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, professionalId, serviceId, date, time, duration, price, notes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al crear el turno");
      }
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al crear el turno");
    } finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
        className="bg-card border border-border rounded-sm w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Nuevo turno</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Client */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground">Cliente *</label>
              {!selectedClient && (
                <button
                  type="button"
                  onClick={() => setCreatingClient(!creatingClient)}
                  className="text-[10px] text-primary hover:underline"
                >
                  {creatingClient ? "Buscar existente" : "+ Crear nuevo"}
                </button>
              )}
            </div>
            {creatingClient ? (
              <div className="space-y-2">
                <input
                  placeholder="Nombre completo"
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs"
                />
                {isAdmin && (
                  <input
                    placeholder="Teléfono WhatsApp"
                    value={newClientPhone}
                    onChange={e => setNewClientPhone(e.target.value)}
                    className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs"
                  />
                )}
              </div>
            ) : selectedClient ? (
              <div className="flex items-center justify-between p-2.5 bg-primary/10 border border-primary/30 rounded-sm">
                <span className="text-xs text-foreground font-medium">
                  {selectedClient.name}{isAdmin && selectedClient.phone ? ` — ${selectedClient.phone}` : ""}
                </span>
                <button onClick={() => { setSelectedClient(null); setClientSearch(""); }} className="text-muted-foreground hover:text-primary"><X size={12} /></button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Buscar cliente..."
                    className="w-full bg-background border border-border rounded-sm pl-8 pr-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary" />
                </div>
                {clientSearch && filteredClients.length > 0 && (
                  <div className="mt-1 border border-border rounded-sm bg-card overflow-hidden max-h-32 overflow-y-auto">
                    {filteredClients.slice(0, 5).map(c => (
                      <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(""); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-accent/10 flex justify-between">
                        <span className="font-medium">{c.name}</span>
                        {isAdmin && <span className="text-muted-foreground">{c.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Service */}
          <div>
            <label className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5">Servicio *</label>
            <select value={serviceId} onChange={e => handleServiceChange(e.target.value)}
              className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary">
              <option value="">Elegí un servicio</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} — ${s.price.toLocaleString("es-AR")}</option>)}
            </select>
          </div>
          {/* Professional */}
          <div>
            <label className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5">Profesional *</label>
            <select value={professionalId} onChange={e => setProfessionalId(e.target.value)}
              className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary">
              <option value="">Elegí una profesional</option>
              {eligibleProfessionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5">Fecha *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5">Hora *</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary" />
            </div>
          </div>
          {/* Duration & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5">Duración (min)</label>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
                className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5">Precio $</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary" />
            </div>
          </div>
          {/* Notes */}
          <div>
            <label className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Observaciones..."
              className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary resize-none" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground px-4 py-2">Cancelar</button>
          <button onClick={handleCreate} disabled={saving}
            className="bg-primary text-primary-foreground text-xs font-semibold px-5 py-2 rounded-sm hover:bg-primary/90 disabled:opacity-50">
            {saving ? "Creando..." : "Crear turno"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EditTurnModal({ app, onClose, onUpdated, isAdmin }: { app: Appointment; onClose: () => void; onUpdated: () => void; isAdmin: boolean }) {
  const [status, setStatus] = useState(app.status || "agendado");
  const [notes, setNotes] = useState(app.notes || "");
  const [clientNotes, setClientNotes] = useState(app.clientNotes || "");
  const [paymentMethod, setPaymentMethod] = useState((app as any).paymentMethod || "Efectivo");
  const [shopSales, setShopSales] = useState((app as any).shopSales || 0);
  const [receiptBase64, setReceiptBase64] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reminding, setReminding] = useState(false);
  const [remindSuccess, setRemindSuccess] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<{id: string, name: string, price: number, qty: number}[]>([]);

  useEffect(() => {
    fetchAPI("/api/data/products").then(r => r.json()).then(setProducts).catch(console.error);
    
    let currentNotes = app.notes || "";
    
    if (currentNotes.includes("[SHOP_SALES]")) {
      const match = currentNotes.match(/\[SHOP_SALES\](.*?)\[\/SHOP_SALES\]/);
      if (match) {
        try { setSelectedProducts(JSON.parse(match[1])); } catch(e) {}
        currentNotes = currentNotes.replace(match[0], "");
      }
    }

    if (currentNotes.includes("[COMPROBANTE]")) {
      const parts = currentNotes.split("[COMPROBANTE]");
      currentNotes = parts[0];
      setReceiptBase64(parts[1]);
    }
    
    setNotes(currentNotes.trim());
  }, [app]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = height * (MAX_WIDTH / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setReceiptBase64(dataUrl);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemind = async () => {
    if (!confirm("¿Enviar recordatorio por WhatsApp ahora?")) return;
    setReminding(true);
    try {
      await fetchAPI(`/api/data/appointments/${app.id}/remind`, { method: "POST" });
      setRemindSuccess(true);
      setTimeout(() => setRemindSuccess(false), 3000);
    } catch {
      alert("Error enviando recordatorio. Verificá que WhatsApp esté conectado.");
    } finally {
      setReminding(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      let finalNotes = notes.trim();
      if (selectedProducts.length > 0) {
        finalNotes += `\n\n[SHOP_SALES]${JSON.stringify(selectedProducts)}[/SHOP_SALES]`;
      }
      if (receiptBase64) {
        finalNotes += `\n\n[COMPROBANTE]${receiptBase64}`;
      }

      await fetchAPI(`/api/data/appointments/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status, 
          notes: finalNotes,
          paymentMethod,
          shopSales: Number(shopSales)
        })
      });

      if (clientNotes !== app.clientNotes) {
        await fetchAPI(`/api/data/clients/${app.clientId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: clientNotes })
        });
      }

      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const [showFullReceipt, setShowFullReceipt] = useState(false);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
        className="bg-card border border-border rounded-xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border flex-shrink-0 bg-muted/20">
          <h2 className="text-sm font-semibold text-foreground">Detalle del turno</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-sm"><X size={16} /></button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1">Cliente</p>
            <p className="text-sm text-foreground font-semibold">{app.clientName}</p>
            {isAdmin && (app as any).clientPhone && (
              <p className="text-xs text-muted-foreground mt-0.5">📱 {(app as any).clientPhone}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1">Servicio</p>
              <p className="text-xs text-foreground font-medium">{app.serviceName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1">Profesional</p>
              <p className="text-xs text-foreground font-medium">{app.professionalName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1">Fecha y Hora</p>
              <p className="text-xs text-foreground font-medium">{app.date} a las {app.time}hs</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground mb-1">Precio Servicio</p>
              <p className="text-xs text-foreground font-bold">${app.price?.toLocaleString("es-AR")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5">Estado</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary">
                <option value="agendado">Agendado (Pendiente)</option>
                <option value="confirmado">✅ Confirmado</option>
                <option value="completado">Completado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5 text-emerald-500">Método de pago</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className="w-full bg-background border border-emerald-500/50 rounded-sm px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500">
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Mercado Pago">Mercado Pago</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground block text-emerald-500">
              Ventas de Shop
            </label>
            <div className="space-y-2 bg-emerald-500/5 border border-emerald-500/20 p-2.5 rounded-sm">
              {selectedProducts.map((sp, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span>{sp.qty}x {sp.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">${sp.price * sp.qty}</span>
                    <button onClick={() => {
                      const next = [...selectedProducts];
                      next.splice(idx, 1);
                      setSelectedProducts(next);
                      setShopSales(next.reduce((acc, item) => acc + (item.price * item.qty), 0));
                    }} className="text-red-400 hover:text-red-500 p-1"><X size={12} /></button>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <select 
                  className="flex-1 bg-background border border-emerald-500/50 rounded-sm px-2 py-1.5 text-xs focus:outline-none"
                  value=""
                  onChange={e => {
                    const p = products.find(prod => prod.id === e.target.value);
                    if (p) {
                      const existingIdx = selectedProducts.findIndex(sp => sp.id === p.id);
                      let next = [...selectedProducts];
                      if (existingIdx >= 0) {
                         next[existingIdx].qty += 1;
                      } else {
                         next = [...selectedProducts, { id: p.id, name: p.name, price: p.price, qty: 1 }];
                      }
                      setSelectedProducts(next);
                      setShopSales(next.reduce((acc, item) => acc + (item.price * item.qty), 0));
                    }
                  }}
                >
                  <option value="">+ Agregar producto vendido...</option>
                  {products.map(p => <option key={p.id} value={p.id} disabled={p.stock <= 0}>{p.name} (${p.price}) {p.stock <= 0 ? '(Sin stock)' : ''}</option>)}
                </select>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20 mt-2">
                 <span className="text-[10px] font-medium text-emerald-600 uppercase">Ajuste Manual / Total:</span>
                 <div className="relative w-24">
                   <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                   <input
                     type="number"
                     min={0}
                     value={shopSales || ""}
                     onChange={e => setShopSales(e.target.value ? Number(e.target.value) : 0)}
                     className="w-full bg-background border border-emerald-500/50 rounded-sm pl-6 pr-2 py-1 text-xs text-foreground focus:outline-none focus:border-emerald-500"
                   />
                 </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground block text-emerald-500">
              Comprobante de Pago
            </label>
            <div className="relative w-full h-[38px] bg-background border border-emerald-500/50 rounded-sm overflow-hidden flex items-center justify-center group cursor-pointer hover:bg-emerald-500/10 transition-colors">
              <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1.5">
                📷 {receiptBase64 ? "Ver / Cambiar foto del comprobante" : "Subir foto del comprobante"}
              </span>
            </div>
          </div>

          {receiptBase64 && (
            <div className="w-full rounded-lg border border-emerald-500/30 overflow-hidden bg-muted/20 p-2 relative flex flex-col items-center">
              <div className="w-full h-36 relative cursor-pointer group" onClick={() => setShowFullReceipt(true)}>
                <img src={receiptBase64} alt="Comprobante de pago" className="w-full h-full object-contain rounded-md" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold rounded-md">
                  🔍 Clic para ampliar foto
                </div>
              </div>
              <div className="flex items-center justify-between w-full mt-2 text-xs">
                <button type="button" onClick={() => setShowFullReceipt(true)} className="text-emerald-500 hover:underline font-medium">
                  🔍 Ver en tamaño completo
                </button>
                <button type="button" onClick={() => setReceiptBase64("")} className="text-red-400 hover:text-red-500 font-medium">
                  🗑️ Eliminar foto
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5 text-primary">Historia Clínica (Paciente)</label>
              <textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)} rows={3} placeholder="Alergias, preferencias, etc. Se guarda en el perfil del cliente."
                className="w-full bg-primary/5 border border-primary/20 rounded-sm px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary resize-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5">Notas del Turno Actual</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Opcional..."
                className="w-full bg-background border border-border rounded-sm px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary resize-none" />
            </div>
          </div>
          {error && <p className="text-xs text-red-400 font-semibold">{error}</p>}
        </div>

        {/* Modal footer action bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-border flex-shrink-0 bg-muted/20">
          {status === "agendado" || !status ? (
            <button 
              onClick={handleRemind} 
              disabled={reminding || remindSuccess}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-md font-bold transition-colors ${
                remindSuccess ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
              }`}
            >
              {reminding ? "Enviando..." : remindSuccess ? "¡Enviado!" : "🔔 Solicitar Confirmación WA"}
            </button>
          ) : <div />}
          
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 font-medium">Cancelar</button>
            <button onClick={handleUpdate} disabled={saving}
              className="bg-primary text-primary-foreground text-xs font-bold px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 shadow-sm">
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Lightbox / Fullscreen Receipt Image Modal */}
      {showFullReceipt && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setShowFullReceipt(false)}>
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img src={receiptBase64} alt="Comprobante completo" className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
            <button onClick={() => setShowFullReceipt(false)} className="mt-4 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-5 py-2 rounded-full backdrop-blur-md">
              ✕ Cerrar Vista Previa
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function getStatusCardStyle(status: string) {
  const st = (status || "agendado").toLowerCase();
  if (st === "cancelado") {
    return {
      style: {
        backgroundColor: "#fee2e2",
        borderLeft: "4px solid #dc2626",
        borderTop: "1px solid #fca5a5",
        borderRight: "1px solid #fca5a5",
        borderBottom: "1px solid #fca5a5",
        color: "#991b1b",
      },
      textClass: "text-red-950 font-bold",
      badgeClass: "bg-red-600 text-white font-bold px-2 py-0.5 rounded text-[10px]",
      badgeText: "CANCELADO",
      borderColor: "#dc2626",
    };
  }
  if (st === "confirmado" || st === "completado") {
    return {
      style: {
        backgroundColor: "#d1fae5",
        borderLeft: "4px solid #10b981",
        borderTop: "1px solid #6ee7b7",
        borderRight: "1px solid #6ee7b7",
        borderBottom: "1px solid #6ee7b7",
        color: "#065f46",
      },
      textClass: "text-emerald-950 font-bold",
      badgeClass: "bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[10px]",
      badgeText: st === "completado" ? "COMPLETADO" : "CONFIRMADO ✓",
      borderColor: "#10b981",
    };
  }
  // agendado / pendiente confirmación
  return {
    style: {
      backgroundColor: "#fef3c7",
      borderLeft: "4px solid #f59e0b",
      borderTop: "1px solid #fcd34d",
      borderRight: "1px solid #fcd34d",
      borderBottom: "1px solid #fcd34d",
      color: "#78350f",
    },
    textClass: "text-amber-950 font-bold",
    badgeClass: "bg-amber-500 text-white font-bold px-2 py-0.5 rounded text-[10px]",
    badgeText: "PENDIENTE",
    borderColor: "#f59e0b",
  };
}

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("dia");
  const [activeProfessional, setActiveProfessional] = useState("all");
  const [user, setUser] = useState<{id: string, name: string, role: string} | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedSlotDate, setSelectedSlotDate] = useState<string | null>(null);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null);
  const [editingApp, setEditingApp] = useState<Appointment | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredApp, setHoveredApp] = useState<{ app: Appointment; x: number; y: number } | null>(null);

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [profsRes, appsRes] = await Promise.all([
        fetchAPI("/api/data/professionals"),
        fetchAPI("/api/data/appointments"),
      ]);
      setProfessionals(await profsRes.json());
      setAppointments(await appsRes.json());
    } catch (err) { console.error(err); }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      setUser(parsedUser);
      if (parsedUser.role.toLowerCase() !== "admin") {
        setActiveProfessional(parsedUser.id);
      }
    }
    fetchAll();
    
    const intervalId = setInterval(() => {
      fetchAll(true);
    }, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const isAdmin = user?.role?.toLowerCase() === "admin";

  const todayStr = currentDate.toISOString().split("T")[0];
  const dateLabel = currentDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const dateCapitalized = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  const dayApps = appointments.filter(a => {
    const matchDate = a.date === todayStr;
    const matchProf = activeProfessional === "all" || a.professionalName === professionals.find(p => p.id === activeProfessional)?.name;
    return matchDate && matchProf;
  });

  // Google Calendar style layout calculation
  interface PosApp extends Appointment {
    top: number;
    height: number;
    startMin: number;
    endMin: number;
    column: number;
    totalColumns: number;
  }

  const calculateOverlaps = (appsList: Appointment[]): PosApp[] => {
    const appsWithPos: PosApp[] = appsList.map(app => {
      const [h, m] = app.time.split(":").map(Number);
      const startMin = (h - 7) * 60 + m;
      const endMin = startMin + app.duration;
      return { ...app, startMin, endMin, top: (startMin / 60) * 64, height: (app.duration / 60) * 64, column: 0, totalColumns: 1 };
    }).sort((a, b) => a.startMin - b.startMin);

    const groups: PosApp[][] = [];
    let currentGroup: PosApp[] = [];
    let groupEnd = 0;

    for (const app of appsWithPos) {
      if (app.startMin < groupEnd) {
        currentGroup.push(app);
        groupEnd = Math.max(groupEnd, app.endMin);
      } else {
        if (currentGroup.length > 0) groups.push(currentGroup);
        currentGroup = [app];
        groupEnd = app.endMin;
      }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);

    for (const group of groups) {
      const columns: PosApp[][] = [];
      for (const app of group) {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const lastAppInCol = col[col.length - 1];
          if (lastAppInCol.endMin <= app.startMin) {
            col.push(app);
            app.column = i;
            placed = true;
            break;
          }
        }
        if (!placed) {
          app.column = columns.length;
          columns.push([app]);
        }
      }
      for (const app of group) {
        app.totalColumns = columns.length;
      }
    }
    return appsWithPos;
  };

  const appsWithPos = calculateOverlaps(dayApps);

  return (
    <AdminLayout title="Agenda" subtitle="Turnos del día"
      actions={
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold tracking-wide px-4 py-2 rounded-sm hover:bg-primary/90">
          <Plus size={13} /> Nuevo turno
        </button>
      }>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Date nav */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-sm px-3 py-2">
          <button onClick={() => { 
              const d = new Date(currentDate); 
              if (viewMode === "dia") d.setDate(d.getDate() - 1);
              else if (viewMode === "semana") d.setDate(d.getDate() - 7);
              else d.setMonth(d.getMonth() - 1);
              setCurrentDate(d); 
            }}
            className="text-muted-foreground hover:text-foreground"><ChevronLeft size={14} /></button>
          <span className="text-xs font-medium text-foreground px-1">
            {viewMode === "dia" ? dateCapitalized : viewMode === "semana" ? `Semana del ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d 'de' MMM", { locale: es })}` : format(currentDate, "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
          </span>
          <button onClick={() => { 
              const d = new Date(currentDate); 
              if (viewMode === "dia") d.setDate(d.getDate() + 1);
              else if (viewMode === "semana") d.setDate(d.getDate() + 7);
              else d.setMonth(d.getMonth() + 1);
              setCurrentDate(d); 
            }}
            className="text-muted-foreground hover:text-foreground"><ChevronRight size={14} /></button>
        </div>
        <button onClick={() => setCurrentDate(new Date())}
          className="text-xs text-muted-foreground border border-border px-3 py-2 rounded-sm hover:text-foreground hover:border-primary/50">
          Hoy
        </button>
        {/* View mode */}
        <div className="flex items-center bg-card border border-border rounded-sm overflow-hidden">
          {viewModes.map(mode => (
            <button key={mode.id} onClick={() => setViewMode(mode.id)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === mode.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {mode.label}
            </button>
          ))}
        </div>
        {/* Professional filter */}
        {isAdmin && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setActiveProfessional("all")}
              className={`px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all ${activeProfessional === "all" ? "bg-primary text-white border-transparent" : "border-border text-muted-foreground"}`}>
              Todos
            </button>
            {professionals.map(p => (
              <button key={p.id} onClick={() => setActiveProfessional(p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all ${activeProfessional === p.id ? "text-white border-transparent" : "border-border text-muted-foreground"}`}
                style={activeProfessional === p.id ? { backgroundColor: p.color } : {}}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Calendar grid */}
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-sm text-muted-foreground">Cargando turnos...</div>
        ) : viewMode === "mes" ? (
          <div className="flex flex-col">
            <div className="grid grid-cols-7 border-b border-border bg-muted/20">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                <div key={d} className="py-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-[120px]">
              {eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }) }).map((day, i) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const dayApps = appointments.filter(a => a.date === dayStr && (activeProfessional === "all" || a.professionalName === professionals.find(p => p.id === activeProfessional)?.name));
                return (
                  <div key={i} onClick={() => { setCurrentDate(day); setViewMode("dia"); }}
                    className={`border-b border-r border-border p-1.5 overflow-y-auto cursor-pointer hover:bg-accent/10 transition-colors ${!isSameMonth(day, currentDate) ? "bg-muted/10 opacity-50" : ""}`}>
                    <div className={`text-[10px] font-medium mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${isSameDay(day, new Date()) ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground"}`}>
                      {format(day, "d")}
                    </div>
                    <div className="flex flex-col gap-1">
                      {dayApps.map(app => {
                        const statusInfo = getStatusCardStyle(app.status);
                        return (
                          <div key={app.id} onClick={(e) => { e.stopPropagation(); setEditingApp(app); }}
                            onMouseEnter={(e) => setHoveredApp({ app, x: e.clientX, y: e.clientY })}
                            onMouseMove={(e) => setHoveredApp(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                            onMouseLeave={() => setHoveredApp(null)}
                            className="text-[9px] px-1.5 py-1 rounded-sm truncate cursor-pointer hover:opacity-90 transition-opacity font-medium shadow-xs"
                            style={statusInfo.style}>
                            <span className={statusInfo.textClass}>{app.time}</span>{" "}
                            <span className="font-bold">{app.clientName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === "semana" ? (
          <div className="flex bg-card">
            <div className="w-14 flex-shrink-0 border-r border-border pt-10">
              {hours.map(h => (
                <div key={h} className="h-16 flex items-start justify-end pr-2 pt-1"><span className="text-[10px] text-muted-foreground">{h}</span></div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7">
              {eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) }).map((day, i) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const dApps = appointments.filter(a => a.date === dayStr && (activeProfessional === "all" || a.professionalName === professionals.find(p => p.id === activeProfessional)?.name));
                const dAppsWithPos = calculateOverlaps(dApps);
                
                return (
                  <div key={i} className="border-r border-border relative">
                    <div className="h-10 border-b border-border flex flex-col items-center justify-center sticky top-0 bg-card z-20">
                      <span className="text-[9px] text-muted-foreground uppercase font-medium">{format(day, "EEE", { locale: es })}</span>
                      <span className={`text-[11px] font-bold ${isSameDay(day, new Date()) ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</span>
                    </div>
                    <div className="relative min-h-[896px]">
                      <div className="absolute inset-0 flex flex-col z-0 pointer-events-none">
                        {hours.map(h => <div key={h} className="h-16 border-b border-border/30 w-full" />)}
                      </div>
                      <div className="absolute inset-0 flex flex-col z-0">
                        {hours.map((h, j) => (
                          <div key={h} className="h-16 hover:bg-accent/5 cursor-pointer group" onClick={() => { setSelectedSlotDate(dayStr); setSelectedSlotTime(h); setShowModal(true); }} />
                        ))}
                      </div>
                       {dAppsWithPos.map(app => {
                           const width = 100 / app.totalColumns;
                           const left = app.column * width;
                           const statusInfo = getStatusCardStyle(app.status);
                           return (
                             <div key={app.id}
                               onClick={(e) => { e.stopPropagation(); setEditingApp(app); }}
                               onMouseEnter={(e) => setHoveredApp({ app, x: e.clientX, y: e.clientY })}
                               onMouseMove={(e) => setHoveredApp(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                               onMouseLeave={() => setHoveredApp(null)}
                               className="absolute rounded-sm overflow-hidden shadow-sm transition-all hover:z-20 z-10 cursor-pointer flex flex-col justify-start px-1.5 py-1"
                               style={{ 
                                 top: `${app.top}px`, 
                                 height: `${app.height}px`, 
                                 left: `calc(${left}% + 1px)`, 
                                 width: `calc(${width}% - 2px)`,
                                 ...statusInfo.style,
                               }}>
                               <p className={`text-[8px] font-bold truncate leading-tight ${statusInfo.textClass}`}>{app.time}</p>
                               <p className="text-[9px] font-semibold truncate leading-tight text-foreground">{app.clientName}</p>
                             </div>
                           );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex">
            {/* Time column */}
            <div className="w-16 flex-shrink-0 border-r border-border">
              {hours.map(h => (
                <div key={h} className="h-16 flex items-start justify-end pr-3 pt-1">
                  <span className="text-[10px] text-muted-foreground">{h}</span>
                </div>
              ))}
            </div>
            {/* Events area */}
            <div className="flex-1 relative bg-card min-h-[896px]">
              {/* Background grid */}
              <div className="absolute inset-0 pointer-events-none flex flex-col">
                {hours.map(h => (
                  <div key={h} className="h-16 border-b border-border/30 w-full" />
                ))}
              </div>
              
              {/* Interactive slots */}
              <div className="absolute inset-0 flex flex-col z-0">
                {hours.map((h, i) => (
                  <div key={h} className="h-16 hover:bg-accent/5 cursor-pointer flex items-center justify-center group"
                    onClick={() => { setSelectedSlotDate(todayStr); setSelectedSlotTime(h); setShowModal(true); }}>
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground">+ Nuevo turno</span>
                  </div>
                ))}
              </div>

              {/* Absolutely positioned events */}
              {appsWithPos.map(app => {
                const width = 100 / app.totalColumns;
                const left = app.column * width;
                const statusInfo = getStatusCardStyle(app.status);
                
                return (
                  <div key={app.id}
                    onClick={(e) => { e.stopPropagation(); setEditingApp(app); }}
                    onMouseEnter={(e) => setHoveredApp({ app, x: e.clientX, y: e.clientY })}
                    onMouseMove={(e) => setHoveredApp(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                    onMouseLeave={() => setHoveredApp(null)}
                    className="absolute rounded-sm overflow-hidden shadow-sm transition-all hover:z-20 z-10 cursor-pointer flex flex-col justify-start px-2 py-1"
                    style={{
                      top: `${app.top}px`,
                      height: `${app.height}px`,
                      left: `calc(${left}% + 4px)`,
                      width: `calc(${width}% - 8px)`,
                      ...statusInfo.style,
                    }}
                  >
                    <p className={`text-[9px] font-bold truncate leading-tight ${statusInfo.textClass}`}>{app.time} · {app.professionalName}</p>
                    <p className="text-[10px] font-semibold truncate leading-tight text-foreground">{app.clientName}</p>
                    <p className="text-[9px] truncate leading-tight text-muted-foreground">{app.serviceName}</p>
                  </div>
                );
              })}

              {dayApps.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <div className="text-center">
                    <Calendar size={32} className="text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No hay turnos para este día</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Hacé clic en cualquier hora para agregar uno</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && <NewTurnModal onClose={() => setShowModal(false)} defaultDate={selectedSlotDate || todayStr} defaultTime={selectedSlotTime || "10:00"} onCreated={fetchAll} isAdmin={isAdmin} />}
        {editingApp && <EditTurnModal app={editingApp} onClose={() => setEditingApp(null)} onUpdated={fetchAll} isAdmin={isAdmin} />}
      </AnimatePresence>

      {/* Hover Tooltip */}
      {hoveredApp && (() => {
        const { app, x, y } = hoveredApp;
        const statusInfo = getStatusCardStyle(app.status);

        return (
          <div
            className="hidden md:block fixed z-[9999] pointer-events-none bg-card border border-border rounded-lg shadow-xl px-4 py-3 min-w-[210px] max-w-[270px]"
            style={{
              top: y + 14,
              left: x + 14,
              borderLeft: `4px solid ${statusInfo.borderColor}`,
              transform: x > window.innerWidth - 280 ? "translateX(-110%)" : undefined,
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {app.professionalName}
              </span>
              <span className={statusInfo.badgeClass}>
                {statusInfo.badgeText}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground leading-tight">{app.clientName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{app.serviceName}</p>
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/40">
              <span className="text-xs font-medium text-foreground">📅 {app.date.split("-").reverse().join("/")}</span>
              <span className="text-xs font-medium text-foreground">⏰ {app.time}hs</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-1">
              <span className="text-xs font-semibold text-foreground">${app.price?.toLocaleString("es-AR")}</span>
              <span className="text-[10px] text-muted-foreground/60 italic">Clic para editar</span>
            </div>
          </div>
        );
      })()}
    </AdminLayout>
  );
}
