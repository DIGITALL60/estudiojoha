/**
 * Utilidades para normalización y comparación de números telefónicos.
 * Soporta formatos de Argentina (código de país 54/549, 0 inicial, prefijo móvil 15, etc.).
 */

export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");

  // Quitar prefijo de país 549 o 54
  if (digits.startsWith("549")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("54")) {
    digits = digits.slice(2);
  }

  // Quitar 0 inicial (prefijo interurbano nacional)
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Quitar prefijo móvil local '15' si está presente en números de 12 dígitos
  // Códigos de área comunes en Argentina: 2 dígitos (11), 3 dígitos (351), 4 dígitos (3572)
  if (digits.length === 12) {
    if (digits.slice(2, 4) === "15") {
      digits = digits.slice(0, 2) + digits.slice(4);
    } else if (digits.slice(3, 5) === "15") {
      digits = digits.slice(0, 3) + digits.slice(5);
    } else if (digits.slice(4, 6) === "15") {
      digits = digits.slice(0, 4) + digits.slice(6);
    }
  } else if (digits.length === 11 && digits.startsWith("15")) {
    digits = digits.slice(2);
  }

  return digits;
}

export function phonesMatch(p1: string | null | undefined, p2: string | null | undefined): boolean {
  const n1 = normalizePhone(p1);
  const n2 = normalizePhone(p2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  // Comparar si coinciden los últimos 8 dígitos (número de abonado/área)
  if (n1.length >= 8 && n2.length >= 8) {
    if (n1.endsWith(n2) || n2.endsWith(n1)) return true;
    if (n1.slice(-8) === n2.slice(-8)) return true;
  }

  return false;
}
