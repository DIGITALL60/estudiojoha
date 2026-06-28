import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Lock, User, ChevronRight, AlertCircle } from "lucide-react";
import LogoIcon from "@/components/LogoIcon";
import { fetchAPI } from "@/lib/api";


export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Completá todos los campos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetchAPI("/api/auth/login", {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Credenciales inválidas");
      }

      // Store in local storage to keep session
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      navigate("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background FX */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(270_20%_8%)] via-[hsl(300_10%_6%)] to-[hsl(340_15%_5%)]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-[hsl(300_30%_30%)]/10 blur-[100px] translate-y-1/2 -translate-x-1/3" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <LogoIcon size={80} />
          <h1 className="font-serif text-3xl font-light text-foreground mt-6 mb-2 tracking-wide">
            Panel <em className="not-italic text-primary">Administrativo</em>
          </h1>
          <p className="font-sans text-xs text-muted-foreground tracking-widest uppercase">
            Joha Molinero Beauty Studio
          </p>
        </div>

        <form onSubmit={handleLogin} className="bg-card/50 backdrop-blur-xl border border-border/50 p-8 rounded-sm shadow-2xl">
          <div className="space-y-5">
            {/* Username */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold tracking-widest text-muted-foreground uppercase">Nombre de usuario</label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Ej: admin, guada"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-background border border-border rounded-sm pl-9 pr-4 py-3 text-xs text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase block mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-background/50 border border-border rounded-sm pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-sm px-4 py-3">
                <AlertCircle size={14} />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full group bg-primary text-background font-sans text-xs tracking-[0.3em] uppercase px-6 py-4 hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
            >
              {loading ? "Ingresando..." : "Ingresar"}
              {!loading && <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
