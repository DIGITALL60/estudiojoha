import { Router } from "express";
import { db } from "@workspace/db";
import { vouchers } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

// Validate a voucher
router.post("/validate", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ valid: false, error: "Code is required" });
    }

    const [voucher] = await db.select().from(vouchers).where(eq(vouchers.code, code.toUpperCase()));

    if (!voucher) {
      return res.status(200).json({ valid: false, error: "Cupón inválido o inexistente." });
    }

    if (!voucher.isActive) {
      return res.status(200).json({ valid: false, error: "El cupón ya fue usado o expiró." });
    }

    return res.status(200).json({
      valid: true,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      message: "Cupón aplicado correctamente"
    });
  } catch (error: any) {
    console.error("Error validating voucher:", error);
    return res.status(500).json({ valid: false, error: "Error de servidor al validar cupón" });
  }
});

// Create multiple vouchers (used by Reactivacion / Cumpleaños)
router.post("/bulk-create", async (req, res) => {
  try {
    const { codes, discountType, discountValue } = req.body;
    
    if (!codes || !Array.isArray(codes)) {
      return res.status(400).json({ success: false, error: "Invalid codes array" });
    }

    for (const code of codes) {
      try {
        await db.insert(vouchers).values({
          id: randomUUID(),
          code: code.toUpperCase(),
          discountType,
          discountValue,
          isActive: true,
          createdAt: new Date(),
        }).onConflictDoNothing();
      } catch (e) {
        // Fallback
        const [existing] = await db.select().from(vouchers).where(eq(vouchers.code, code.toUpperCase()));
        if (!existing) {
          await db.insert(vouchers).values({
            id: randomUUID(),
            code: code.toUpperCase(),
            discountType,
            discountValue,
            isActive: true,
            createdAt: new Date(),
          });
        }
      }
    }

    return res.json({ success: true, count: codes.length });
  } catch (error: any) {
    console.error("Error creating vouchers:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
