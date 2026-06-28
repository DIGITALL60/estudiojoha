import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Clock, MapPin, Instagram, ChevronRight, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import LogoIcon from "@/components/LogoIcon";
import BookingWizard from "@/components/BookingWizard";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export default function Home() {
  const [openSector, setOpenSector] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [sectors, setSectors] = useState<any[]>([]);
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch("/api/data/services")
      .then(res => res.json())
      .then(data => {
        const grouped = data.reduce((acc: any, service: any) => {
          if (!acc[service.category]) {
            acc[service.category] = {
              id: service.category.toLowerCase().replace(/\s+/g, '-'),
              label: service.category,
              icon: "✦",
              services: []
            };
          }
          acc[service.category].services.push({
            name: service.name,
            duration: `${service.duration} min`,
            cod: service.id
          });
          return acc;
        }, {});
        setSectors(Object.values(grouped));
      })
      .catch(console.error);
  }, []);

  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden">

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-5 bg-background/85 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="opacity-90 hover:opacity-100 hover:scale-105 transition-all duration-300 cursor-pointer"
            title="Acceso administrativo"
            aria-label="Panel de administración"
          >
            <LogoIcon size={56} />
          </button>
          <div className="flex flex-col leading-none">
            <span className="font-serif text-base font-light tracking-[0.2em] text-foreground uppercase">
              Joha Molinero
            </span>
            <span className="font-sans text-[9px] tracking-[0.4em] text-primary uppercase font-medium mt-0.5">
              Beauty Studio
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowBooking(true)}
          data-testid="button-nav-booking"
          className="border border-primary text-primary font-sans text-xs tracking-[0.25em] uppercase px-5 py-2.5 hover:bg-primary hover:text-background transition-all duration-300"
        >
          Reservar
        </button>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
        {/* Gradient backdrop */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(270_20%_8%)] via-[hsl(300_10%_6%)] to-[hsl(340_15%_5%)]" />
          {/* Subtle radial glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[hsl(300_30%_30%)]/10 blur-[100px]" />
          {/* Fine grid */}
          <div
            className="absolute inset-0 opacity-[0.035]"
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
              Joha Molinero Beauty Studio · Río Segundo, Cba
            </motion.p>

            <h1 className="font-serif font-light text-6xl md:text-8xl lg:text-9xl text-foreground leading-[0.9] mb-8">
              Tu mejor{" "}
              <em className="not-italic text-primary">versión</em>
              ,<br />
              cada visita.
            </h1>

            <p className="font-sans font-light text-muted-foreground text-base md:text-lg tracking-wide mb-12 max-w-md mx-auto">
              Reservá tu turno online en segundos. Sin esperas, sin llamadas.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <button
                onClick={() => setShowBooking(true)}
                data-testid="button-hero-booking"
                className="group bg-primary text-background font-sans text-xs tracking-[0.3em] uppercase px-10 py-4 hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-3"
              >
                Reservar Turno
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => {
                  document.getElementById("servicios")?.scrollIntoView({ behavior: "smooth" });
                }}
                data-testid="button-hero-services"
                className="border border-border text-muted-foreground font-sans text-xs tracking-[0.3em] uppercase px-10 py-4 hover:border-primary hover:text-primary transition-all duration-300"
              >
                Ver Servicios
              </button>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
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

      {/* Intro strip */}
      <section className="py-12 border-y border-border/40 overflow-hidden bg-card/30">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex items-center justify-center gap-12 flex-wrap px-6"
        >
          {["Manicuría & Pedicuría", "Cejas & Pestañas", "Tratamientos Faciales", "Láser Diodo", "Cama Solar", "Eventos & Maquillaje"].map((item) => (
            <span key={item} className="font-sans text-xs tracking-[0.3em] text-muted-foreground uppercase flex items-center gap-3">
              <span className="text-primary text-xs">✦</span>
              {item}
            </span>
          ))}
        </motion.div>
      </section>

      {/* Services */}
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

                  {/* Expanded services */}
                  <motion.div
                    initial={false}
                    animate={
                      openSector === sector.id
                        ? { height: "auto", opacity: 1 }
                        : { height: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pb-8 pl-9 space-y-0 divide-y divide-border/20">
                      {sector.services.map((service: any, idx: number) => (
                        <div
                          key={idx}
                          data-testid={`row-service-${service.cod}`}
                          className="flex items-center justify-between py-4 group/item"
                        >
                          <div className="flex items-center gap-6">
                            <span className="font-sans text-sm text-foreground/80 group-hover/item:text-foreground transition-colors">
                              {service.name}
                            </span>
                            <span className="font-sans text-xs text-muted-foreground tracking-wider hidden sm:inline">
                              {service.duration}
                            </span>
                          </div>
                          <button
                            onClick={() => setShowBooking(true)}
                            data-testid={`button-book-${service.cod}`}
                            className="font-sans text-[10px] tracking-[0.25em] uppercase text-primary border border-primary/30 px-4 py-1.5 hover:bg-primary hover:text-background transition-all duration-200 opacity-0 group-hover/item:opacity-100"
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
          </motion.div>
        </div>
      </section>

      {/* CTA Banner */}
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
              Lista para tu próximo turno?
            </h2>
            <p className="font-sans text-sm text-muted-foreground tracking-wide mb-10">
              Reservá en segundos por WhatsApp. Sin esperas, sin llamadas.
            </p>
            <button
              onClick={() => setShowBooking(true)}
              data-testid="button-cta-booking"
              className="group bg-primary text-background font-sans text-xs tracking-[0.35em] uppercase px-14 py-5 hover:bg-primary/90 transition-all duration-300 inline-flex items-center gap-3"
            >
              Reservar Ahora
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Info Cards */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border/30"
          >
            <motion.div variants={fadeUp} className="bg-background p-10 flex flex-col gap-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h4 className="font-serif text-xl font-light text-foreground">Ubicación</h4>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                Río Segundo, Córdoba<br />
                <span className="text-primary/70 text-xs">(Dirección exacta al reservar)</span>
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="bg-background p-10 flex flex-col gap-4">
              <Clock className="w-5 h-5 text-primary" />
              <h4 className="font-serif text-xl font-light text-foreground">Horarios</h4>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                Martes a Sábado<br />
                10:00 — 20:00 hs<br />
                <span className="text-primary/70 text-xs">Dom y Lun: Cerrado</span>
              </p>
            </motion.div>

            <motion.a
              variants={fadeUp}
              href="https://instagram.com/estudiojohamolinero"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-instagram"
              className="bg-background p-10 flex flex-col gap-4 group hover:bg-card transition-colors duration-300"
            >
              <Instagram className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              <h4 className="font-serif text-xl font-light text-foreground">Seguinos</h4>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                Instagram<br />
                <span className="text-primary text-xs group-hover:underline">@estudiojohamolinero</span>
              </p>
            </motion.a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-14 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <LogoIcon size={44} />

          <div className="flex flex-wrap justify-center gap-8">
            <button
              onClick={() => setShowBooking(true)}
              data-testid="button-footer-bot"
              className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors"
            >
              Bot de Reservas
            </button>
            <button
              onClick={() => setShowBooking(true)}
              data-testid="button-footer-atencion"
              className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors"
            >
              Atención al Cliente
            </button>
          </div>

          <p className="font-sans text-xs text-muted-foreground/50 tracking-widest uppercase">
            © {new Date().getFullYear()} Joha Molinero Beauty Studio
          </p>
        </div>
      </footer>
      {/* Booking Wizard Modal */}
      <AnimatePresence>
        {showBooking && <BookingWizard onClose={() => setShowBooking(false)} />}
      </AnimatePresence>
    </div>
  );
}
