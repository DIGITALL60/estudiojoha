import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Image, Upload, X, Check, Loader2, Plus } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { fetchAPI } from "@/lib/api";

interface CarouselImage {
  id: string;
  url: string;
}

export default function PortadaAdmin() {
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAPI("/api/data/settings")
      .then(res => res.json())
      .then(settings => {
        if (settings.carousel_images) {
          try {
            setImages(JSON.parse(settings.carousel_images));
          } catch (e) {
            console.error("Failed to parse carousel_images", e);
            setImages([]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchAPI("/api/data/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carousel_images: JSON.stringify(images),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert("Las imágenes no deben superar los 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImages(prev => [...prev, { id: crypto.randomUUID(), url: base64 }]);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  if (loading) {
    return (
      <AdminLayout title="Gestor Portada" subtitle="Cargando gestor de imágenes...">
        <div className="py-20 text-center text-sm text-muted-foreground">Cargando...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Gestor de Portada (Carrusel)"
      subtitle="Agrega imágenes de promociones, alianzas y experiencias para la página principal"
      actions={
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-sm transition-all ${
            saved ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"
          } disabled:opacity-60`}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
          {saving ? "Guardando..." : saved ? "Guardado" : "Guardar cambios"}
        </button>
      }
    >
      <div className="bg-card border border-border rounded-sm overflow-hidden p-5 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Imágenes del carrusel</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Las imágenes deben estar preferiblemente en formato horizontal y pesar menos de 5MB.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-primary/10 text-primary rounded-sm hover:bg-primary/20 transition-all"
          >
            <Plus size={14} />
            Agregar imagen
          </button>
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {images.length === 0 ? (
          <div className="py-12 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-3">
              <Image className="text-primary/40" size={24} />
            </div>
            <p className="text-sm font-medium text-foreground">No hay imágenes en la portada</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-xs">
              Agrega tu primera imagen para activar el carrusel en la página principal.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-all"
            >
              <Upload size={14} />
              Subir imagen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={img.id}
                className="relative group aspect-video rounded-sm overflow-hidden border border-border bg-muted/20"
              >
                <img
                  src={img.url}
                  alt="Carrusel"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => removeImage(img.id)}
                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors transform translate-y-2 group-hover:translate-y-0"
                    title="Eliminar imagen"
                  >
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
