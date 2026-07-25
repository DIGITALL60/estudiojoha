export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  imageUrl?: string | null;
}

export const DEFAULT_SERVICES: ServiceItem[] = [
  // ── UÑAS - Manicuría, Capping y Softgel ────────────────────────────────────
  { id: "def-u-1", name: "Manicuría Simple (remoción + limado + calcio)", category: "Sector Uñas", duration: 30, price: 17000 },
  { id: "def-u-2", name: "Spa de Manos EXF + Hidratación", category: "Sector Uñas", duration: 15, price: 10000 },
  { id: "def-u-3", name: "Esmalte Semipermanente (Liso) + Nivelación", category: "Sector Uñas", duration: 60, price: 20000 },
  { id: "def-u-4", name: "Esmalte Semipermanente (French) + Nivelación", category: "Sector Uñas", duration: 90, price: 24000 },
  { id: "def-u-5", name: "Esmalte Semipermanente (Full Deco) + Nivelación", category: "Sector Uñas", duration: 90, price: 26000 },
  { id: "def-u-6", name: "Capping Liso (sin esmalte arriba)", category: "Sector Uñas", duration: 60, price: 19000 },
  { id: "def-u-7", name: "Capping + French o Baby Boomer", category: "Sector Uñas", duration: 90, price: 21000 },
  { id: "def-u-8", name: "Softgel (Liso)", category: "Sector Uñas", duration: 90, price: 26000 },
  { id: "def-u-9", name: "Softgel (French)", category: "Sector Uñas", duration: 120, price: 32000 },
  { id: "def-u-10", name: "Softgel Full Deco Compleja (baby boom + polvitos + relieves)", category: "Sector Uñas", duration: 180, price: 38000 },

  // ── PIES ──────────────────────────────────────────────────────────────────
  { id: "def-p-1", name: "Belleza de Pies Básica (sin esmaltado)", category: "Sector Pies", duration: 30, price: 17000 },
  { id: "def-p-2", name: "Belleza de Pies Básica + Esmaltado Semi Liso", category: "Sector Pies", duration: 60, price: 20000 },
  { id: "def-p-3", name: "Belleza de Pies Básica + Esmaltado Semi French", category: "Sector Pies", duration: 60, price: 21000 },
  { id: "def-p-4", name: "Pies Premium (EXF + Cremas + Torno) sin esmaltado", category: "Sector Pies", duration: 60, price: 21000 },
  { id: "def-p-5", name: "Pies Premium + Esmaltado Semi French", category: "Sector Pies", duration: 90, price: 24000 },

  // ── CEJAS Y PESTAÑAS ─────────────────────────────────────────────────────
  { id: "def-c-1", name: "Diseño + Perfilado de Cejas (pinza/bandas)", category: "Cejas y Pestañas", duration: 30, price: 19500 },
  { id: "def-c-2", name: "Diseño + Perfilado de Cejas + Henna", category: "Cejas y Pestañas", duration: 60, price: 25000 },
  { id: "def-c-3", name: "Diseño + Perfilado de Cejas + Laminado", category: "Cejas y Pestañas", duration: 90, price: 26000 },
  { id: "def-c-4", name: "Microblading de Cejas", category: "Cejas y Pestañas", duration: 150, price: 100000 },

  // ── DEPILACIÓN DEFINITIVA ─────────────────────────────────────────────────
  { id: "def-d-1", name: "Cuerpo Completo (Depilación Definitiva)", category: "Depilación Definitiva", duration: 60, price: 45000 },
  { id: "def-d-2", name: "Pierna Entera + Cavado + Axilas", category: "Depilación Definitiva", duration: 45, price: 35000 },
  { id: "def-d-3", name: "Media Pierna + Cavado + Axilas", category: "Depilación Definitiva", duration: 30, price: 28000 },
  { id: "def-d-4", name: "Rostro Completo", category: "Depilación Definitiva", duration: 20, price: 15000 },
];
