import { useState, useEffect } from "react";
import { X, CheckCircle2, ChevronDown, MapPin, Instagram, MessageCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Service { id: string; name: string; category: string; duration: number; price: number; }
interface Professional { id: string; name: string; role: string; color: string; initial: string; }

interface BookingWizardProps {
  onClose: () => void;
}

export default function BookingWizard({ onClose }: BookingWizardProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalServices, setProfessionalServices] = useState<{id: string, professionalId: string, serviceId: string}[]>([]);
  const [professionalSchedules, setProfessionalSchedules] = useState<any[]>([]);

  // UI state
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientData, setClientData] = useState({ name: "", phone: "", birthday: "" });
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherDiscount, setVoucherDiscount] = useState<{type: string, value: number} | null>(null);
  const [voucherStatus, setVoucherStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
  const [voucherMessage, setVoucherMessage] = useState("");
  
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/data/services").then(r => r.json()).then(setServices).catch(console.error);
    fetch("/api/data/professionals").then(r => r.json()).then(setProfessionals).catch(console.error);
    fetch("/api/data/professional-services").then(r => r.json()).then(setProfessionalServices).catch(console.error);
  }, []);

  // Professional schedules
  useEffect(() => {
    if (selectedProfessional) {
      fetch(`/api/data/schedules`)
        .then(r => r.json())
        .then(data => {
          const filtered = data.filter((s: any) => s.professionalId === selectedProfessional.id);
          setProfessionalSchedules(filtered);
        })
        .catch(console.error);
    }
  }, [selectedProfessional]);

  // Available times
  useEffect(() => {
    if (selectedDate && selectedProfessional && selectedServices.length > 0) {
      setLoadingTimes(true);
      const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);
      fetch(`/api/bookings/availability?date=${selectedDate}&professionalId=${selectedProfessional.id}&serviceDuration=${totalDuration}`)
        .then(r => r.json())
        .then(data => {
          setAvailableTimes(data.availableTimes || []);
          setSelectedTime("");
        })
        .catch(console.error)
        .finally(() => setLoadingTimes(false));
    }
  }, [selectedDate, selectedProfessional, selectedServices]);

  const categories = [...new Set(services.map(s => s.category))];

  const filteredProfessionals = professionals.filter(p => {
    if (selectedServices.length === 0) return p.role.toLowerCase() !== "admin";
    if (p.role.toLowerCase() === "admin") return false;
    
    // Simplification: if the professional can do AT LEAST ONE of the selected services
    // Ideally it should be ALL, but let's keep it simple or check for all.
    const canDoAll = selectedServices.every(selSvc => {
      const hasExplicit = professionalServices.some(ps => ps.professionalId === p.id && ps.serviceId === selSvc.id);
      if (hasExplicit) return true;
      const hasAnyMapping = professionalServices.some(ps => ps.professionalId === p.id);
      if (!hasAnyMapping) {
        return p.role.toLowerCase() === selSvc.category.toLowerCase();
      }
      return false;
    });
    
    return canDoAll;
  });

  const generateNext14Days = () => {
    const days = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let i = 0; i < 21; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const allowedDaysOfWeek = Array.from(new Set(professionalSchedules.map(s => s.dayOfWeek)));

  const toggleService = (s: Service) => {
    if (selectedServices.some(sel => sel.id === s.id)) {
      setSelectedServices(selectedServices.filter(sel => sel.id !== s.id));
    } else {
      setSelectedServices([...selectedServices, s]);
    }
    setSelectedProfessional(null);
    setSelectedDate("");
    setSelectedTime("");
  };

  const validateVoucher = async () => {
    if (!voucherCode) return;
    setVoucherStatus("validating");
    try {
      const res = await fetch("/api/vouchers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucherCode })
      });
      const data = await res.json();
      if (data.valid) {
        setVoucherStatus("valid");
        setVoucherDiscount({ type: data.discountType, value: data.discountValue });
        setVoucherMessage(data.message);
      } else {
        setVoucherStatus("invalid");
        setVoucherDiscount(null);
        setVoucherMessage(data.error);
      }
    } catch (err) {
      setVoucherStatus("invalid");
      setVoucherMessage("Error de conexión");
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const primaryService = selectedServices[0];
      const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);
      let totalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);
      
      if (voucherStatus === "valid" && voucherDiscount) {
        if (voucherDiscount.type === "percent") {
          totalPrice = totalPrice - (totalPrice * (voucherDiscount.value / 100));
        } else if (voucherDiscount.type === "fixed") {
          totalPrice = Math.max(0, totalPrice - voucherDiscount.value);
        }
      }
      
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: clientData,
          appointment: {
            serviceId: primaryService?.id,
            professionalId: selectedProfessional?.id,
            date: selectedDate,
            time: selectedTime,
            duration: totalDuration,
            price: totalPrice,
            voucherCode: voucherStatus === "valid" ? voucherCode.toUpperCase() : undefined,
          }
        })
      });
      if (res.ok) {
        setSuccess(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatISO = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex justify-center bg-background text-foreground overflow-y-auto scrollbar-thin"
    >
      <div className="w-full max-w-lg min-h-screen relative pb-24">
        {/* Close Button - More subtle on top right */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-50 p-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <X size={20} />
        </button>

        {success ? (
          <div className="flex flex-col items-center justify-center p-12 min-h-screen">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={32} className="text-primary" />
            </div>
            <h2 className="text-2xl font-serif text-center mb-4 text-foreground">¡Turno Confirmado!</h2>
            <p className="text-muted-foreground text-center mb-8 max-w-sm text-sm">
              Te enviamos un mensaje de WhatsApp con los detalles de tu turno, {clientData.name}.
            </p>
            <button
              onClick={onClose}
              className="bg-primary text-primary-foreground font-medium px-8 py-3 rounded-full hover:bg-primary/90 transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="pt-12">
            {/* Header Profile Section */}
            <div className="flex flex-col items-center px-6">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4 overflow-hidden border border-primary/30">
                <span className="font-serif text-3xl text-primary">JM</span>
              </div>
              <h1 className="font-serif text-xl font-bold text-center text-foreground">Estudio Joha Molinero</h1>
              <p className="text-[10px] text-muted-foreground mt-2 text-center max-w-sm px-4 leading-relaxed">
                Bulevar Sarmiento 1089 Esquina Catamarca, Río Segundo, Córdoba, 5940
              </p>
              <p className="text-xs mt-4 text-center max-w-md px-4 text-foreground/70 leading-relaxed font-light">
                Todo lo que necesitás para verte increíble, en un solo lugar. Convertimos tu rutina de belleza en una experiencia pensada para vos. Menos vueltas, más resultados. Todo tu beauty en un solo lugar. No es solo belleza. Es el momento que te dedicás para sentirte increíble. Uñas, Pies, Cejas, Facial, Depilación, Tratam. Corporales, Maquillaje, Peinado, Bronceado Orgánico y mucho más.
              </p>
              
              <div className="flex items-center gap-4 mt-6">
                <a href="https://maps.google.com/?q=Bulevar+Sarmiento+1089+Río+Segundo" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors">
                  <MapPin size={16} />
                </a>
                <a href="https://instagram.com/estudiojohamolinero" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors">
                  <Instagram size={16} />
                </a>
                <a href="https://wa.me/5493510000000" target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors">
                  <MessageCircle size={16} />
                </a>
              </div>
            </div>

            <div className="w-full mt-10 px-6 space-y-10">
              {/* Divider */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              {/* 1. Services */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <span className="text-primary text-lg leading-none">✦</span> Elegí tus servicios
                  </h2>
                  <span className="text-[10px] font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1">✨ Podés elegir más de uno</span>
                </div>

                <div className="space-y-2">
                  {categories.map(cat => {
                    const catServices = services.filter(s => s.category === cat);
                    const isOpen = openCategory === cat;
                    return (
                      <div key={cat} className="bg-transparent border border-border/50 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setOpenCategory(isOpen ? null : cat)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-accent/5 transition-colors"
                        >
                          <span className="font-medium text-sm text-foreground">{cat}</span>
                          <div className="flex items-center gap-3 text-muted-foreground text-xs">
                            {catServices.length} servicios
                            <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                          </div>
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                              className="overflow-hidden bg-transparent border-t border-border/50"
                            >
                              <div className="p-2 space-y-2">
                                {catServices.map(s => {
                                  const isSelected = selectedServices.some(sel => sel.id === s.id);
                                  return (
                                    <button
                                      key={s.id}
                                      onClick={() => toggleService(s)}
                                      className={`w-full p-4 rounded-xl flex items-center justify-between transition-colors text-left ${
                                        isSelected ? "border-primary bg-primary/5" : "hover:bg-accent/10 border-transparent"
                                      } border`}
                                    >
                                      <div>
                                        <p className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-foreground/80"}`}>{s.name}</p>
                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                          <Clock size={10} /> {s.duration} min
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className={`font-bold text-sm ${isSelected ? "text-primary" : "text-foreground"}`}>
                                          ${s.price.toLocaleString("es-AR")}
                                        </span>
                                        <div className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                                          {isSelected && <CheckCircle2 size={12} className="text-primary-foreground" />}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Professionals */}
              <div className={`space-y-4 transition-opacity duration-300 ${selectedServices.length === 0 ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <span className="text-primary text-lg leading-none">✦</span> Elegí tu profesional
                  </h2>
                  <span className="text-[10px] text-muted-foreground">Opcional</span>
                </div>

                <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-thin">
                  {filteredProfessionals.length === 0 && selectedServices.length > 0 ? (
                    <p className="text-xs text-muted-foreground">No hay profesionales disponibles para todos estos servicios.</p>
                  ) : (
                    filteredProfessionals.map(p => {
                      const isSelected = selectedProfessional?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedProfessional(p);
                            setSelectedDate("");
                            setSelectedTime("");
                          }}
                          className={`flex flex-col items-center min-w-[72px] gap-2 transition-all ${
                            isSelected ? "opacity-100 scale-105" : "opacity-70 hover:opacity-100"
                          }`}
                        >
                          <div
                            className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                              isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                            }`}
                            style={{ backgroundColor: p.color + "22", border: `1px solid ${p.color}44`, color: p.color }}
                          >
                            {p.initial}
                          </div>
                          <span className={`text-xs font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>{p.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 3. Date and Time */}
              <div className={`space-y-4 transition-opacity duration-300 ${(!selectedServices.length || !selectedProfessional) ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <span className="text-primary text-lg leading-none">✦</span> Elegí fecha y hora
                  </h2>
                </div>

                {/* Date Slider */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border">
                  {generateNext14Days().map((d, i) => {
                    const dateISO = formatISO(d);
                    const isSelected = selectedDate === dateISO;
                    const isAllowed = allowedDaysOfWeek.length === 0 || allowedDaysOfWeek.includes(d.getDay());
                    
                    if (!isAllowed) return null;

                    return (
                      <button
                        key={dateISO}
                        onClick={() => setSelectedDate(dateISO)}
                        className={`flex flex-col items-center justify-center min-w-[64px] h-[72px] rounded-xl border transition-all flex-shrink-0 ${
                          isSelected 
                            ? "bg-primary/10 border-primary text-primary" 
                            : "bg-transparent border-border/50 hover:border-primary/50 text-muted-foreground"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider">{DAYS_SHORT[d.getDay()]}</span>
                        <span className={`text-xl font-bold my-0.5 ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {d.getDate()}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider">{d.toLocaleString('es', { month: 'short' })}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div className="pt-4">
                    {loadingTimes ? (
                      <p className="text-xs text-muted-foreground animate-pulse text-center py-4">Cargando horarios...</p>
                    ) : availableTimes.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No hay horarios disponibles para esta fecha.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {availableTimes.map(t => (
                          <button
                            key={t}
                            onClick={() => setSelectedTime(t)}
                            className={`py-3 rounded-xl text-sm font-medium border transition-all ${
                              selectedTime === t
                                ? "bg-primary border-primary text-primary-foreground"
                                : "bg-transparent border-border/50 hover:border-primary/50 text-foreground"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Client Info Form */}
              <div className={`space-y-4 pt-8 border-t border-border/30 transition-opacity duration-300 ${(!selectedServices.length || !selectedProfessional || !selectedDate || !selectedTime) ? "hidden" : "block"}`}>
                <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <span className="text-primary text-lg leading-none">✦</span> Completá tus datos
                </h2>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    value={clientData.name}
                    onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                    className="w-full bg-transparent border border-border/50 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-primary text-foreground"
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono (WhatsApp)"
                    value={clientData.phone}
                    onChange={(e) => setClientData({ ...clientData, phone: e.target.value })}
                    className="w-full bg-transparent border border-border/50 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-primary text-foreground"
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground pl-1">Fecha de cumpleaños (Opcional)</label>
                    <input
                      type="date"
                      value={clientData.birthday}
                      onChange={(e) => setClientData({ ...clientData, birthday: e.target.value })}
                      className="w-full bg-transparent border border-border/50 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-primary text-foreground"
                    />
                  </div>
                  
                  {/* Voucher Input */}
                  <div className="flex flex-col gap-1.5 pt-2">
                    <label className="text-xs text-muted-foreground pl-1">Código de descuento (Opcional)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ej: Codigo-promocional"
                        value={voucherCode}
                        onChange={(e) => {
                          setVoucherCode(e.target.value.toUpperCase());
                          setVoucherStatus("idle");
                          setVoucherMessage("");
                        }}
                        className="flex-1 bg-transparent border border-border/50 rounded-xl px-4 py-3.5 text-sm uppercase focus:outline-none focus:border-primary text-foreground"
                      />
                      <button
                        onClick={validateVoucher}
                        disabled={!voucherCode || voucherStatus === "validating"}
                        className="bg-secondary text-secondary-foreground font-medium px-4 py-3.5 rounded-xl text-sm disabled:opacity-50 hover:bg-secondary/80 transition-colors"
                      >
                        {voucherStatus === "validating" ? "Validando..." : "Aplicar"}
                      </button>
                    </div>
                    {voucherMessage && (
                      <p className={`text-xs pl-1 ${voucherStatus === "valid" ? "text-emerald-500" : "text-red-500"}`}>
                        {voucherMessage}
                      </p>
                    )}
                  </div>

                  {(() => {
                    const originalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);
                    let finalPrice = originalPrice;
                    if (voucherStatus === "valid" && voucherDiscount) {
                      if (voucherDiscount.type === "percent") {
                        finalPrice = originalPrice - (originalPrice * (voucherDiscount.value / 100));
                      } else if (voucherDiscount.type === "fixed") {
                        finalPrice = Math.max(0, originalPrice - voucherDiscount.value);
                      }
                    }

                    return (
                      <button
                        onClick={handleSubmit}
                        disabled={loading || !clientData.name || !clientData.phone}
                        className="w-full mt-2 bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex flex-col items-center justify-center gap-1"
                      >
                        <span className="flex items-center gap-2">{loading ? "Confirmando..." : "Confirmar Turno"}</span>
                        <div className="flex items-center gap-2 text-xs opacity-90 font-medium">
                          {finalPrice !== originalPrice && (
                            <span className="line-through opacity-70">${originalPrice.toLocaleString()}</span>
                          )}
                          <span>Total: ${finalPrice.toLocaleString()}</span>
                        </div>
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
