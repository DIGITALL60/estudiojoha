import { fetchAPI } from "./api";

export interface BusinessSettings {
  business_name: string;
  business_email: string;
  business_phone: string;
  business_address: string;
  business_instagram: string;
  whatsapp_link: string;
  carousel_images?: { id: string; url: string }[];
}

export interface BusinessHours {
  openDaysLabel: string;
  hoursLabel: string;
  closedLabel: string;
}

export interface PublicInfo {
  settings: BusinessSettings;
  hours: BusinessHours;
}

const DEFAULT_INFO: PublicInfo = {
  settings: {
    business_name: "Estudio Joha Molinero",
    business_email: "",
    business_phone: "",
    business_address: "Río Segundo, Córdoba",
    business_instagram: "@estudiojohamolinero",
    whatsapp_link: "https://wa.link/pga9u0",
  },
  hours: {
    openDaysLabel: "Martes a Sábado",
    hoursLabel: "10:00 — 20:00 hs",
    closedLabel: "Dom y Lun: Cerrado",
  },
};

export async function fetchPublicInfo(): Promise<PublicInfo> {
  try {
    const res = await fetchAPI("/api/data/public-info");
    if (!res.ok) return DEFAULT_INFO;
    return await res.json();
  } catch {
    return DEFAULT_INFO;
  }
}

export function instagramHandle(handle: string): string {
  return handle.replace(/^@/, "");
}

export function whatsappUrl(phone: string, link: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length >= 10) return `https://wa.me/${clean}`;
  return link || DEFAULT_INFO.settings.whatsapp_link;
}

export function mapsUrl(address: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}
