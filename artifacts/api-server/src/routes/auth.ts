import { Router } from "express";
import { db, professionals } from "@workspace/db";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

// For demo purposes, we can hardcode a secret or use an env variable.
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-joha-key";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }

    // Find user by username
    const allUsers = await db.select().from(professionals);
    const user = allUsers.find(
      u => u.username?.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas. Verificá tu usuario y contraseña." });
    }

    // Return user info (excluding password)
    const { password: _, ...userInfo } = user;
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ success: true, user: userInfo, token });

  } catch (error) {
    console.error("Auth error:", error);
    return res.status(500).json({ error: "Error en el servidor" });
  }
});

export default router;
