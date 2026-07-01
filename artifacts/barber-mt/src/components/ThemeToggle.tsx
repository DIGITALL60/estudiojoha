import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      id="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      className="
        relative flex items-center justify-center
        w-9 h-9 rounded-full
        border border-border/60
        bg-background/60 backdrop-blur-sm
        text-foreground
        hover:bg-primary/10 hover:border-primary/50
        hover:text-primary
        transition-all duration-300
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
      "
    >
      {theme === "dark" ? (
        <Sun size={16} strokeWidth={1.8} className="transition-transform duration-300 rotate-0" />
      ) : (
        <Moon size={16} strokeWidth={1.8} className="transition-transform duration-300 rotate-0" />
      )}
    </button>
  );
}
