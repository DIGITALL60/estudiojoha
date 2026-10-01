import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, Check } from "lucide-react";

export interface ClientItem {
  id: string;
  name: string;
  phone?: string;
}

interface ClientSearchSelectProps {
  clients: ClientItem[];
  value: string;
  onChange: (clientId: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ClientSearchSelect({
  clients,
  value,
  onChange,
  placeholder = "Buscar cliente por nombre o teléfono...",
  className = "",
}: ClientSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cliente actualmente seleccionado
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === value) || null;
  }, [clients, value]);

  // Sincronizar texto cuando se selecciona un cliente externamente o se cierra
  useEffect(() => {
    if (selectedClient && !isOpen) {
      setSearchTerm(selectedClient.name);
    } else if (!selectedClient && !isOpen) {
      setSearchTerm("");
    }
  }, [selectedClient, isOpen]);

  // Cerrar al hacer clic o tap afuera (soporte mouse y touch para tablets)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (selectedClient) {
          setSearchTerm(selectedClient.name);
        } else {
          setSearchTerm("");
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [selectedClient]);

  // Filtrado en tiempo real sin importar acentos, mayúsculas o formatos de teléfono
  const filteredClients = useMemo(() => {
    const normalize = (str: string) =>
      (str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const q = normalize(searchTerm.trim());
    if (!q) return clients;

    const qDigits = q.replace(/\D/g, "");

    return clients.filter((c) => {
      const nameMatch = normalize(c.name).includes(q);
      const phoneDigits = (c.phone || "").replace(/\D/g, "");
      const phoneMatch = qDigits.length >= 2 && phoneDigits.includes(qDigits);
      return nameMatch || phoneMatch;
    });
  }, [clients, searchTerm]);

  const handleSelect = (client: ClientItem) => {
    onChange(client.id);
    setSearchTerm(client.name);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchTerm("");
    setIsOpen(true);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`relative flex items-center bg-background border rounded-md transition-all ${
          isOpen ? "border-primary ring-1 ring-primary/40 shadow-sm" : "border-border hover:border-primary/50"
        }`}
      >
        {/* Lupita de búsqueda */}
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
          onFocus={() => {
            setIsOpen(true);
            inputRef.current?.select();
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
            if (value && e.target.value !== selectedClient?.name) {
              onChange("");
            }
          }}
          placeholder={selectedClient ? selectedClient.name : placeholder}
          className="w-full bg-transparent pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        {/* Botón de limpiar selección */}
        {(searchTerm || selectedClient) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
            title="Limpiar cliente"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Menú desplegable filtrable con Lupita */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-md shadow-2xl max-h-60 overflow-y-auto scrollbar-thin animate-in fade-in-50 zoom-in-95 duration-100">
          {filteredClients.length === 0 ? (
            <div className="py-4 px-3 text-center text-xs text-muted-foreground">
              No se encontró ningún cliente con "{searchTerm}"
            </div>
          ) : (
            <div className="p-1 space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border-b border-border/40 flex justify-between items-center">
                <span>Clientes ({filteredClients.length})</span>
                {searchTerm && <span className="text-primary font-bold">Filtrados</span>}
              </div>
              {filteredClients.slice(0, 60).map((c) => {
                const isSelected = c.id === value;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className={`w-full text-left px-3 py-2 rounded-sm text-xs flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? "bg-primary/15 text-primary font-semibold"
                        : "hover:bg-accent/40 text-foreground"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.name}</p>
                      {c.phone && (
                        <p className="text-[10px] text-muted-foreground truncate font-mono">
                          {c.phone}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={14} className="text-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
              {filteredClients.length > 60 && (
                <div className="p-2 text-center text-[10px] text-muted-foreground italic">
                  Escribí en la lupita para filtrar entre los {filteredClients.length} clientes...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
