import { db, app_settings } from "@workspace/db";
import { eq } from "drizzle-orm";

export const DEFAULT_SETTINGS: Record<string, string> = {
  business_name: "Estudio Joha Molinero",
  business_email: "estudiojminterno2@gmail.com",
  business_phone: "",
  business_address: "Bulevar Sarmiento 1089, Río Segundo, Córdoba",
  business_instagram: "@estudiojohamolinero",
  whatsapp_link: "https://wa.link/pga9u0",
  whatsapp_notif: "true",
  birthday_auto: "false",
  reminder_24h: "true",
  reminder_2h: "false",
};

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const [row] = await db.select().from(app_settings).where(eq(app_settings.key, key)).limit(1);
  if (row) return row.value;
  return DEFAULT_SETTINGS[key] ?? fallback;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(app_settings);
  const merged = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    merged[row.key] = row.value;
  }
  return merged;
}

export async function getBoolSetting(key: string): Promise<boolean> {
  const val = await getSetting(key);
  return val === "true";
}

export async function upsertSettings(values: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(values)) {
    const [existing] = await db.select().from(app_settings).where(eq(app_settings.key, key)).limit(1);
    if (existing) {
      await db.update(app_settings).set({ value: String(value) }).where(eq(app_settings.key, key));
    } else {
      await db.insert(app_settings).values({ key, value: String(value) });
    }
  }
}
