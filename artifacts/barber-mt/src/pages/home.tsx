import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Clock, MapPin, Instagram, ChevronRight, ChevronLeft, Sparkles, MessageCircle, X, ShoppingBag, Package, Pause, Play, MoveHorizontal, Plus, Minus, Check, Copy } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

import { DEFAULT_SERVICES } from "@/lib/defaultServices";

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
  imageUrl?: string | null;
}

interface ShopProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
  imageUrl?: string | null;
}

const DEFAULT_SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: "sample-1",
    name: "Óleo Reparador Capilar",
    category: "Shop",
    price: 18500,
    stock: 12,
    unit: "unidad",
    imageUrl: "https://images.unsplash.com/photo-1608248597359-54d193d259c2?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "sample-2",
    name: "Serum Facial Rejuvenecedor",
    category: "Shop",
    price: 24000,
    stock: 8,
    unit: "unidad",
    imageUrl: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "sample-3",
    name: "Crema Hidratante Manos & Cutículas",
    category: "Shop",
    price: 12500,
    stock: 15,
    unit: "unidad",
    imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "sample-4",
    name: "Shampoo Nutritivo Post-Color",
    category: "Shop",
    price: 19500,
    stock: 10,
    unit: "unidad",
    imageUrl: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80",
  },
];

interface SectorGroup {
  id: string;
  label: string;
  services: ServiceRow[];
}

function groupServices(data: { id: string; name: string; category: string; duration: number; price: number; imageUrl?: string | null }[]): SectorGroup[] {
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
      imageUrl: service.imageUrl,
    });
    return acc;
  }, {});
  return Object.values(grouped);
}

interface OrderProductModalProps {
  product: ShopProduct;
  businessPhone: string;
  onClose: () => void;
}

