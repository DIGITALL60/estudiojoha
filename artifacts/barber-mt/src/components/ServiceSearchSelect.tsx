import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, Check, Tag } from "lucide-react";

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  duration?: number;
}

interface ServiceSearchSelectProps {
  services: ServiceItem[];
  selectedServiceIds: string[];
  onChange: (selectedIds: string[], selectedServices: ServiceItem[]) => void;
  placeholder?: string;
  className?: string;
}

export default function ServiceSearchSelect({
  services,
  selectedServiceIds,
  onChange,
  placeholder = "🔍 Buscar servicios con tildes (podés elegir varios)...",
  className = "",
}: ServiceSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Servicios seleccionados actualmente como objetos completos
  const selectedServices = useMemo(() => {
    return services.filter((s) => selectedServiceIds.includes(s.id));
  }, [services, selectedServiceIds]);

  // Suma total calculada de los servicios seleccionados
  const totalSelectedPrice = useMemo(() => {
    return selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
  }, [selectedServices]);

  // Lista de categorías únicas disponibles con contador
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    services.forEach((s) => {
      const cat = (s.category || "General").trim();
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [services]);

  // Cerrar al tocar o hacer clic afuera (mouse + touch para tablets)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Filtrado por categoría y texto (insensible a tildes/mayúsculas)
  const filteredServices = useMemo(() => {
    const normalize = (str: string) =>
      (str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const q = normalize(searchTerm.trim());

    return services.filter((s) => {
      const sCat = s.category || "General";
      const matchCat =
        selectedCategory === "todas" ||
        normalize(sCat) === normalize(selectedCategory);

      if (!matchCat) return false;
      if (!q) return true;

      const nameMatch = normalize(s.name).includes(q);
      const catMatch = normalize(sCat).includes(q);
      const priceMatch = String(s.price).includes(q);
      return nameMatch || catMatch || priceMatch;
    });
  }, [services, searchTerm, selectedCategory]);

  // Agrupado por categorías
  const groupedServices = useMemo(() => {
    const groups: Record<string, ServiceItem[]> = {};
    filteredServices.forEach((s) => {
      const cat = s.category || "General";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    return groups;
  }, [filteredServices]);

  // Alternar selección de un servicio (agregar o quitar)
  const toggleService = (s: ServiceItem) => {
    let nextIds: string[];
    if (selectedServiceIds.includes(s.id)) {
      nextIds = selectedServiceIds.filter((id) => id !== s.id);
    } else {
      nextIds = [...selectedServiceIds, s.id];
    }
    const nextServices = services.filter((item) => nextIds.includes(item.id));
    onChange(nextIds, nextServices);
  };

  // Quitar un servicio específico desde los chips
  const removeService = (sId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextIds = selectedServiceIds.filter((id) => id !== sId);
    const nextServices = services.filter((item) => nextIds.includes(item.id));
    onChange(nextIds, nextServices);
  };

  // Limpiar todos
  const clearAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([], []);
    setSearchTerm("");
  };

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {/* Campo de búsqueda con Lupita */}
      <div
        className={`relative flex items-center bg-background border rounded-md transition-all ${
          isOpen ? "border-primary ring-1 ring-primary/40 shadow-sm" : "border-border hover:border-primary/50"
        }`}
      >
        <Search
          size={14}
          className={`absolute left-3 transition-colors pointer-events-none ${
            isOpen ? "text-primary" : "text-muted-foreground"
          }`}
        />

        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder={
            selectedServices.length > 0
              ? `Buscar más servicios... (${selectedServices.length} seleccionados)`
              : placeholder
          }
          className="w-full bg-transparent pl-9 pr-16 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        {/* Indicador de cantidad o botón limpiar */}
        <div className="absolute right-2 flex items-center gap-1">
          {selectedServices.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="p-1 text-muted-foreground hover:text-red-400 rounded transition-colors text-[10px]"
              title="Deseleccionar todos"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors"
          >
            {selectedServices.length > 0 ? `${selectedServices.length} sel.` : "Elegir"}
          </button>
        </div>
      </div>

      {/* Chips de servicios seleccionados (con tilde y botón para quitar) */}
      {selectedServices.length > 0 && (
        <div className="bg-muted/30 border border-border/50 rounded-md p-2 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              {selectedServices.length} servicio{selectedServices.length !== 1 ? "s" : ""} seleccionado{selectedServices.length !== 1 ? "s" : ""}:
            </span>
            <span className="font-bold text-emerald-400 font-mono">
              Total: ${totalSelectedPrice.toLocaleString("es-AR")}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {selectedServices.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 bg-background border border-primary/30 text-foreground text-xs px-2 py-1 rounded shadow-xs"
              >
                <Check size={11} className="text-primary flex-shrink-0" />
                <span className="font-medium truncate max-w-[200px]">{s.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  ${s.price.toLocaleString("es-AR")}
                </span>
                <button
                  type="button"
                  onClick={(e) => removeService(s.id, e)}
                  className="text-muted-foreground hover:text-red-400 p-0.5 rounded transition-colors"
                  title="Quitar servicio"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Menú desplegable con Checkboxes (Cajitas con tilde) */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-md shadow-2xl max-h-80 flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          {/* Barra de Categorías */}
          <div className="p-2 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategory("todas")}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                  selectedCategory === "todas"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-background border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                Todas ({services.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                    selectedCategory === cat.name
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-background border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  <Tag size={9} />
                  {cat.name} ({cat.count})
                </button>
              ))}
            </div>
          </div>

          {/* Lista de servicios con Cajita con Tilde (Checkboxes) */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-2.5 scrollbar-thin">
            {filteredServices.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-muted-foreground">
                No se encontró ningún servicio con "{searchTerm}"
                {selectedCategory !== "todas" && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("todas")}
                    className="block mx-auto mt-2 text-[11px] text-primary hover:underline font-medium"
                  >
                    Buscar en todas las categorías
                  </button>
                )}
              </div>
            ) : (
              Object.entries(groupedServices).map(([catName, servList]) => (
                <div key={catName} className="space-y-1">
                  <div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 rounded flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Tag size={10} className="text-primary" /> {catName}
                    </span>
                    <span>{servList.length}</span>
                  </div>

                  {servList.map((s) => {
                    const isChecked = selectedServiceIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleService(s)}
                        className={`w-full text-left px-3 py-2.5 rounded-sm text-xs flex items-center gap-3 transition-colors cursor-pointer select-none ${
                          isChecked
                            ? "bg-primary/15 border border-primary/30"
                            : "hover:bg-accent/40 border border-transparent"
                        }`}
                      >
                        {/* Cajita con tilde (Checkbox visual) */}
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                            isChecked
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "border border-border bg-background"
                          }`}
                        >
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`truncate ${isChecked ? "font-bold text-foreground" : "font-medium text-foreground/90"}`}>
                            {s.name}
                          </p>
                          {s.duration && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              ⏱️ {s.duration} min
                            </p>
                          )}
                        </div>

                        <span className="text-xs font-bold text-foreground font-mono flex-shrink-0">
                          ${s.price.toLocaleString("es-AR")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer del dropdown con resumen y botón Listo */}
          <div className="p-2 border-t border-border bg-muted/30 flex items-center justify-between gap-2">
            <div className="text-[11px] truncate">
              {selectedServices.length > 0 ? (
                <span>
                  <strong className="text-foreground">{selectedServices.length}</strong> tildado{selectedServices.length !== 1 ? "s" : ""} · Total:{" "}
                  <strong className="text-emerald-400 font-mono">${totalSelectedPrice.toLocaleString("es-AR")}</strong>
                </span>
              ) : (
                <span className="text-muted-foreground">Tildá los servicios que se realizó</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-sm hover:bg-primary/90 transition-colors shadow-xs"
            >
              Listo ({selectedServices.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
