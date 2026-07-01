import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Clock, MapPin, Instagram, ChevronRight, Sparkles, MessageCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import LogoIcon from "@/components/LogoIcon";
import BookingWizard from "@/components/BookingWizard";
import MisTurnosModal from "@/components/MisTurnosModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { fetchAPI } from "@/lib/api";
import {
  fetchPublicInfo,
  instagramHandle,
  whatsappUrl,
  mapsUrl,
  type PublicInfo,
} from "@/lib/publicInfo";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

interface ServiceRow {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface SectorGroup {
  id: string;
  label: string;
  services: ServiceRow[];
}

function groupServices(data: { id: string; name: string; category: string; duration: number; price: number }[]): SectorGroup[] {
  const grouped = data.reduce((acc: Record<string, SectorGroup>, service) => {
    // Saneamiento para corregir problemas de codificación desde la base de datos
    let safeCategory = service.category;
    if (/Cat.*logo Eventos/i.test(safeCategory)) {
      safeCategory = "Catálogo Eventos";
    } else if (/Depilaci.*n Definitiva/i.test(safeCategory)) {
      safeCategory = "Depilación Definitiva";
    }

    if (!acc[safeCategory]) {
      acc[safeCategory] = {
        id: safeCategory.toLowerCase().replace(/\s+/g, "-"),
        label: safeCategory,
        services: [],
      };
    }
    acc[safeCategory].services.push({
      id: service.id,
      name: service.name,
      duration: service.duration,
      price: service.price,
    });
    return acc;
  }, {});
  return Object.values(grouped);
}

export default function Home() {
  const [openSector, setOpenSector] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [showMisTurnos, setShowMisTurnos] = useState(false);
  const [initialServiceId, setInitialServiceId] = useState<string | undefined>();
  const [sectors, setSectors] = useState<SectorGroup[]>([]);
  const [publicInfo, setPublicInfo] = useState<PublicInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchAPI("/api/data/services").then(r => {
        if (!r.ok) throw new Error("services failed");
        return r.json();
      }),
      fetchPublicInfo(),
    ])
      .then(([services, info]) => {
        setSectors(groupServices(services));
        setPublicInfo(info);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const openBooking = useCallback((serviceId?: string) => {
    setInitialServiceId(serviceId);
    setShowBooking(true);
  }, []);

  const closeBooking = useCallback(() => {
    setShowBooking(false);
    setInitialServiceId(undefined);
  }, []);

  const settings = publicInfo?.settings;
  const hours = publicInfo?.hours;
  const businessName = settings?.business_name || "Joha Molinero";
  const address = settings?.business_address || "Río Segundo, Córdoba";
  const igHandle = instagramHandle(settings?.business_instagram || "estudiojohamolinero");
  const waLink = whatsappUrl(settings?.business_phone || "", settings?.whatsapp_link || "");
  const mapLink = mapsUrl(address);
  const categories = sectors.map(s => s.label);

  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden">

      <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-5 bg-background/85 backdrop-blur-md border-b border-border/40">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-3 opacity-90 hover:opacity-100 transition-all duration-300"
          aria-label="Inicio"
        >
          <LogoIcon size={90} />
          <div className="flex flex-col items-center leading-none">
            <span className="font-serif text-base font-light tracking-[0.2em] text-foreground uppercase">
              ESTUDIO JOHA MOLINERO
            </span>
            <span className="font-sans text-[9px] tracking-[0.4em] text-primary uppercase font-medium mt-1 self-center">
              Beauty Studio
            </span>
          </div>
        </button>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => openBooking()}
            data-testid="button-nav-booking"
            className="border border-primary text-primary font-sans text-xs tracking-[0.25em] uppercase px-5 py-2.5 hover:bg-primary hover:text-white transition-all duration-300"
          >
            Reservar
          </button>
        </div>
      </nav>

      <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-background">
          <img 
            src="/hero-premium.jpg" 
            alt="Estudio Joha Molinero" 
            className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity"
          />
          {/* Overlay sutil que funciona en ambos modos */}
          <div className="absolute inset-0 bg-background/50" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/15 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <motion.p
              initial={{ opacity: 0, letterSpacing: "0.2em" }}
              animate={{ opacity: 1, letterSpacing: "0.4em" }}
              transition={{ duration: 1.2, delay: 0.2 }}
              className="text-primary font-sans text-xs uppercase tracking-[0.4em] mb-8"
            >
              {businessName} · Río Segundo, Cba
            </motion.p>

            <h1 className="font-serif font-light text-5xl sm:text-6xl md:text-8xl lg:text-9xl text-foreground leading-[0.9] mb-8">
              Tu mejor{" "}
              <em className="not-italic text-primary">versión</em>
              ,<br />
              cada visita.
            </h1>

            <p className="font-sans font-light text-muted-foreground text-base md:text-lg tracking-wide mb-12 max-w-md mx-auto">
              Reservá tu turno online en segundos. Confirmación por WhatsApp.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <button
                onClick={() => openBooking()}
                data-testid="button-hero-booking"
                className="group bg-primary text-white font-sans text-xs tracking-[0.3em] uppercase px-10 py-4 hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-3"
              >
                Reservar Turno
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => document.getElementById("servicios")?.scrollIntoView({ behavior: "smooth" })}
                data-testid="button-hero-services"
                className="border border-border text-muted-foreground font-sans text-xs tracking-[0.3em] uppercase px-10 py-4 hover:border-primary hover:text-primary transition-all duration-300"
              >
                Ver Servicios
              </button>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-12 bg-gradient-to-b from-primary/60 to-transparent"
          />
        </motion.div>
      </section>

      {categories.length > 0 && (
        <section className="py-12 border-y border-border/40 overflow-hidden bg-card/30 flex">
          <motion.div
            initial={{ x: "0%" }}
            animate={{ x: "-50%" }}
            transition={{
              repeat: Infinity,
              ease: "linear",
              duration: 25, // velocidad del desplazamiento
            }}
            className="flex items-center gap-8 md:gap-12 w-max pr-8 md:pr-12"
          >
            {[...categories, ...categories].map((item, i) => (
              <span key={i} className="font-sans text-xs tracking-[0.3em] text-muted-foreground uppercase flex items-center gap-3">
                <span className="text-primary text-xs">✦</span>
                {item}
              </span>
            ))}
          </motion.div>
        </section>
      )}

      <section id="servicios" className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="mb-16 text-center">
              <p className="font-sans text-xs tracking-[0.4em] text-primary uppercase mb-4">Nuestros Servicios</p>
              <h2 className="font-serif font-light text-5xl md:text-6xl text-foreground">
                Todo lo que necesitás,<br />
                <em className="not-italic text-primary">en un solo lugar.</em>
              </h2>
            </motion.div>

            {loading ? (
              <p className="text-center text-sm text-muted-foreground py-12">Cargando servicios...</p>
            ) : loadError ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-sm text-red-400">No se pudo conectar con el servidor de reservas.</p>
                <p className="text-xs text-muted-foreground">Ejecutá <code className="text-primary">pnpm dev</code> en la carpeta del proyecto (necesita API + web).</p>
              </div>
            ) : sectors.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">Pronto publicaremos nuestros servicios.</p>
            ) : (
              <div className="space-y-0 divide-y divide-border/40">
                {sectors.map((sector) => (
                  <motion.div key={sector.id} variants={fadeUp}>
                    <button
                      data-testid={`button-sector-${sector.id}`}
                      onClick={() => setOpenSector(openSector === sector.id ? null : sector.id)}
                      className="w-full flex items-center justify-between py-7 group text-left"
                    >
                      <div className="flex items-center gap-5">
                        <span className="text-primary text-xs font-sans">✦</span>
                        <span className="font-serif text-2xl md:text-3xl font-light text-foreground group-hover:text-primary transition-colors duration-300">
                          {sector.label}
                        </span>
                        <span className="font-sans text-xs text-muted-foreground tracking-wider hidden sm:inline">
                          {sector.services.length} {sector.services.length === 1 ? "servicio" : "servicios"}
                        </span>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-primary transition-transform duration-300 ${openSector === sector.id ? "rotate-90" : ""}`}
                      />
                    </button>

                    <motion.div
                      initial={false}
                      animate={openSector === sector.id ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pb-8 pl-9 space-y-0 divide-y divide-border/20">
                        {sector.services.map((service) => (
                          <div
                            key={service.id}
                            data-testid={`row-service-${service.id}`}
                            className="flex items-center justify-between py-4 gap-4 group/item"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="font-sans text-sm text-foreground/80 group-hover/item:text-foreground transition-colors block">
                                {service.name}
                              </span>
                              <span className="font-sans text-xs text-muted-foreground tracking-wider mt-1 block">
                                {service.duration} min
                                {service.price > 0 && (
                                  <span className="text-primary ml-2">${service.price.toLocaleString("es-AR")}</span>
                                )}
                              </span>
                            </div>
                            <button
                              onClick={() => openBooking(service.id)}
                              data-testid={`button-book-${service.id}`}
                              className="font-sans text-[10px] tracking-[0.25em] uppercase text-primary border border-primary/30 px-4 py-1.5 hover:bg-primary hover:text-background transition-all duration-200 flex-shrink-0 sm:opacity-0 sm:group-hover/item:opacity-100"
                            >
                              Reservar
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <section className="relative w-full h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden border-y border-border/40">
        {/* Foto de fondo siempre oscura — funciona en modo claro y oscuro */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
          style={{ backgroundImage: "url('/hero-premium.jpg')" }}
        />
        {/* Overlay oscuro permanente para que el texto blanco siempre se lea */}
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/60" />
        
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          className="relative z-10 text-center px-6 max-w-2xl mx-auto"
        >
          <Sparkles className="w-6 h-6 text-primary mx-auto mb-6 opacity-90 drop-shadow-md" />
          <h2 className="font-serif font-light text-4xl md:text-5xl text-white mb-4 drop-shadow-lg">
            Un espacio pensado<br />
            <em className="not-italic text-primary">para vos.</em>
          </h2>
          <p className="font-sans font-light text-white/85 text-sm tracking-wide drop-shadow-md max-w-md mx-auto">
            Relajate y disfrutá de una experiencia premium. Cada detalle de nuestro salón está diseñado para tu confort.
          </p>
        </motion.div>
      </section>

      <section className="py-24 px-6 relative overflow-hidden border-y border-border/40">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-primary/8 blur-[80px]" />
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
          className="relative z-10 max-w-2xl mx-auto text-center"
        >
          <motion.div variants={fadeUp}>
            <Sparkles className="w-6 h-6 text-primary mx-auto mb-6 opacity-70" />
            <h2 className="font-serif font-light text-4xl md:text-5xl text-foreground mb-4">
              ¿Lista para tu próximo turno?
            </h2>
            <p className="font-sans text-sm text-muted-foreground tracking-wide mb-10">
              Elegí servicio, profesional y horario. Te confirmamos por WhatsApp.
            </p>
            <button
              onClick={() => openBooking()}
              data-testid="button-cta-booking"
              className="group bg-primary text-white font-sans text-xs tracking-[0.35em] uppercase px-14 py-5 hover:bg-primary/90 transition-all duration-300 inline-flex items-center gap-3"
            >
              Reservar Ahora
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </motion.div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border/30"
          >
            <motion.a
              variants={fadeUp}
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-background p-10 flex flex-col gap-4 group hover:bg-card transition-colors duration-300"
            >
              <MapPin className="w-5 h-5 text-primary" />
              <h4 className="font-serif text-xl font-light text-foreground">Ubicación</h4>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors">
                {address}
              </p>
            </motion.a>

            <motion.div variants={fadeUp} className="bg-background p-10 flex flex-col gap-4">
              <Clock className="w-5 h-5 text-primary" />
              <h4 className="font-serif text-xl font-light text-foreground">Horarios</h4>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                {hours?.openDaysLabel || "Martes a Sábado"}<br />
                {hours?.hoursLabel || "10:00 — 20:00 hs"}<br />
                {hours?.closedLabel && (
                  <span className="text-primary/70 text-xs">{hours.closedLabel}</span>
                )}
              </p>
            </motion.div>

            <motion.a
              variants={fadeUp}
              href={`https://instagram.com/${igHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-instagram"
              className="bg-background p-10 flex flex-col gap-4 group hover:bg-card transition-colors duration-300"
            >
              <Instagram className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              <h4 className="font-serif text-xl font-light text-foreground">Seguinos</h4>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                Instagram<br />
                <span className="text-primary text-xs group-hover:underline">@{igHandle}</span>
              </p>
            </motion.a>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-14 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <LogoIcon size={64} />

          <div className="flex flex-wrap justify-center gap-8">
            <button
              onClick={() => openBooking()}
              data-testid="button-footer-booking"
              className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors"
            >
              Reservar Online
            </button>
            <button
              onClick={() => setShowMisTurnos(true)}
              className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors"
            >
              Mis Turnos
            </button>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="button-footer-whatsapp"
              className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <MessageCircle size={12} /> WhatsApp
            </a>
          </div>

          <p className="font-sans text-xs text-muted-foreground/50 tracking-widest uppercase text-center">
            © {new Date().getFullYear()} {businessName}
          </p>
        </div>
      </footer>

      <AnimatePresence>
        {showMisTurnos && <MisTurnosModal onClose={() => setShowMisTurnos(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showBooking && (
          <BookingWizard
            onClose={closeBooking}
            initialServiceId={initialServiceId}
            publicInfo={publicInfo}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