function OrderProductModal({ product, businessPhone, onClose }: OrderProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);

  // Calcular precio total
  const totalPrice = product.price * quantity;
  const formattedTotal = totalPrice.toLocaleString("es-AR");

  // Construir número de WhatsApp limpio y seguro
  const phone = (() => {
    let raw = (businessPhone || "").replace(/\D/g, "");
    if (raw.length < 10) return "5493572532685";
    if (!raw.startsWith("54")) {
      const trimmed = raw.startsWith("0") ? raw.slice(1) : raw;
      return `549${trimmed}`;
    }
    if (raw.startsWith("54") && !raw.startsWith("549") && raw.length === 12) {
      return `549${raw.slice(2)}`;
    }
    return raw;
  })();

  const messageText = `¡Hola Joha! 💖 Me interesa pedir el producto *${product.name.trim()}*${
    quantity > 1 ? ` (${quantity} unidades - Total: $${formattedTotal})` : ` ($${formattedTotal})`
  } que vi en la boutique del salón. ¿Tienen disponible para retirar?`;

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`;

  const handleOpenWhatsApp = () => {
    window.open(waUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <ShoppingBag size={16} />
            </div>
            <div>
              <h3 className="font-serif text-base font-semibold text-foreground leading-tight">
                Pedir por WhatsApp
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Boutique Oficial · Estudio Joha Molinero
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Cuerpo del modal */}
        <div className="p-6 space-y-5">
          {/* Ficha del producto */}
          <div className="flex gap-4 p-3.5 bg-muted/20 border border-border/60 rounded-xl items-center">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted/40 flex-shrink-0 border border-border/40 flex items-center justify-center">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package size={24} className="text-primary/60" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-primary">
                  {product.category === "Shop" ? "Cuidado Personal" : product.category}
                </span>
                {product.stock > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    En Stock
                  </span>
                ) : (
                  <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Consultar stock
                  </span>
                )}
              </div>
              <h4 className="font-serif text-base font-semibold text-foreground leading-snug truncate">
                {product.name}
              </h4>
              <p className="text-sm font-bold text-primary mt-1">
                ${product.price.toLocaleString("es-AR")}
                <span className="text-xs text-muted-foreground font-normal ml-1">/ unidad</span>
              </p>
            </div>
          </div>

          {/* Selector de cantidad */}
          <div className="flex items-center justify-between bg-card p-3 rounded-xl border border-border/60">
            <span className="text-xs font-medium text-foreground">
              Cantidad a encargar:
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-40 flex items-center justify-center font-bold text-foreground text-sm transition-colors cursor-pointer"
                title="Menos"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center font-bold text-sm text-foreground">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center font-bold text-foreground text-sm transition-colors cursor-pointer"
                title="Más"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Mensaje preparado para WhatsApp */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MessageCircle size={13} className="text-emerald-500" />
              Mensaje preparado para WhatsApp:
            </label>
            <div className="p-3 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-xs text-foreground/90 leading-relaxed font-sans relative">
              <p className="italic">"{messageText}"</p>
              <div className="mt-2 pt-2 border-t border-emerald-500/10 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Total a consultar: <strong className="text-foreground">${formattedTotal}</strong></span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check size={11} className="text-emerald-500" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      <span>Copiar texto</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="p-6 pt-2 pb-6 border-t border-border/40 bg-muted/5 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="flex-1 inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            <MessageCircle size={18} className="fill-white" />
            <span>Pedir por WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center py-3.5 px-5 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
          >
            Seguir viendo
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface ShopRibbonProps {
  products: ShopProduct[];
  businessPhone?: string;
  onOrderProduct: (prod: ShopProduct) => void;
}

function ShopRibbon({ products, onOrderProduct }: ShopRibbonProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const scrollPosRef = useRef(0);
  const isMouseDownRef = useRef(false);
  const isInteractingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Replicar lista para garantizar un carrusel lleno y con loop infinito fluido
  const displayedItems = useMemo(() => {
    if (!products || products.length === 0) return [];
    let base = [...products];
    while (base.length < 8) {
      base = [...base, ...products];
    }
    return [...base, ...base];
  }, [products]);

  // Bucle de auto-scroll suave y continuo con acumulador de punto flotante (nunca se trunca a 0)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || displayedItems.length === 0) return;

    if (scrollPosRef.current === 0 && el.scrollLeft > 0) {
      scrollPosRef.current = el.scrollLeft;
    }

    let animId: number;
    // Velocidad fluida y serena: 0.6px por frame (~36px/segundo)
    const speed = 0.6;

    const tick = () => {
      if (!isUserPaused && !isHovered && !isInteractingRef.current) {
        // Sincronizar si fue movido externamente (scroll nativo de celular o flechas)
        if (Math.abs(el.scrollLeft - scrollPosRef.current) > 4) {
          scrollPosRef.current = el.scrollLeft;
        }

        scrollPosRef.current += speed;
        const halfWidth = el.scrollWidth / 2;

        if (halfWidth > 0) {
          if (scrollPosRef.current >= halfWidth) {
            scrollPosRef.current -= halfWidth;
            el.scrollLeft -= halfWidth;
          } else if (scrollPosRef.current <= 0) {
            scrollPosRef.current += halfWidth;
            el.scrollLeft += halfWidth;
          }
        }

        el.scrollLeft = Math.round(scrollPosRef.current);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isUserPaused, isHovered, displayedItems]);

  // Manejo táctil para celular (Pausa mientras se toca/arrastra, reanuda tras soltar)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    isInteractingRef.current = true;
    hasDraggedRef.current = false;
    const t = e.touches[0];
    startXRef.current = t.clientX;
    startYRef.current = t.clientY;
    startScrollLeftRef.current = scrollRef.current?.scrollLeft || 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const dx = t.clientX - startXRef.current;
    const dy = t.clientY - startYRef.current;
    // Umbral de 12px para distinguir toque intencional de un simple tap
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
      hasDraggedRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    isInteractingRef.current = false;
    // Si hubo arrastre deliberado, congelar unos ms el click para evitar abrir el modal por accidente
    if (hasDraggedRef.current) {
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 120);
    }
    // Reanudar desplazamiento suave después de 1 segundo de inactividad
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      if (scrollRef.current) {
        scrollPosRef.current = scrollRef.current.scrollLeft;
      }
    }, 1000);
  };

  // Manejo de arrastre con mouse para PC / Web
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    isMouseDownRef.current = true;
    isInteractingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    startScrollLeftRef.current = el.scrollLeft;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!isMouseDownRef.current || !el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;
    if (Math.abs(walk) > 8) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = startScrollLeftRef.current - walk;
    scrollPosRef.current = el.scrollLeft;
  };

  const handleMouseUpOrLeave = () => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    isInteractingRef.current = false;
    setIsDragging(false);
    if (scrollRef.current) {
      scrollPosRef.current = scrollRef.current.scrollLeft;
    }
    if (hasDraggedRef.current) {
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 100);
    }
  };

  // Desplazamiento manual por botones de flechas
  const scrollStep = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const step = 320;
    const target = el.scrollLeft + (direction === "right" ? step : -step);
    el.scrollTo({ left: target, behavior: "smooth" });
    setTimeout(() => {
      if (scrollRef.current) {
        scrollPosRef.current = scrollRef.current.scrollLeft;
      }
    }, 350);
  };

  return (
    <div className="relative w-full">
      {/* Barra superior de controles interactivos */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 sm:px-12 max-w-7xl mx-auto mb-6">
        <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground bg-card/60 backdrop-blur-sm border border-border/60 px-3.5 py-1.5 rounded-full">
          <MoveHorizontal size={13} className="text-primary animate-pulse flex-shrink-0" />
          <span>Deslizá para explorar · Tocá cualquier producto para pedirlo</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Pausa / Reanudar explícito */}
          <button
            type="button"
            onClick={() => setIsUserPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-card hover:bg-muted/80 border border-border/80 text-foreground transition-all duration-200 shadow-xs cursor-pointer"
            title={isUserPaused ? "Reanudar movimiento" : "Pausar cinta"}
          >
            {isUserPaused ? (
              <>
                <Play size={12} className="text-primary fill-primary" />
                <span>Reanudar</span>
              </>
            ) : (
              <>
                <Pause size={12} className="text-primary fill-primary" />
                <span>Pausar</span>
              </>
            )}
          </button>

          {/* Flechas de navegación rápida */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollStep("left")}
              className="w-8 h-8 rounded-full bg-card hover:bg-muted border border-border/80 flex items-center justify-center text-foreground hover:text-primary transition-colors shadow-xs cursor-pointer"
              title="Ver anteriores"
              aria-label="Anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollStep("right")}
              className="w-8 h-8 rounded-full bg-card hover:bg-muted border border-border/80 flex items-center justify-center text-foreground hover:text-primary transition-colors shadow-xs cursor-pointer"
              title="Ver siguientes"
              aria-label="Siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Contenedor de la cinta con sombras en los bordes y botones flotantes */}
      <div className="relative w-full group">
        {/* Sombras difuminadas en bordes laterales */}
        <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        {/* Botones de navegación flotantes sobre la cinta en desktop */}
        <button
          type="button"
          onClick={() => scrollStep("left")}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/90 hover:bg-background border border-border/80 shadow-lg items-center justify-center text-foreground hover:text-primary transition-all duration-200 backdrop-blur-md opacity-0 group-hover:opacity-100 cursor-pointer"
          aria-label="Deslizar a la izquierda"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => scrollStep("right")}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-background/90 hover:bg-background border border-border/80 shadow-lg items-center justify-center text-foreground hover:text-primary transition-all duration-200 backdrop-blur-md opacity-0 group-hover:opacity-100 cursor-pointer"
          aria-label="Deslizar a la derecha"
        >
          <ChevronRight size={20} />
        </button>

        {/* Contenedor deslizante interactivo */}
        <div
          ref={scrollRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            handleMouseUpOrLeave();
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`flex gap-5 sm:gap-6 overflow-x-auto scrollbar-none py-4 px-6 sm:px-12 select-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            scrollBehavior: "auto",
          }}
        >
          {displayedItems.map((prod, idx) => (
            <div
              key={`${prod.id}-${idx}`}
              onClick={() => {
                if (!hasDraggedRef.current) {
                  onOrderProduct(prod);
                }
              }}
              className="w-64 sm:w-72 bg-card border border-border/70 hover:border-primary/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group/card flex-shrink-0 cursor-pointer"
            >
              {/* Imagen del producto */}
              <div className="relative w-full h-48 bg-muted/20 overflow-hidden flex items-center justify-center">
                {prod.imageUrl ? (
                  <img
                    src={prod.imageUrl}
                    alt={prod.name}
                    draggable={false}
                    className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500 pointer-events-none select-none"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-accent/5 pointer-events-none select-none">
                    <Package size={40} className="text-primary/60 mb-2" />
                    <span className="text-[10px] tracking-wider uppercase text-muted-foreground/60 font-semibold">
                      Estudio Joha
                    </span>
                  </div>
                )}

                {/* Badge Venta Shop */}
                <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-white/20 pointer-events-none">
                  <Sparkles size={9} className="text-primary" /> Shop
                </span>

                {prod.stock > 0 ? (
                  <span className="absolute top-2.5 right-2.5 bg-emerald-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm pointer-events-none flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    En Stock
                  </span>
                ) : (
                  <span className="absolute top-2.5 right-2.5 bg-zinc-800/80 text-zinc-300 text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider pointer-events-none">
                    Consultar
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-4 flex flex-col flex-1 justify-between bg-card">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-primary font-bold">
                    {prod.category === "Shop" ? "Cuidado Personal" : prod.category}
                  </span>
                  <h3 className="font-serif text-sm font-semibold text-foreground line-clamp-1 mt-0.5 group-hover/card:text-primary transition-colors">
                    {prod.name}
                  </h3>
                </div>

                <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground block">
                      Precio
                    </span>
                    <span className="text-base font-bold text-foreground">
                      ${prod.price.toLocaleString("es-AR")}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasDraggedRef.current) return;
                      onOrderProduct(prod);
                    }}
                    className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary/90 active:scale-95 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                    title={`Pedir ${prod.name} por WhatsApp`}
                  >
                    <MessageCircle size={13} />
                    <span>Pedir</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [openSector, setOpenSector] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [showMisTurnos, setShowMisTurnos] = useState(false);
  const [initialServiceId, setInitialServiceId] = useState<string | undefined>();
  const [selectedServiceImage, setSelectedServiceImage] = useState<string | null>(null);
  const [selectedProductOrder, setSelectedProductOrder] = useState<ShopProduct | null>(null);
  const [sectors, setSectors] = useState<SectorGroup[]>(() => groupServices(DEFAULT_SERVICES));
  const [publicInfo, setPublicInfo] = useState<PublicInfo | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [hidePromoWidget, setHidePromoWidget] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchAPI("/api/data/services")
        .then(async r => {
          if (!r.ok) return DEFAULT_SERVICES;
          const data = await r.json();
          return Array.isArray(data) && data.length > 0 ? data : DEFAULT_SERVICES;
        })
        .catch(() => DEFAULT_SERVICES),
      fetchAPI("/api/data/products")
        .then(async r => {
          if (!r.ok) return [];
          const data = await r.json();
          return Array.isArray(data) ? data : [];
        })
        .catch(() => []),
      fetchPublicInfo(),
    ])
      .then(([services, prods, info]) => {
        const grp = groupServices(services);
        setSectors(grp);
        if (grp.length > 0 && !openSector) {
          setOpenSector(grp[0].id);
        }
        setProducts(prods);
        setPublicInfo(info);
      })
      .catch(() => {
        const grp = groupServices(DEFAULT_SERVICES);
        setSectors(grp);
        if (grp.length > 0 && !openSector) {
          setOpenSector(grp[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (publicInfo?.settings?.carousel_images && publicInfo.settings.carousel_images.length > 1) {
      const interval = setInterval(() => {
        setActiveImageIndex((prev) => (prev + 1) % publicInfo.settings!.carousel_images!.length);
      }, 5000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [publicInfo]);

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

      <nav className="fixed top-0 w-full z-50 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-background/90 backdrop-blur-md border-b border-border/40 shadow-xs">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2 sm:gap-3 opacity-95 hover:opacity-100 transition-all duration-300 text-left"
          aria-label="Inicio"
        >
          <div className="w-8 h-8 sm:w-11 sm:h-11 flex-shrink-0 flex items-center justify-center">
            <LogoIcon size={44} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-serif text-xs sm:text-sm font-semibold tracking-[0.15em] sm:tracking-[0.2em] text-foreground uppercase">
              ESTUDIO JOHA MOLINERO
            </span>
            <span className="font-sans text-[8px] sm:text-[9px] tracking-[0.3em] text-primary uppercase font-medium mt-0.5">
              Beauty Studio
            </span>
          </div>
        </button>
        
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={() => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })}
            className="text-xs font-sans tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors px-2.5 py-1 hidden sm:inline-flex items-center gap-1.5 font-semibold"
          >
            <ShoppingBag size={13} className="text-primary" /> Shop
          </button>
          <ThemeToggle />
          <button
            onClick={() => window.location.href = "/admin"}
            data-testid="button-nav-admin"
            className="border border-primary/50 text-primary font-sans text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-sm hover:bg-primary hover:text-white transition-all duration-300 whitespace-nowrap"
          >
            <span className="hidden sm:inline">Personal autorizado</span>
            <span className="sm:hidden">Acceso</span>
          </button>
        </div>
      </nav>

      <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden pt-24 pb-12 lg:py-0">
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

            <h1 className="font-serif font-light text-4xl sm:text-6xl md:text-8xl lg:text-9xl text-foreground leading-[1.15] mb-8">
              Tu mejor{" "}
              <span className="font-cursive not-italic text-primary font-normal">
                versión
              </span>
              ,<br />
              en cada visita.
            </h1>


            <p className="font-sans font-light text-muted-foreground text-base md:text-lg tracking-wide mb-12 max-w-md mx-auto">
              Reservá tu turno online en segundos. Confirmación por WhatsApp.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
                <button
                  onClick={() => openBooking()}
                  data-testid="button-hero-booking"
                  className="group bg-primary text-white font-sans text-xs tracking-[0.3em] uppercase px-10 py-4 hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-3 w-full sm:w-auto"
                >
                  Reservar Turno
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                {/* Capacitate con nosotras - auto shimmer button */}
                <button
                  onClick={() => window.open("https://instagram.com/" + igHandle, "_blank")}
                  data-testid="button-hero-courses"
                  className="btn-shimmer-auto relative overflow-hidden border border-primary/60 text-primary font-sans text-xs tracking-[0.3em] uppercase px-10 py-4 hover:border-primary hover:text-primary transition-all duration-300 w-full sm:w-auto"
                >
                  Capacitate con nosotras
                </button>
              </div>

              {/* Ver Servicios - with sparkles */}
              <div className="relative inline-flex items-center justify-center mt-2">
                {/* sparkle stars */}
                {[
                  { top: "-8px", left: "6px", delay: "0s", size: 8 },
                  { top: "-4px", right: "4px", delay: "0.4s", size: 6 },
                  { bottom: "-6px", left: "20px", delay: "0.8s", size: 7 },
                  { top: "4px", right: "-8px", delay: "0.2s", size: 5 },
                ].map((s, i) => (
                  <span
                    key={i}
                    className="absolute text-primary/70 animate-ping"
                    style={{
                      top: s.top,
                      left: (s as any).left,
                      right: (s as any).right,
                      bottom: (s as any).bottom,
                      animationDelay: s.delay,
                      animationDuration: "2s",
                      fontSize: s.size + "px",
                    }}
                  >
                    ✦
                  </span>
                ))}
                <button
                  className="font-cursive text-3xl md:text-4xl text-primary/90 hover:text-primary transition-colors transform hover:-rotate-2 hover:scale-105"
                  onClick={() => document.getElementById("servicios")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Ver Servicios
                </button>
              </div>
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

        {/* Floating Promo Widget */}
        {settings?.carousel_images && settings.carousel_images.length > 0 && !hidePromoWidget && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
            className="fixed z-40 bottom-3 right-3 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-background/95 backdrop-blur-sm cursor-pointer hover:scale-[1.02] transition-transform flex flex-col max-w-[260px] sm:max-w-[320px]"
            >
              {/* Close Button X */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setHidePromoWidget(true);
                }}
                className="absolute top-1.5 right-1.5 z-50 bg-black/70 hover:bg-black text-white p-1 rounded-full backdrop-blur-md transition-colors shadow-md"
                title="Cerrar promoción"
              >
                <X size={14} />
              </button>

              <div 
                onClick={() => setSelectedServiceImage(settings.carousel_images![activeImageIndex].url)}
                className="bg-primary text-primary-foreground text-[9px] md:text-[11px] text-center py-1.5 uppercase tracking-widest font-bold w-full pr-7"
              >
                Promociones
              </div>
              
              <div 
                onClick={() => setSelectedServiceImage(settings.carousel_images![activeImageIndex].url)}
                className="relative flex justify-center bg-muted/10 overflow-hidden"
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeImageIndex}
                    src={settings.carousel_images[activeImageIndex].url}
                    alt="Promoción"
                    initial={{ opacity: 0, x: 30, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -30, scale: 0.95 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="w-auto h-auto max-w-[65vw] max-h-[35vh] md:max-w-[340px] md:max-h-[48vh] object-contain"
                  />
                </AnimatePresence>
                
                {settings.carousel_images.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-background/80 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm">
                    {settings.carousel_images.map((_, i) => (
                      <div
                        key={i}
                        className={`transition-all duration-300 rounded-full ${
                          i === activeImageIndex 
                            ? "w-4 h-1.5 bg-primary" 
                            : "w-1.5 h-1.5 bg-primary/40"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
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
            viewport={{ once: true }}
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
                            <div className="flex items-center gap-2 flex-shrink-0 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity">
                              {service.imageUrl && (
                                <button
                                  onClick={() => setSelectedServiceImage(service.imageUrl || null)}
                                  className="font-sans text-[10px] tracking-[0.2em] uppercase text-muted-foreground border border-border px-3 py-1.5 hover:bg-muted hover:text-foreground transition-all duration-200"
                                >
                                  + Info
                                </button>
                              )}
                              <button
                                onClick={() => openBooking(service.id)}
                                data-testid={`button-book-${service.id}`}
                                className="font-sans text-[10px] tracking-[0.25em] uppercase text-primary border border-primary/30 px-4 py-1.5 hover:bg-primary hover:text-background transition-all duration-200"
                              >
                                Reservar
                              </button>
                            </div>
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

      {/* ─── CINTA EN MOVIMIENTO: VENTA SHOP / PRODUCTOS DEL SISTEMA ─── */}
      {(() => {
        // Vinculación directa con los productos de Venta de Shop registrados en el sistema (Stock)
        const systemShopProducts = products.filter(p => {
          const cat = (p.category || "").trim().toLowerCase();
          const isShop = cat === "shop" || cat.includes("shop") || cat.includes("venta");
          const isNotSupply = cat !== "insumos" && !cat.includes("insumo") && !cat.includes("interno");
          return isShop && isNotSupply;
        });

        const displayedShopProducts = systemShopProducts.length > 0 ? systemShopProducts : DEFAULT_SHOP_PRODUCTS;

        return (
          <section id="shop" className="py-20 border-y border-border/40 bg-gradient-to-b from-card/30 via-background to-card/30 overflow-hidden relative">
            <div className="max-w-5xl mx-auto px-6 mb-8 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-3 shadow-xs">
                <ShoppingBag size={12} />
                <span>Boutique de Salón · Cuidado en Casa</span>
              </div>
              <h2 className="font-serif font-light text-3xl sm:text-4xl md:text-5xl text-foreground">
                Productos Exclusivos <em className="not-italic text-primary font-normal">para vos</em>
              </h2>
              <p className="font-sans text-xs sm:text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
                Llevate la calidad profesional a tu hogar. Consultanos o adquirilos directamente en nuestro salón.
              </p>
            </div>

            <ShopRibbon
              products={displayedShopProducts}
              businessPhone={settings?.business_phone || "5493572532685"}
              onOrderProduct={(prod) => setSelectedProductOrder(prod)}
            />
          </section>
        );
      })()}

      <section className="relative w-full min-h-[360px] sm:min-h-[420px] py-16 flex items-center justify-center overflow-hidden border-y border-border/40">
        {/* Foto de fondo optimizada para móviles (sin bug de bg-fixed en iOS) */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat md:bg-fixed"
          style={{ backgroundImage: "url('/hero-premium.jpg')" }}
        />
        {/* Overlay equilibrado para nitidez de la foto y excelente legibilidad */}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-black/50" />
        
        <motion.div 
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          className="relative z-10 text-center px-6 max-w-2xl mx-auto"
        >
          <Sparkles className="w-6 h-6 text-primary mx-auto mb-4 sm:mb-6 opacity-90 drop-shadow-md" />
          <h2 className="font-serif font-light text-3xl sm:text-4xl md:text-5xl text-white mb-3 sm:mb-4 drop-shadow-lg leading-tight">
            Un espacio pensado<br />
            <em className="not-italic text-primary font-normal">para vos.</em>
          </h2>
          <p className="font-sans font-light text-white/90 text-xs sm:text-sm tracking-wide drop-shadow-md max-w-md mx-auto leading-relaxed">
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
              onClick={() => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })}
              className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors"
            >
              Shop Salón
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
              data-testid="button-footer-whatsapp-bot"
              className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <MessageCircle size={12} /> Asistente de Turnos
            </a>
            <a
              href="https://wa.me/5493572532685"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="button-footer-whatsapp-human"
              className="font-sans text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <MessageCircle size={12} /> Hablar con Asesora
            </a>
          </div>

          <p className="font-sans text-xs text-muted-foreground/50 tracking-widest uppercase text-center">
            © {new Date().getFullYear()} {businessName}
          </p>
        </div>
      </footer>

      <AnimatePresence>
        {showMisTurnos && <MisTurnosModal onClose={() => setShowMisTurnos(false)} />}
        {selectedProductOrder && (
          <OrderProductModal
            product={selectedProductOrder}
            businessPhone={settings?.business_phone || "5493572532685"}
            onClose={() => setSelectedProductOrder(null)}
          />
        )}
        {selectedServiceImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedServiceImage(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl bg-card border border-border"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedServiceImage(null)}
                className="absolute top-4 right-4 bg-background/80 hover:bg-background text-foreground p-2 rounded-full backdrop-blur-md transition-colors"
              >
                <X size={20} />
              </button>
              <img src={selectedServiceImage} alt="Servicio info" className="w-full h-auto max-h-[85vh] object-contain" />
            </motion.div>
          </motion.div>
        )}
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
