import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, GraduationCap, Clock, Users, ChevronRight, X, Edit2, Trash2 } from "lucide-react";
import AdminLayout from "./AdminLayout";

const levelColors: Record<string, string> = {
  Inicial: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  Intermedio: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  Avanzado: "text-violet-400 bg-violet-400/10 border-violet-400/30",
};

const COURSE_COLORS = ["#7c3aed", "#db2777", "#d97706", "#0891b2", "#16a34a"];

interface Course {
  id: number;
  title: string;
  duration: string;
  students: number;
  level: string;
  color: string;
  status: string;
  description: string;
}

const initialCourses: Course[] = [
  { id: 1, title: "Manicuría Completa desde Cero", duration: "6 semanas", students: 0, level: "Inicial", color: "#7c3aed", status: "activo", description: "Aprende técnicas de manicuría, esmaltado semipermanente y construcción de uñas." },
  { id: 2, title: "Diseño y Arte en Uñas", duration: "4 semanas", students: 0, level: "Intermedio", color: "#db2777", status: "activo", description: "Técnicas avanzadas de nail art, degradados, estampado y diseños 3D." },
  { id: 3, title: "Cejas: Laminado y Henna", duration: "2 semanas", students: 0, level: "Inicial", color: "#d97706", status: "proximo", description: "Técnicas de perfilado, henna y laminado de cejas profesional." },
];

function CourseModal({
  course,
  onClose,
  onSave,
  onDelete,
}: {
  course: Course | null; // null = create new
  onClose: () => void;
  onSave: (c: Course) => void;
  onDelete?: (id: number) => void;
}) {
  const isEdit = course !== null;
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [duration, setDuration] = useState(course?.duration ?? "");
  const [level, setLevel] = useState(course?.level ?? "Inicial");
  const [status, setStatus] = useState(course?.status ?? "activo");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!title.trim() || !duration.trim()) { setError("Título y duración son obligatorios"); return; }
    onSave({
      id: course?.id ?? Date.now(),
      title,
      description,
      duration,
      level,
      status,
      students: course?.students ?? 0,
      color: course?.color ?? COURSE_COLORS[Math.floor(Math.random() * COURSE_COLORS.length)],
    });
    onClose();
  };

  const handleDelete = () => {
    if (!course || !onDelete) return;
    if (!confirm(`¿Eliminás el curso "${course.title}"?`)) return;
    onDelete(course.id);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
        className="bg-card border border-border rounded-sm w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{isEdit ? "Editar curso" : "Nuevo curso"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: "Título *", value: title, set: setTitle, placeholder: "Ej: Lifting de Pestañas" },
            { label: "Duración *", value: duration, set: setDuration, placeholder: "Ej: 3 semanas" },
            { label: "Descripción", value: description, set: setDescription, placeholder: "Descripción breve del curso" },
          ].map(f => (
            <div key={f.label}>
              <label className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5">{f.label}</label>
              <input type="text" value={f.value} placeholder={f.placeholder}
                onChange={e => f.set(e.target.value)}
                className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5">Nivel</label>
              <select value={level} onChange={e => setLevel(e.target.value)}
                className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary">
                <option>Inicial</option>
                <option>Intermedio</option>
                <option>Avanzado</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted-foreground block mb-1.5">Estado</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full bg-background border border-border rounded-sm px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary">
                <option value="activo">Activo</option>
                <option value="proximo">Próximo</option>
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
          {isEdit ? (
            <button onClick={handleDelete}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 px-3 py-2 rounded-sm transition-all">
              <Trash2 size={12} /> Eliminar
            </button>
          ) : <div />}
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground px-4 py-2">Cancelar</button>
            <button onClick={handleSave}
              className="bg-primary text-primary-foreground text-xs font-semibold px-5 py-2 rounded-sm hover:bg-primary/90">
              {isEdit ? "Guardar cambios" : "Crear curso"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Cursos() {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [editingCourse, setEditingCourse] = useState<Course | null | undefined>(undefined); // undefined = closed, null = new

  const handleSave = (c: Course) => {
    setCourses(prev => {
      const exists = prev.find(x => x.id === c.id);
      return exists ? prev.map(x => x.id === c.id ? c : x) : [...prev, c];
    });
  };

  const handleDelete = (id: number) => {
    setCourses(prev => prev.filter(x => x.id !== id));
  };

  return (
    <AdminLayout
      title="Cursos"
      subtitle="Educación y capacitación"
      actions={
        <button onClick={() => setEditingCourse(null)}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-sm hover:bg-primary/90 transition-colors">
          <Plus size={13} /> Nuevo curso
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course, i) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card border border-border rounded-sm overflow-hidden hover:border-primary/30 transition-all group relative"
          >
            {/* Color strip */}
            <div className="h-1" style={{ backgroundColor: course.color }} />

            {/* Edit/Delete buttons on hover */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button
                onClick={() => setEditingCourse(course)}
                className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground border border-border/60 bg-card px-2 py-1 rounded-sm hover:text-primary hover:border-primary/40 transition-all"
              >
                <Edit2 size={10} /> Editar
              </button>
            </div>

            <div className="p-5 cursor-pointer" onClick={() => setEditingCourse(course)}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-sm flex items-center justify-center" style={{ backgroundColor: course.color + "15" }}>
                  <GraduationCap size={18} style={{ color: course.color }} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${levelColors[course.level] || levelColors.Inicial}`}>
                    {course.level}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${course.status === "activo" ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-400"}`}>
                    {course.status === "activo" ? "Activo" : "Próximo"}
                  </span>
                </div>
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-2 leading-snug">{course.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">{course.description}</p>
              <div className="flex items-center gap-4 pt-3 border-t border-border/40">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock size={11} /><span className="text-[11px]">{course.duration}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users size={11} /><span className="text-[11px]">{course.students} alumnos</span>
                </div>
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={14} className="text-primary" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Add new card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: courses.length * 0.08 }}
          onClick={() => setEditingCourse(null)}
          className="bg-card border border-dashed border-border/60 rounded-sm p-5 flex flex-col items-center justify-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group min-h-[200px]"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Plus size={16} className="text-primary" />
          </div>
          <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Agregar nuevo curso</p>
        </motion.div>
      </div>

      <AnimatePresence>
        {editingCourse !== undefined && (
          <CourseModal
            course={editingCourse}
            onClose={() => setEditingCourse(undefined)}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
