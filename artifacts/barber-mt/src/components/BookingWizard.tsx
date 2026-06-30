import { useState, useEffect, useMemo } from "react";
import { X, CheckCircle2, ChevronDown, MapPin, Instagram, MessageCircle, Clock, AlertCircle, Sparkles, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchAPI } from "@/lib/api";
import {
  fetchPublicInfo,
  instagramHandle,
  whatsappUrl,
  mapsUrl,
  type PublicInfo,
} from "@/lib/publicInfo";

interface Service { id: string; name: string; category: string; duration: number; price: number; }
interface Professional { id: string; name: string; role: string; color: string; initial: string; }

interface BookingWizardProps {
  onClose: () => void;
  initialServiceId?: string;
  publicInfo?: PublicInfo | null;
}

const norm = (s: string) => s.toLowerCase().trim();

export default function BookingWizard({ onClose, initialServiceId, publicInfo: publicInfoProp }: BookingWizardProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [professionalServices, setProfessionalServices] = useState<{ id: string; professionalId: string; serviceId: string }[]>([]);
  const [professionalSchedules, setProfessionalSchedules] = useState<{ dayOfWeek: number }[]>([]);
  const [publicInfo, setPublicInfo] = useState<PublicInfo | null>(publicInfoProp ?? null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(false);

  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [clientData, setClientData] = useState({ name: "", phone: "", birthday: "" });
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherDiscount, setVoucherDiscount] = useState<{ type: string; value: number } | null>(null);
  const [voucherStatus, setVoucherStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
  const [voucherMessage, setVoucherMessage] = useState("");

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Oferta de turno alternativo con 5% OFF
  const [altTimeOffer, setAltTimeOffer] = useState<string | null>(null);
  const [altOfferDismissed, setAltOfferDismissed] = useState(false);
  const [altDiscountApplied, setAltDiscountApplied] = useState(false);

  const loadData = () => {
    setDataLoading(true);
    setDataError(false);
    Promise.all([
      fetchAPI("/api/data/services").then(r => {
        if (!r.ok) throw new Error("services fetch failed");
        return r.json();
      }),
      fetchAPI("/api/data/professionals").then(r => {
        if (!r.ok) throw new Error("professionals fetch failed");
        return r.json();
      }),
      fetchAPI("/api/data/professional-services").then(r => {
        if (!r.ok) throw new Error("links fetch failed");
        return r.json();
      }),
      publicInfoProp ? Promise.resolve(publicInfoProp) : fetchPublicInfo(),
    ])
      .then(([svcs, profs, links, info]) => {
        setServices(Array.isArray(svcs) ? svcs : []);
        setProfessionals(profs);
        setProfessionalServices(links);
        setPublicInfo(info);
      })
      .catch(() => setDataError(true))
      .finally(() => setDataLoading(false));
  };

  useEffect(() => { loadData(); }, [publicInfoProp]);

  useEffect(() => {
    if (initialized || dataLoading || !initialServiceId || services.length === 0) return;
    const svc = services.find(s => s.id === initialServiceId);
    if (svc) {
      setSelectedServices([svc]);
      setOpenCategory(svc.category);
    }
    setInitialized(true);
  }, [initialized, dataLoading, initialServiceId, services]);

  useEffect(() => {
    if (selectedProfessional) {
      fetchAPI("/api/data/schedules")
        .then(r => r.json())
        .then(data => setProfessionalSchedules(data.filter((s: any) => s.professionalId === selectedProfessional.id)))
        .catch(console.error);
    } else {
      setProfessionalSchedules([]);
    }
  }, [selectedProfessional]);

  useEffect(() => {
    if (selectedDate && selectedProfessional && selectedServices.length > 0) {
      setLoadingTimes(true);
      const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);
      fetchAPI(`/api/bookings/availability?date=${selectedDate}&professionalId=${selectedProfessional.id}&serviceDuration=${totalDuration}`)
        .then(r => r.json())
        .then(data => {
          setAvailableTimes(data.availableTimes || []);
          setSelectedTime("");
        })
        .catch(console.error)
        .finally(() => setLoadingTimes(false));
    }
  }, [selectedDate, selectedProfessional, selectedServices]);

  const categories = useMemo(() => [...new Set(services.map(s => s.category))], [services]);

  const filteredProfessionals = useMemo(() => professionals.filter(p => {
    if (selectedServices.length === 0) return norm(p.role) !== "admin";
    if (norm(p.role) === "admin") return false;

    return selectedServices.every(selSvc => {
      const hasExplicit = professionalServices.some(ps => ps.professionalId === p.id && ps.serviceId === selSvc.id);
      if (hasExplicit) return true;
      const hasAnyMapping = professionalServices.some(ps => ps.professionalId === p.id);
      if (!hasAnyMapping) return norm(p.role) === norm(selSvc.category);
      return false;
    });
  }), [professionals, selectedServices, professionalServices]);

  useEffect(() => {
    if (filteredProfessionals.length === 1) {
      setSelectedProfessional(prev => prev?.id === filteredProfessionals[0].id ? prev : filteredProfessionals[0]);
    } else if (selectedProfessional && !filteredProfessionals.some(p => p.id === selectedProfessional.id)) {
      setSelectedProfessional(null);
      setSelectedDate("");
      setSelectedTime("");
    }
  }, [filteredProfessionals, selectedProfessional]);

  const toggleService = (s: Service) => {
    if (selectedServices.some(sel => sel.id === s.id)) {
      setSelectedServices(selectedServices.filter(sel => sel.id !== s.id));
    } else {
      setSelectedServices([...selectedServices, s]);
    }
    setSelectedProfessional(null);
    setSelectedDate("");
    setSelectedTime("");
    setSubmitError("");
  };

  const validateVoucher = async () => {
    if (!voucherCode) return;
    setVoucherStatus("validating");
    try {
      const res = await fetchAPI("/api/vouchers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucherCode }),
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
    } catch {
      setVoucherStatus("invalid");
      setVoucherMessage("Error de conexión");
    }
  };

  const handleSubmit = async () => {
    if (!selectedProfessional) {
      setSubmitError("Elegí una profesional para continuar");
      return;
    }
    const phone = clientData.phone.replace(/\D/g, "");
    if (phone.length < 10) {
      setSubmitError("Ingresá un teléfono válido con código de área");
      return;
    }

    setLoading(true);
    setSubmitError("");
    try {
      const primaryService = selectedServices[0];
      const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);
      let totalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);

      // Aplicar descuento de turno alternativo (5% OFF)
      if (altDiscountApplied) {
        totalPrice = totalPrice - (totalPrice * 0.05);
      }

      if (voucherStatus === "valid" && voucherDiscount) {
        if (voucherDiscount.type === "percent") {
          totalPrice = totalPrice - (totalPrice * (voucherDiscount.value / 100));
        } else if (voucherDiscount.type === "fixed") {
          totalPrice = Math.max(0, totalPrice - voucherDiscount.value);
        }
      }

      const res = await fetchAPI("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: clientData,
          appointment: {
            serviceId: primaryService?.id,
            professionalId: selectedProfessional.id,
            date: selectedDate,
            time: selectedTime,
            duration: totalDuration,
            price: totalPrice,
            voucherCode: voucherStatus === "valid" ? voucherCode.toUpperCase() : undefined,
          },
        }),
      });

      if (res.ok) {
        setSuccess(true);
        return;
      }

      const data = await res.json().catch(() => ({}));
      setSubmitError(data.error || "No se pudo confirmar el turno. Intentá de nuevo.");
    } catch {
      setSubmitError("Error de conexión. Verificá tu internet e intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const formatISO = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const generateNext21Days = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 21; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const allowedDaysOfWeek = Array.from(new Set(professionalSchedules.map(s => s.dayOfWeek)));

  const settings = publicInfo?.settings;
  const businessName = settings?.business_name || "Estudio Joha Molinero";
  const address = settings?.business_address || "Río Segundo, Córdoba";
  const igHandle = instagramHandle(settings?.business_instagram || "estudiojohamolinero");
  const waLink = whatsappUrl(settings?.business_phone || "", settings?.whatsapp_link || "");
  const mapLink = mapsUrl(address);

  const originalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);
  let finalPrice = originalPrice;
  // Aplicar descuento de turno alternativo (5% OFF)
  if (altDiscountApplied) {
    finalPrice = finalPrice - (finalPrice * 0.05);
  }
  if (voucherStatus === "valid" && voucherDiscount) {
    if (voucherDiscount.type === "percent") {
      finalPrice = finalPrice - (finalPrice * (voucherDiscount.value / 100));
    } else if (voucherDiscount.type === "fixed") {
      finalPrice = Math.max(0, finalPrice - voucherDiscount.value);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex justify-center bg-background text-foreground overflow-y-auto scrollbar-thin"
    >
      <div className="w-full max-w-lg min-h-screen relative pb-24">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 text-muted-foreground hover:text-primary transition-colors"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        {success ? (
          <div className="flex flex-col items-center justify-center p-12 min-h-screen">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={32} className="text-primary" />
            </div>
            <h2 className="text-2xl font-serif text-center mb-4 text-foreground">¡Turno Confirmado!</h2>
            <p className="text-muted-foreground text-center mb-4 max-w-sm text-sm">
              Tu turno quedó registrado, {clientData.name}.
            </p>
            <p className="text-muted-foreground text-center mb-8 max-w-sm text-xs">
              Recibirás un WhatsApp con los detalles. Si no llega en unos minutos, escribinos.
            </p>
            <button
              onClick={onClose}
              className="bg-primary text-primary-foreground font-medium px-8 py-3 rounded-full hover:bg-primary/90 transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : dataLoading ? (
          <div className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">
            Cargando reserva...
          </div>
        ) : dataError ? (
          <div className="flex flex-col items-center justify-center p-12 min-h-screen text-center">
            <AlertCircle size={40} className="text-red-400 mb-4" />
            <h2 className="text-lg font-serif mb-2 text-foreground">No se pudo conectar al servidor</h2>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              El sistema de reservas necesita el API activo. Ejecutá en la terminal:{" "}
              <code className="text-primary text-xs">pnpm dev</code> desde la carpeta del proyecto.
            </p>
            <button
              onClick={loadData}
              className="bg-primary text-primary-foreground font-medium px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors text-sm"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="pt-12">
            <div className="flex flex-col items-center px-6">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-3 border border-primary/30">
                <span className="font-serif text-2xl text-primary">JM</span>
              </div>
              <h1 className="font-serif text-xl font-bold text-center text-foreground">{businessName}</h1>
              <p className="text-[11px] text-muted-foreground mt-2 text-center max-w-sm leading-relaxed">
                {address}
              </p>

              <div className="flex items-center gap-4 mt-5">
                <a href={mapLink} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors" aria-label="Ver en mapa">
                  <MapPin size={16} />
                </a>
                <a href={`https://instagram.com/${igHandle}`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors" aria-label="Instagram">
                  <Instagram size={16} />
                </a>
                <a href={waLink} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors" aria-label="WhatsApp">
                  <MessageCircle size={16} />
                </a>
              </div>
            </div>

            <div className="w-full mt-8 px-6 space-y-10">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <span className="text-primary text-lg leading-none">✦</span> Elegí tus servicios
                  </h2>
                  <span className="text-[10px] font-medium text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">Podés elegir más de uno</span>
                </div>

                {services.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No hay servicios disponibles en este momento.</p>
                ) : (
                  <div className="space-y-2">
                    {categories.map(cat => {
                      const catServices = services.filter(s => s.category === cat);
                      const isOpen = openCategory === cat;
                      return (
                        <div key={cat} className="border border-border/50 rounded-xl overflow-hidden">
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
                                className="overflow-hidden border-t border-border/50"
                              >
                                <div className="p-2 space-y-2">
                                  {catServices.map(s => {
                                    const isSelected = selectedServices.some(sel => sel.id === s.id);
                                    return (
                                      <button
                                        key={s.id}
                                        onClick={() => toggleService(s)}
                                        className={`w-full p-4 rounded-xl flex items-center justify-between transition-colors text-left border ${
                                          isSelected ? "border-primary bg-primary/5" : "border-transparent hover:bg-accent/10"
                                        }`}
                                      >
                                        <div className="flex-1 min-w-0 pr-3">
                                          <p className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-foreground/80"}`}>{s.name}</p>
                                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                            <Clock size={10} /> {s.duration} min
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                          {s.price > 0 && (
                                            <span className={`font-bold text-sm ${isSelected ? "text-primary" : "text-foreground"}`}>
                                              ${s.price.toLocaleString("es-AR")}
                                            </span>
                                          )}
                                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
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
                )}
              </div>

              <div className={`space-y-4 transition-opacity duration-300 ${selectedServices.length === 0 ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
                <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <span className="text-primary text-lg leading-none">✦</span> Elegí tu profesional
                </h2>

                <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-thin">
                  {filteredProfessionals.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No hay profesionales disponibles para estos servicios.</p>
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
                          className={`flex flex-col items-center min-w-[72px] gap-2 transition-all ${isSelected ? "opacity-100 scale-105" : "opacity-70 hover:opacity-100"}`}
                        >
                          <div
                            className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                            style={{ backgroundColor: p.color + "22", border: `1px solid ${p.color}44`, color: p.color }}
                          >
                            {p.initial}
                          </div>
                          <span className={`text-xs font-medium text-center ${isSelected ? "text-primary" : "text-foreground"}`}>{p.name}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className={`space-y-4 transition-opacity duration-300 ${(!selectedServices.length || !selectedProfessional) ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
                <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <span className="text-primary text-lg leading-none">✦</span> Elegí fecha y hora
                </h2>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {generateNext21Days().map(d => {
                    const dateISO = formatISO(d);
                    const isSelected = selectedDate === dateISO;
                    const isAllowed = allowedDaysOfWeek.length === 0 || allowedDaysOfWeek.includes(d.getDay());
                    if (!isAllowed) return null;

                    return (
                      <button
                        key={dateISO}
                        onClick={() => setSelectedDate(dateISO)}
                        className={`flex flex-col items-center justify-center min-w-[64px] h-[72px] rounded-xl border transition-all flex-shrink-0 ${
                          isSelected ? "bg-primary/10 border-primary text-primary" : "bg-transparent border-border/50 hover:border-primary/50 text-muted-foreground"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider">{DAYS_SHORT[d.getDay()]}</span>
                        <span className={`text-xl font-bold my-0.5 ${isSelected ? "text-primary" : "text-foreground"}`}>{d.getDate()}</span>
                        <span className="text-[10px] uppercase tracking-wider">{d.toLocaleString("es", { month: "short" })}</span>
                      </button>
                    );
                  })}
                </div>

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
                            onClick={() => {
                              setSelectedTime(t);
                              setAltOfferDismissed(false);
                              setAltDiscountApplied(false);
                              // Buscar un turno alternativo (siguiente o anterior disponible)
                              const idx = availableTimes.indexOf(t);
                              const alt = availableTimes[idx + 1] ?? availableTimes[idx - 1] ?? null;
                              setAltTimeOffer(alt !== t ? alt : null);
                            }}
                            className={`py-3 rounded-xl text-sm font-medium border transition-all ${
                              selectedTime === t ? "bg-primary border-primary text-primary-foreground" : "bg-transparent border-border/50 hover:border-primary/50 text-foreground"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      {/* Banner de oferta de turno alternativo */}
                      <AnimatePresence>
                        {selectedTime && altTimeOffer && !altOfferDismissed && (
                          <motion.div
                            initial={{ opacity: 0, y: 12, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.97 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="mt-4 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 relative overflow-hidden"
                          >
                            {/* Brillo decorativo */}
                            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />

                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Sparkles size={16} className="text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-primary uppercase tracking-wide">Oferta especial</span>
                                  <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                    <Tag size={8} /> 5% OFF
                                  </span>
                                </div>
                                <p className="text-sm text-foreground font-medium leading-snug">
                                  ¿Podés a las <span className="text-primary font-bold">{altTimeOffer}</span>?
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Ese horario nos viene perfecto y te damos 5% de descuento 🎁
                                </p>
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => {
                                      setSelectedTime(altTimeOffer);
                                      setAltDiscountApplied(true);
                                      setAltOfferDismissed(true);
                                    }}
                                    className="flex-1 bg-primary text-primary-foreground text-xs font-bold py-2 px-3 rounded-xl hover:bg-primary/90 transition-colors"
                                  >
                                    ¡Sí, me quedo con las {altTimeOffer}!
                                  </button>
                                  <button
                                    onClick={() => setAltOfferDismissed(true)}
                                    className="text-xs text-muted-foreground border border-border/50 px-3 py-2 rounded-xl hover:border-primary/30 transition-colors"
                                  >
                                    No, gracias
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Confirmación de descuento aplicado */}
                      <AnimatePresence>
                        {altDiscountApplied && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-3 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-3 py-2"
                          >
                            <CheckCircle2 size={13} />
                            ¡5% de descuento aplicado por el cambio de horario!
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                )}
              </div>

              <div className={`space-y-4 pt-8 border-t border-border/30 ${(!selectedServices.length || !selectedProfessional || !selectedDate || !selectedTime) ? "hidden" : "block"}`}>
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
                    placeholder="Teléfono WhatsApp (ej: 351 000 0000)"
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

                  <div className="flex flex-col gap-1.5 pt-2">
                    <label className="text-xs text-muted-foreground pl-1">Código de descuento (Opcional)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ej: VOLVISTE-10OFF"
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
                        {voucherStatus === "validating" ? "..." : "Aplicar"}
                      </button>
                    </div>
                    {voucherMessage && (
                      <p className={`text-xs pl-1 ${voucherStatus === "valid" ? "text-emerald-500" : "text-red-500"}`}>{voucherMessage}</p>
                    )}
                  </div>

                  {submitError && (
                    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
                      <AlertCircle size={14} />
                      {submitError}
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={loading || !clientData.name || !clientData.phone}
                    className="w-full mt-2 bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex flex-col items-center justify-center gap-1"
                  >
                    <span>{loading ? "Confirmando..." : "Confirmar Turno"}</span>
                    {selectedServices.length > 0 && (
                      <div className="flex items-center gap-2 text-xs opacity-90 font-medium">
                        {finalPrice !== originalPrice && (
                          <span className="line-through opacity-70">${originalPrice.toLocaleString("es-AR")}</span>
                        )}
                        <span>Total: ${finalPrice.toLocaleString("es-AR")}</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
