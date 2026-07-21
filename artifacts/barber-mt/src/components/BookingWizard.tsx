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
  const [blockedDates, setBlockedDates] = useState<string[]>([]); // YYYY-MM-DD array

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

  // Upsell post-confirmación (con disponibilidad real)
  interface UpsellSuggestion { service: Service; time: string; date: string; }
  const [upsellSuggestion, setUpsellSuggestion] = useState<UpsellSuggestion | null>(null);
  const [upsellLoading, setUpsellLoading] = useState(false);
  const [upsellDismissed, setUpsellDismissed] = useState(false);
  const [upsellBookingLoading, setUpsellBookingLoading] = useState(false);
  const [upsellBookingSuccess, setUpsellBookingSuccess] = useState(false);
  const [upsellBookingError, setUpsellBookingError] = useState("");
  const [firstAppointmentId, setFirstAppointmentId] = useState("");
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
      fetchAPI("/api/data/blocked-dates")
        .then(r => r.json())
        .then((data: any[]) => setBlockedDates(data.filter(b => b.professionalId === selectedProfessional.id).map(b => b.date)))
        .catch(console.error);
    } else {
      setProfessionalSchedules([]);
      setBlockedDates([]);
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

  const addMinutes = (timeStr: string, minutes: number): string => {
    const [h, m] = timeStr.split(":").map(Number);
    const total = h * 60 + m + minutes;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };

  const handleUpsellBooking = async () => {
    if (!upsellSuggestion || !selectedProfessional) return;
    setUpsellBookingLoading(true);
    setUpsellBookingError("");
    try {
      const discountedPrice = Math.round(upsellSuggestion.service.price * 0.95);
      const res = await fetchAPI("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: clientData,
          appointment: {
            serviceIds: [upsellSuggestion.service.id],
            professionalId: selectedProfessional.id,
            date: upsellSuggestion.date,
            time: upsellSuggestion.time,
            duration: upsellSuggestion.service.duration,
            price: discountedPrice,
            notes: `UPSELL_5PCT - vinculado a turno ${firstAppointmentId}`,
          },
        }),
      });
      if (res.ok) {
        setUpsellBookingSuccess(true);
        setUpsellDismissed(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setUpsellBookingError(data.error || "No se pudo reservar. Intentá de nuevo.");
      }
    } catch {
      setUpsellBookingError("Error de conexión al intentar reservar.");
    } finally {
      setUpsellBookingLoading(false);
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

      if (altDiscountApplied) {
        totalPrice = totalPrice - totalPrice * 0.05;
      }
      if (voucherStatus === "valid" && voucherDiscount) {
        if (voucherDiscount.type === "percent") {
          totalPrice = totalPrice - totalPrice * (voucherDiscount.value / 100);
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
            serviceIds: selectedServices.map(s => s.id),
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
        const data = await res.json().catch(() => ({}));
        setFirstAppointmentId(data.appointmentId || "");
        setUpsellDismissed(false);
        setUpsellBookingSuccess(false);
        setUpsellBookingError("");
        setSuccess(true);

        // Buscar sugerencia con disponibilidad real
        const endTime = addMinutes(selectedTime, totalDuration);
        const bookedCats = encodeURIComponent(selectedServices.map(s => s.category).join(","));
        setUpsellLoading(true);
        fetchAPI(`/api/bookings/upsell-suggestion?date=${selectedDate}&professionalId=${selectedProfessional.id}&endTime=${endTime}&bookedCategories=${bookedCats}`)
          .then(r => r.json())
          .then(d => setUpsellSuggestion(d.suggestion ?? null))
          .catch(() => setUpsellSuggestion(null))
          .finally(() => setUpsellLoading(false));
        return;
      }

      const errData = await res.json().catch(() => ({}));
      setSubmitError(errData.error || "No se pudo confirmar el turno. Intentá de nuevo.");
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
  const blockedDatesSet = new Set(blockedDates);


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
          <div className="flex flex-col items-center justify-center px-6 py-16 min-h-screen">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 border border-primary/30"
            >
              <CheckCircle2 size={36} className="text-primary" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="text-2xl font-serif text-center mb-3 text-foreground"
            >
              ¡Turno Confirmado!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
              className="text-muted-foreground text-center mb-2 max-w-sm text-sm"
            >
              Tu turno quedó registrado, <strong className="text-foreground">{clientData.name}</strong>.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="text-muted-foreground text-center mb-8 max-w-sm text-xs"
            >
              Recibirás un WhatsApp con los detalles.
            </motion.p>

            {/* Confirmación de segundo turno agregado */}
            <AnimatePresence>
              {upsellBookingSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="w-full max-w-sm flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3 mb-4"
                >
                  <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-400">¡Segundo turno reservado!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {upsellSuggestion?.service.name} a las {upsellSuggestion?.time} hs.
                      Te llega un WhatsApp con los detalles.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Card de upsell con disponibilidad real */}
            <AnimatePresence>
              {!upsellDismissed && (upsellLoading || upsellSuggestion) && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.97 }}
                  transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
                  className="w-full max-w-sm rounded-2xl border border-primary/50 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-5 mb-6 relative overflow-hidden"
                >
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-primary/5 rounded-full blur-xl pointer-events-none" />

                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={14} className="text-primary flex-shrink-0" />
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Oferta exclusiva para vos</span>
                      <span className="ml-auto text-[10px] font-black bg-primary text-primary-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Tag size={8} /> 5% OFF
                      </span>
                    </div>

                    {upsellLoading ? (
                      <div className="py-4 flex items-center justify-center gap-2 text-muted-foreground">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                          <Clock size={14} />
                        </motion.div>
                        <span className="text-xs">Buscando turno disponible...</span>
                      </div>
                    ) : upsellSuggestion ? (
                      <>
                        <p className="text-sm text-foreground leading-snug mb-0.5">
                          Al finalizar tu turno, ¿te gustaría hacerte
                        </p>
                        <p className="text-lg font-serif font-semibold text-foreground mb-1">
                          {upsellSuggestion.service.name}
                        </p>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock size={10} /> {upsellSuggestion.service.duration} min
                          </span>
                          <span className="text-xs font-bold text-primary">a las {upsellSuggestion.time} hs</span>
                        </div>
                        {upsellSuggestion.service.price > 0 && (
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-xs text-muted-foreground line-through">${upsellSuggestion.service.price.toLocaleString("es-AR")}</span>
                            <span className="text-base font-bold text-primary">${Math.round(upsellSuggestion.service.price * 0.95).toLocaleString("es-AR")}</span>
                            <span className="text-[10px] text-emerald-400">(-5%)</span>
                          </div>
                        )}
                        {upsellBookingError && (
                          <p className="text-xs text-red-400 mb-3 flex items-center gap-1">
                            <AlertCircle size={11} /> {upsellBookingError}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={handleUpsellBooking}
                            disabled={upsellBookingLoading}
                            className="flex-1 bg-primary text-primary-foreground text-sm font-bold py-3 rounded-xl hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                          >
                            {upsellBookingLoading ? "Reservando..." : "¡Sí, lo agrego!"}
                          </button>
                          <button
                            onClick={() => setUpsellDismissed(true)}
                            disabled={upsellBookingLoading}
                            className="text-sm text-muted-foreground border border-border/50 px-4 py-3 rounded-xl hover:border-primary/30 transition-colors"
                          >
                            No, gracias
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        No hay turnos disponibles para agregar hoy.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={onClose}
              className="bg-secondary text-secondary-foreground font-medium px-8 py-3 rounded-full hover:bg-secondary/80 transition-colors text-sm"
            >
              Cerrar
            </motion.button>
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
                    const isBlocked = blockedDatesSet.has(dateISO);
                    if (!isAllowed || isBlocked) return null;

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
                            onClick={() => setSelectedTime(t)}
                            className={`py-3 rounded-xl text-sm font-medium border transition-all ${
                              selectedTime === t ? "bg-primary border-primary text-primary-foreground" : "bg-transparent border-border/50 hover:border-primary/50 text-foreground"
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
