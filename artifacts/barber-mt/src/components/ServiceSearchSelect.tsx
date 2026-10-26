import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, Check, Tag, Plus, Minus } from "lucide-react";

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  duration?: number;
}

export interface SelectedServiceItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  category?: string;
  duration?: number;
  professionalId?: string;
}

export interface ProfessionalOption {
  id: string;
  name: string;
}

interface ServiceSearchSelectProps {
  services: ServiceItem[];
  professionals?: ProfessionalOption[];
  defaultProfessionalId?: string;
  selectedServiceIds?: string[];
  selectedServices?: SelectedServiceItem[];
  onChange: (selectedIds: string[], selectedServices: SelectedServiceItem[]) => void;
  placeholder?: string;
  className?: string;
}

export default function ServiceSearchSelect({
  services,
  professionals = [],
  defaultProfessionalId = "",
  selectedServiceIds = [],
  selectedServices: propSelectedServices,
  onChange,
  placeholder = "🔍 Buscar servicios con tildes (podés elegir varios)...",
  className = "",
}: ServiceSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Servicios seleccionados normalizados con cantidad (qty >= 1) y profesional asignado
  const currentSelected = useMemo<SelectedServiceItem[]>(() => {
    if (propSelectedServices && propSelectedServices.length > 0) {
      return propSelectedServices.map(s => ({
        ...s,
        professionalId: s.professionalId || defaultProfessionalId || undefined,
      }));
    }
    // Reconstruir a partir de selectedServiceIds si no se pasó propSelectedServices
    return selectedServiceIds
      .map((id) => {
        const s = services.find((item) => item.id === id);
        if (!s) return null;
        return {
          id: s.id,
          name: s.name,
          price: s.price || 0,
          qty: 1,
          category: s.category,
          duration: s.duration,
          professionalId: defaultProfessionalId || undefined,
        };
      })
      .filter(Boolean) as SelectedServiceItem[];
  }, [propSelectedServices, selectedServiceIds, services, defaultProfessionalId]);

  // Suma total calculada de los servicios seleccionados considerando cantidad (price * qty)
  const totalSelectedPrice = useMemo(() => {
    return currentSelected.reduce((sum, s) => sum + (s.price || 0) * (s.qty || 1), 0);
  }, [currentSelected]);

  const totalSelectedQty = useMemo(() => {
    return currentSelected.reduce((sum, s) => sum + (s.qty || 1), 0);
  }, [currentSelected]);

  // Lista de categorías únicas disponibles con contador
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    services.forEach((s) => {
      const cat = (s.category || "General").trim();
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [services]);

  // Cerrar al tocar o hacer clic afuera (mouse + touch para tablets y celulares)
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
  const handleToggleService = (s: ServiceItem) => {
    const existing = currentSelected.find((item) => item.id === s.id);
    let next: SelectedServiceItem[];
    if (existing) {
      next = currentSelected.filter((item) => item.id !== s.id);
    } else {
      next = [
        ...currentSelected,
        {
          id: s.id,
          name: s.name,
          price: s.price || 0,
          qty: 1,
          category: s.category,
          duration: s.duration,
          professionalId: defaultProfessionalId || undefined,
        },
      ];
    }
    onChange(next.map((i) => i.id), next);
  };

  // Asignar profesional a un servicio específico
  const handleUpdateProfessional = (sId: string, profId: string, e?: React.ChangeEvent<HTMLSelectElement>) => {
    if (e) e.stopPropagation();
    const next = currentSelected.map((item) => {
      if (item.id === sId) {
        return { ...item, professionalId: profId || undefined };
      }
      return item;
    });
    onChange(next.map((i) => i.id), next);
  };

  // Cambiar cantidad (+ o -) de un servicio seleccionado
  const handleUpdateQty = (sId: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = currentSelected
      .map((item) => {
        if (item.id === sId) {
          const newQty = (item.qty || 1) + delta;
          return newQty > 0 ? { ...item, qty: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as SelectedServiceItem[];

    onChange(next.map((i) => i.id), next);
  };

  // Quitar un servicio específico desde los chips
  const handleRemoveService = (sId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = currentSelected.filter((item) => item.id !== sId);
    onChange(next.map((i) => i.id), next);
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
            currentSelected.length > 0
              ? `Buscar más servicios... (${totalSelectedQty} items seleccionados)`
              : placeholder
          }
          className="w-full bg-transparent pl-9 pr-16 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        {/* Indicador de cantidad o botón limpiar */}
        <div className="absolute right-2 flex items-center gap-1">
          {currentSelected.length > 0 && (
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
            {currentSelected.length > 0 ? `${totalSelectedQty} serv.` : "Elegir"}
          </button>
        </div>
      </div>

      {/* Servicios seleccionados con selector individual de profesional para servicios en simultáneo */}
      {currentSelected.length > 0 && (
        <div className="bg-muted/30 border border-border/60 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-border/40">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              {currentSelected.length} servicio{currentSelected.length !== 1 ? "s" : ""} ({totalSelectedQty} unidades en simultáneo):
            </span>
            <span className="font-bold text-emerald-400 font-mono">
              Total: ${totalSelectedPrice.toLocaleString("es-AR")}
            </span>
          </div>

          <div className="space-y-1.5">
            {currentSelected.map((s) => (
              <div
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-background border border-border/80 text-foreground text-xs p-2.5 rounded-lg shadow-2xs hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-foreground block truncate">{s.name}</span>
                    {s.duration && (
                      <span className="text-[10px] text-muted-foreground">⏱️ {s.duration} min</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 flex-shrink-0">
                  {/* Selector individual de Profesional (Servicios en simultáneo) */}
                  {professionals && professionals.length > 0 && (
                    <div
                      className="flex items-center gap-1.5 bg-muted/40 border border-border rounded-md px-2 py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">👩‍🎨</span>
                      <select
                        value={s.professionalId || defaultProfessionalId || ""}
                        onChange={(e) => handleUpdateProfessional(s.id, e.target.value, e)}
                        className="bg-transparent text-foreground text-[11px] font-semibold focus:outline-none cursor-pointer"
                        title="Profesional a cargo de este servicio"
                      >
                        <option value="">-- Asignar profesional --</option>
                        {professionals.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Control de Cantidad (+ y -) */}
                  <div
                    className="flex items-center gap-1 bg-muted/60 border border-border rounded px-1.5 py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => handleUpdateQty(s.id, -1, e)}
                      className="p-0.5 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-colors"
                      title="Restar cantidad"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="text-xs font-bold text-foreground font-mono min-w-[16px] text-center">
                      {s.qty || 1}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleUpdateQty(s.id, 1, e)}
                      className="p-0.5 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-colors"
                      title="Sumar cantidad (ej: 2 soft gel)"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  <span className="text-xs text-emerald-400 font-mono font-bold min-w-[65px] text-right">
                    ${((s.price || 0) * (s.qty || 1)).toLocaleString("es-AR")}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleRemoveService(s.id, e)}
                    className="text-muted-foreground hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                    title="Quitar servicio"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menú desplegable con Checkboxes y controles de cantidad */}
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

          {/* Lista de servicios con Cajita con Tilde y selector de cantidad */}
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
                    const selectedItem = currentSelected.find((item) => item.id === s.id);
                    const isChecked = !!selectedItem;

                    return (
                      <div
                        key={s.id}
                        onClick={() => handleToggleService(s)}
                        className={`w-full text-left px-3 py-2 rounded-sm text-xs flex items-center justify-between gap-3 transition-colors cursor-pointer select-none ${
                          isChecked
                            ? "bg-primary/15 border border-primary/30"
                            : "hover:bg-accent/40 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
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
                            <p
                              className={`truncate ${
                                isChecked ? "font-bold text-foreground" : "font-medium text-foreground/90"
                              }`}
                            >
                              {s.name}
                            </p>
                            {s.duration && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                ⏱️ {s.duration} min
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Controles de cantidad en la fila */}
                        {isChecked ? (
                          <div
                            className="flex items-center gap-2 flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1 bg-background border border-primary/40 rounded px-1 py-0.5">
                              <button
                                type="button"
                                onClick={(e) => handleUpdateQty(s.id, -1, e)}
                                className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                                title="Restar cantidad"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="text-[11px] font-bold text-primary font-mono min-w-[14px] text-center">
                                {selectedItem.qty || 1}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleUpdateQty(s.id, 1, e)}
                                className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                                title="Sumar cantidad"
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                            <span className="text-xs font-bold text-emerald-400 font-mono min-w-[65px] text-right">
                              ${((s.price || 0) * (selectedItem.qty || 1)).toLocaleString("es-AR")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-foreground font-mono flex-shrink-0">
                            ${(s.price || 0).toLocaleString("es-AR")}
                          </span>
                        )}
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
              {currentSelected.length > 0 ? (
                <span>
                  <strong className="text-foreground">{totalSelectedQty}</strong> seleccionados · Total:{" "}
                  <strong className="text-emerald-400 font-mono">
                    ${totalSelectedPrice.toLocaleString("es-AR")}
                  </strong>
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
              Listo ({totalSelectedQty})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
