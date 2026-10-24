import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday as checkIsToday,
  addDays,
  subDays,
} from "date-fns";
import { es } from "date-fns/locale";

interface CalendarPopoverProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  isOpen: boolean;
  onClose: () => void;
  align?: "left" | "right" | "center";
}

export default function CalendarPopover({
  selectedDate,
  onSelectDate,
  isOpen,
  onClose,
  align = "right",
}: CalendarPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const nativeInputRef = useRef<HTMLInputElement>(null);

  // Parse current selectedDate into a Date object (use midday to avoid timezone shifting)
  const currentDateObj = selectedDate ? new Date(selectedDate + "T12:00:00") : new Date();
  const [viewDate, setViewDate] = useState<Date>(currentDateObj);

  // Sync viewDate when selectedDate changes and popover opens
  useEffect(() => {
    if (isOpen) {
      const d = selectedDate ? new Date(selectedDate + "T12:00:00") : new Date();
      setViewDate(d);
    }
  }, [isOpen, selectedDate]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handlePrevMonth = () => setViewDate(prev => startOfMonth(subMonths(prev, 1)));
  const handleNextMonth = () => setViewDate(prev => startOfMonth(addMonths(prev, 1)));

  const selectDay = (d: Date) => {
    const formatted = format(d, "yyyy-MM-dd");
    onSelectDate(formatted);
    onClose();
  };

  const handleQuickSelect = (d: Date) => {
    selectDay(d);
  };

  const today = new Date();
  const yesterday = subDays(today, 1);
  const tomorrow = addDays(today, 1);

  const yesterdayISO = format(yesterday, "yyyy-MM-dd");
  const todayISO = format(today, "yyyy-MM-dd");
  const tomorrowISO = format(tomorrow, "yyyy-MM-dd");

  const selectedObj = selectedDate ? new Date(selectedDate + "T12:00:00") : null;
  const formattedSelected = selectedObj
    ? format(selectedObj, "EEE d 'de' MMM, yyyy", { locale: es })
    : selectedDate;

  const alignClasses =
    align === "left"
      ? "left-0 origin-top-left"
      : align === "center"
      ? "left-1/2 -translate-x-1/2 origin-top"
      : "right-0 origin-top-right";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop para cerrar al hacer clic afuera y evitar clics indeseados */}
          <div
            className="fixed inset-0 z-40 bg-black/5"
            onClick={onClose}
          />
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full mt-2 z-50 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-card border border-border shadow-2xl rounded-xl p-3 text-foreground ${alignClasses}`}
          >
            {/* Header con Mes y Flechas */}
            <div className="flex items-center justify-between mb-3 px-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors"
                title="Mes anterior"
              >
                <ChevronLeft size={18} />
              </button>

              <span className="text-sm font-bold text-foreground capitalize select-none">
                {format(viewDate, "MMMM yyyy", { locale: es })}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors"
                  title="Mes siguiente"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 rounded-md transition-colors ml-1"
                  title="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Accesos rápidos */}
            <div className="grid grid-cols-3 gap-1.5 mb-3 bg-muted/40 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => handleQuickSelect(yesterday)}
                className={`py-1 text-[11px] rounded transition-colors text-center ${
                  selectedDate === yesterdayISO
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "font-semibold text-muted-foreground hover:text-foreground hover:bg-background"
                }`}
              >
                Ayer
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(today)}
                className={`py-1 text-[11px] rounded transition-colors text-center ${
                  selectedDate === todayISO
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "font-bold text-primary hover:bg-primary/10"
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(tomorrow)}
                className={`py-1 text-[11px] rounded transition-colors text-center ${
                  selectedDate === tomorrowISO
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "font-semibold text-muted-foreground hover:text-foreground hover:bg-background"
                }`}
              >
                Mañana
              </button>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map(d => (
                <span key={d} className="text-[10px] font-bold text-muted-foreground uppercase select-none">
                  {d}
                </span>
              ))}
            </div>

            {/* Matriz de Días */}
            <div className="grid grid-cols-7 gap-1">
              {days.map(d => {
                const dISO = format(d, "yyyy-MM-dd");
                const isSelected = selectedDate === dISO;
                const isCurrentMonth = isSameMonth(d, viewDate);
                const isCurrentDay = checkIsToday(d);

                return (
                  <button
                    key={dISO}
                    type="button"
                    onClick={() => selectDay(d)}
                    className={`h-9 w-full rounded-md text-xs flex items-center justify-center font-medium transition-all relative
                      ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-md scale-105 z-10"
                          : isCurrentMonth
                          ? "hover:bg-accent/40 text-foreground"
                          : "text-muted-foreground/35 hover:text-muted-foreground"
                      }
                      ${isCurrentDay && !isSelected ? "ring-1 ring-primary font-bold text-primary" : ""}
                    `}
                  >
                    {d.getDate()}
                    {isCurrentDay && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selector nativo si desean saltar de año rápidamente */}
            <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
              <span className="text-[10px]">
                Elegido: <strong className="text-foreground capitalize">{formattedSelected}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  const el = nativeInputRef.current;
                  if (!el) return;
                  try {
                    if (typeof (el as any).showPicker === "function") {
                      (el as any).showPicker();
                    } else {
                      el.focus();
                    }
                  } catch {
                    el.focus();
                  }
                }}
                className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 cursor-pointer font-medium hover:underline"
              >
                <CalendarIcon size={12} />
                <span>Selector rápido</span>
                <input
                  ref={nativeInputRef}
                  type="date"
                  value={selectedDate}
                  onChange={e => {
                    if (e.target.value) {
                      onSelectDate(e.target.value);
                      onClose();
                    }
                  }}
                  className="sr-only"
                />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
