import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, Check, Package, Plus, Minus, Tag, AlertTriangle } from "lucide-react";

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  price: number;
}

export interface SelectedProductItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  category?: string;
  stock?: number;
}

interface ProductSearchSelectProps {
  products: ProductItem[];
  selectedProducts: SelectedProductItem[];
  onChange: (products: SelectedProductItem[]) => void;
  placeholder?: string;
  className?: string;
}

export default function ProductSearchSelect({
  products,
  selectedProducts,
  onChange,
  placeholder = "🔍 Buscar productos de venta shop...",
  className = "",
}: ProductSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtrar terminantemente para excluir productos de uso interno / insumos
  const shopOnlyProducts = useMemo(() => {
    return products.filter((p) => {
      const cat = (p.category || "").trim().toLowerCase();
      if (cat === "insumos" || cat.includes("insumo") || cat.includes("interno") || cat.includes("uso interno")) {
        return false;
      }
      return true;
    });
  }, [products]);

  // Lista de categorías únicas con contador dentro de los productos de Venta Shop
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    shopOnlyProducts.forEach((p) => {
      const cat = (p.category || "Shop").trim();
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [shopOnlyProducts]);

  // Suma total de los productos seleccionados
  const totalSelectedPrice = useMemo(() => {
    return selectedProducts.reduce((sum, p) => sum + p.price * p.qty, 0);
  }, [selectedProducts]);

  const totalSelectedQty = useMemo(() => {
    return selectedProducts.reduce((sum, p) => sum + p.qty, 0);
  }, [selectedProducts]);

  // Cerrar al tocar o hacer clic afuera
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

  // Filtrado de productos por categoría y término de búsqueda (solo Venta Shop)
  const filteredProducts = useMemo(() => {
    const normalize = (str: string) =>
      (str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const q = normalize(searchTerm.trim());

    return shopOnlyProducts.filter((p) => {
      const pCat = p.category || "Shop";
      let matchCat = true;

      if (selectedCategory !== "todas") {
        matchCat = normalize(pCat) === normalize(selectedCategory);
      }

      if (!matchCat) return false;
      if (!q) return true;

      const nameMatch = normalize(p.name).includes(q);
      const catMatch = normalize(pCat).includes(q);
      const priceMatch = String(p.price).includes(q);
      return nameMatch || catMatch || priceMatch;
    });
  }, [shopOnlyProducts, searchTerm, selectedCategory]);

  // Alternar selección de un producto
  const handleToggleProduct = (p: ProductItem) => {
    const existing = selectedProducts.find((item) => item.id === p.id);
    if (existing) {
      onChange(selectedProducts.filter((item) => item.id !== p.id));
    } else {
      onChange([
        ...selectedProducts,
        {
          id: p.id,
          name: p.name,
          price: p.price || 0,
          qty: 1,
          category: p.category,
          stock: p.stock,
        },
      ]);
    }
  };

  // Cambiar cantidad
  const handleUpdateQty = (pId: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = selectedProducts
      .map((item) => {
        if (item.id === pId) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as SelectedProductItem[];
    onChange(next);
  };

  // Quitar producto
  const handleRemoveProduct = (pId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange(selectedProducts.filter((item) => item.id !== pId));
  };

  // Limpiar todos
  const handleClearAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([]);
    setSearchTerm("");
  };

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {/* Campo de búsqueda con Lupita */}
      <div
        className={`relative flex items-center bg-background border rounded-md transition-all ${
          isOpen ? "border-emerald-500 ring-1 ring-emerald-500/40 shadow-sm" : "border-border hover:border-emerald-500/50"
        }`}
      >
        <Search
          size={14}
          className={`absolute left-3 transition-colors pointer-events-none ${
            isOpen ? "text-emerald-500" : "text-muted-foreground"
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
            selectedProducts.length > 0
              ? `Buscar más productos shop... (${totalSelectedQty} seleccionados)`
              : placeholder
          }
          className="w-full bg-transparent pl-9 pr-24 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
        />

        {/* Indicador de cantidad / Total y botón limpiar */}
        <div className="absolute right-2 flex items-center gap-1.5">
          {selectedProducts.length > 0 && (
            <>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                ${totalSelectedPrice.toLocaleString("es-AR")}
              </span>
              <button
                type="button"
                onClick={handleClearAll}
                className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
                title="Quitar todos los productos seleccionados"
              >
                <X size={13} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded transition-colors"
          >
            {isOpen ? "Cerrar ▲" : "Elegir ▼"}
          </button>
        </div>
      </div>

      {/* Chips de productos seleccionados */}
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded-md">
          <div className="w-full flex items-center justify-between pb-1 mb-1 border-b border-emerald-500/15 text-[11px]">
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <Package size={12} /> {selectedProducts.length} producto{selectedProducts.length > 1 ? "s" : ""} a vender:
            </span>
            <span className="font-bold text-foreground">
              Total Shop: ${totalSelectedPrice.toLocaleString("es-AR")}
            </span>
          </div>

          {selectedProducts.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1.5 bg-background border border-emerald-500/40 text-foreground text-xs px-2 py-1 rounded-md shadow-sm"
            >
              <span className="font-medium text-xs">{p.name}</span>
              <span className="text-emerald-400 font-bold">${(p.price * p.qty).toLocaleString("es-AR")}</span>

              {/* Botones de cantidad rápida */}
              <div className="flex items-center bg-muted/50 rounded border border-border ml-1">
                <button
                  type="button"
                  onClick={(e) => handleUpdateQty(p.id, -1, e)}
                  className="px-1 py-0.5 text-muted-foreground hover:text-foreground text-[10px]"
                  title="Restar 1"
                >
                  <Minus size={10} />
                </button>
                <span className="px-1.5 text-[11px] font-bold text-foreground select-none">{p.qty}</span>
                <button
                  type="button"
                  onClick={(e) => handleUpdateQty(p.id, 1, e)}
                  className="px-1 py-0.5 text-muted-foreground hover:text-foreground text-[10px]"
                  title="Sumar 1"
                >
                  <Plus size={10} />
                </button>
              </div>

              <button
                type="button"
                onClick={(e) => handleRemoveProduct(p.id, e)}
                className="text-muted-foreground hover:text-red-400 p-0.5 transition-colors ml-0.5"
                title="Quitar"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Menú desplegable con Categorías de productos y lista con tildes */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border shadow-2xl rounded-lg overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Píldoras de Categorías de Productos (Solo Venta Shop) */}
          <div className="p-2 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1 flex-shrink-0">
                <Tag size={10} /> Categoría:
              </span>

              <button
                type="button"
                onClick={() => setSelectedCategory("todas")}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedCategory === "todas"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-background border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>🛍️ Todos Venta Shop</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${selectedCategory === "todas" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {shopOnlyProducts.length}
                </span>
              </button>

              {categories.length > 1 &&
                categories
                  .filter((c) => c.name.toLowerCase() !== "shop" && c.name.toLowerCase() !== "general")
                  .map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${
                        selectedCategory === cat.name
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-background border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className={`text-[9px] px-1 rounded-full ${selectedCategory === cat.name ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                        {cat.count}
                      </span>
                    </button>
                  ))}
            </div>
          </div>

          {/* Lista de productos con casillas de tildes */}
          <div className="max-h-64 overflow-y-auto divide-y divide-border/20 p-1">
            {filteredProducts.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-xs space-y-1">
                <p>No se encontraron productos para venta.</p>
                <p className="text-[10px] text-muted-foreground/70">
                  Podés cargar productos en <strong>Stock &gt; Productos (Venta Shop)</strong>.
                </p>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const selectedItem = selectedProducts.find((item) => item.id === p.id);
                const isSelected = !!selectedItem;
                const isOutOfStock = p.stock <= 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleToggleProduct(p)}
                    className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-emerald-500/10 border border-emerald-500/30"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Casilla de tilde [✓] */}
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${
                          isSelected
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-border bg-background"
                        }`}
                      >
                        {isSelected && <Check size={13} strokeWidth={3} />}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="capitalize">{p.category || "Shop"}</span>
                          <span>·</span>
                          <span
                            className={`flex items-center gap-0.5 ${
                              isOutOfStock ? "text-amber-400 font-semibold" : "text-muted-foreground"
                            }`}
                          >
                            {isOutOfStock ? (
                              <>
                                <AlertTriangle size={10} /> Sin stock
                              </>
                            ) : (
                              <>📦 Stock: {p.stock} {p.unit || "unid"}</>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-2 flex-shrink-0">
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        ${p.price.toLocaleString("es-AR")}
                      </span>

                      {isSelected && (
                        <div
                          className="flex items-center bg-background border border-emerald-500/40 rounded shadow-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleUpdateQty(p.id, -1, e)}
                            className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground text-[10px]"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="px-1.5 text-xs font-bold text-foreground">
                            {selectedItem.qty}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleUpdateQty(p.id, 1, e)}
                            className="px-1.5 py-0.5 text-muted-foreground hover:text-foreground text-[10px]"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer del desplegable */}
          <div className="p-2 border-t border-border/50 bg-muted/20 flex items-center justify-between text-xs">
            <span className="text-[11px] text-muted-foreground">
              {totalSelectedQty > 0 ? (
                <span>
                  <strong className="text-foreground">{totalSelectedQty}</strong> producto{totalSelectedQty > 1 ? "s" : ""} seleccionado{totalSelectedQty > 1 ? "s" : ""}
                </span>
              ) : (
                "Tildá los productos a vender"
              )}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-emerald-500 text-white font-semibold text-[11px] px-3 py-1 rounded transition-colors hover:bg-emerald-600"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
