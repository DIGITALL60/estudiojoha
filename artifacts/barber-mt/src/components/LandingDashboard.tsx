import { motion } from "framer-motion";
import { ChevronRight, Calendar, Star, Sparkles, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import type { PublicInfo } from "@/lib/publicInfo";

export default function LandingDashboard({ publicInfo, onBookClick }: { publicInfo: PublicInfo | null, onBookClick: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const businessName = publicInfo?.settings?.business_name || "Estudio Joha Molinero";

  const slides = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=1000&auto=format&fit=crop", // Uñas aesthetic
      title: "Promos del Mes",
      subtitle: "Renová tus manos con nuestros diseños exclusivos",
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1512496015851-a1c814b74dba?q=80&w=1000&auto=format&fit=crop", // Makeup/Pestañas
      title: "Experiencias Únicas",
      subtitle: "Resaltá tu mirada con lifting y extensiones de pestañas",
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?q=80&w=1000&auto=format&fit=crop", // Skincare/Academia
      title: "Capacítate con nosotras",
      subtitle: "Cursos iniciales y perfeccionamientos. ¡Empezá tu carrera!",
    },
    {
      id: 4,
      image: "https://images.unsplash.com/photo-1556760544-74068565f05c?q=80&w=1000&auto=format&fit=crop", // Productos/Alianzas
      title: "Nuestras Alianzas",
      subtitle: "Trabajamos con las mejores marcas y productos del mercado",
    }
  ];

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans pb-24">
      {/* Header flotante */}
      <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
          <span className="font-serif text-xl font-bold text-white">JM</span>
        </div>
      </div>

      {/* Hero Carousel */}
      <div className="relative h-[65vh] w-full overflow-hidden rounded-b-[2.5rem] shadow-2xl">
        {slides.map((slide, index) => (
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: currentSlide === index ? 1 : 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="absolute inset-0 bg-black/40 z-10" />
            <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 pb-16">
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: currentSlide === index ? 0 : 20, opacity: currentSlide === index ? 1 : 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-4xl font-serif font-bold text-white mb-2 leading-tight"
              >
                {slide.title}
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: currentSlide === index ? 0 : 20, opacity: currentSlide === index ? 1 : 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-white/90 text-sm max-w-[280px]"
              >
                {slide.subtitle}
              </motion.p>
            </div>
          </motion.div>
        ))}

        {/* Carousel indicators */}
        <div className="absolute bottom-6 left-0 right-0 z-30 flex justify-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? "w-6 bg-white" : "w-2 bg-white/50"}`}
            />
          ))}
        </div>
      </div>

      {/* Secciones Rápidas */}
      <div className="px-6 -mt-8 relative z-40">
        <div className="bg-card rounded-2xl p-5 shadow-xl border border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Reservá tu turno</h3>
              <p className="text-[11px] text-muted-foreground">Elegí fecha, hora y profesional</p>
            </div>
          </div>
          <button 
            onClick={onBookClick}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-md hover:scale-105 transition-transform"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Grid de Destacados */}
      <div className="px-6 mt-8 grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-2xl p-4 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
            <Sparkles size={18} />
          </div>
          <h4 className="text-xs font-bold text-foreground mb-1">Experiencias</h4>
          <p className="text-[10px] text-muted-foreground leading-relaxed">Momentos de relax pensados para vos</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-4 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 mb-3">
            <BookOpen size={18} />
          </div>
          <h4 className="text-xs font-bold text-foreground mb-1">Academia</h4>
          <p className="text-[10px] text-muted-foreground leading-relaxed">Capacítate con nuestras masterclasses</p>
        </div>
      </div>

      <div className="mt-auto pt-10 pb-6 text-center">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
          {businessName}
        </p>
      </div>

      {/* FAB (Floating Action Button) Principal */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBookClick}
          className="bg-primary text-primary-foreground font-bold px-8 py-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] shadow-primary/30 flex items-center gap-3"
        >
          <span>Reservar Turno</span>
          <ChevronRight size={18} />
        </motion.button>
      </div>
    </div>
  );
}
