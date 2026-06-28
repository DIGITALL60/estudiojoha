import { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw, Download, Calendar, Instagram, MessageCircle, Heart, Star, Sparkles } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { fetchAPI } from "@/lib/api";
import { toPng } from 'html-to-image';

interface Professional { id: string; name: string; role: string; color: string; initial: string; }
interface Appointment { id: string; date: string; time: string; professionalId: string; status: string; }
interface Schedule { professionalId: string; dayOfWeek: number; startTime: string; endTime: string; }
interface Service { id: string; name: string; duration: number; price: number; }

const SLOT_DURATION = 30;
const DAY_NAMES_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function addDays(date: Date, n: number) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function toYMD(d: Date) { return d.toISOString().split("T")[0]; }
function getSlots(startTime: string, endTime: string): string[] {
  const slots: string[] = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let cur = sh * 60 + sm;
  const end = eh * 60 + em;
  while (cur < end) {
    const h = Math.floor(cur / 60).toString().padStart(2, "0");
    const m = (cur % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    cur += SLOT_DURATION;
  }
  return slots;
}

export default function Historias() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [range, setRange] = useState<"today" | "7" | "14">("7");
  const [selectedProfId, setSelectedProfId] = useState("all");

  // Configurable fields
  const [serviceName, setServiceName] = useState("KAPPING GEL");
  const [profDisplayName, setProfDisplayName] = useState("JOHA MOLINERO");

  const storyRef = useRef<HTMLDivElement>(null);

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
  const isAdmin = currentUser?.role?.toLowerCase() === "admin";

  useEffect(() => {
    Promise.all([
      fetchAPI("/api/data/professionals").then(r => r.json()),
      fetchAPI("/api/data/appointments").then(r => r.json()),
      fetchAPI("/api/data/schedules").then(r => r.json()),
      fetchAPI("/api/data/services").then(r => r.json()),
    ]).then(([profs, apps, scheds, servs]) => {
      setProfessionals(profs);
      setAppointments(apps);
      setSchedules(scheds);
      setServices(servs || []);
      if (!isAdmin) {
        const me = profs.find((p: Professional) => p.name === currentUser?.name || p.id === currentUser?.id);
        if (me) { setSelectedProfId(me.id); setProfDisplayName(me.name.toUpperCase()); }
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const days = range === "today" ? 0 : range === "7" ? 6 : 13;
  const dateRange: Date[] = [];
  for (let i = 0; i <= days; i++) dateRange.push(addDays(today, i));

  interface DaySlots { date: Date; slots: string[]; }
  const freeSlotsPerDay: DaySlots[] = dateRange.map(date => {
    const ymd = toYMD(date);
    const dow = date.getDay();
    const profsToCheck = selectedProfId === "all" ? professionals : professionals.filter(p => p.id === selectedProfId);
    const allSlots = new Set<string>();
    const bookedSlots = new Set<string>();
    profsToCheck.forEach(prof => {
      schedules.filter(s => s.professionalId === prof.id && s.dayOfWeek === dow)
        .forEach(sched => getSlots(sched.startTime, sched.endTime).forEach(slot => allSlots.add(slot)));
      appointments.filter(a => a.date === ymd && a.professionalId === prof.id && a.status !== "cancelado")
        .forEach(a => bookedSlots.add(a.time.substring(0, 5)));
    });
    return { date, slots: [...allSlots].filter(s => !bookedSlots.has(s)).sort() };
  }).filter(d => d.slots.length > 0);

  const handleDownload = useCallback(() => {
    if (storyRef.current === null) return;
    setGenerating(true);

    toPng(storyRef.current, { 
      cacheBust: true, 
      width: 1080,
      height: 1920,
      pixelRatio: 1 // Keep size exactly 1080x1920
    })
    .then((dataUrl) => {
      const link = document.createElement('a');
      link.download = `historia_turnos_${toYMD(today)}.png`;
      link.href = dataUrl;
      link.click();
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      setGenerating(false);
    });
  }, [storyRef, today]);

  const totalSlots = freeSlotsPerDay.reduce((s, d) => s + d.slots.length, 0);

  // Take only the first day for this design (as the design is usually for 1 specific day)
  const firstDay = freeSlotsPerDay[0] || { date: new Date(), slots: [] };
  const dayName = DAY_NAMES_FULL[firstDay.date.getDay()].toUpperCase();
  const dayNumber = firstDay.date.getDate();

  return (
    <AdminLayout title="Historias de turnos libres" subtitle="Generá una imagen lista para subir como historia de Instagram">
      <div className="flex flex-col lg:flex-row gap-6 pb-20">
        {/* LEFT CONTROLS */}
        <div className="flex-1 space-y-4 min-w-0 max-w-md">
          {/* Professional filter */}
          <div className="bg-card border border-border/50 rounded-xl p-5">
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-3">Profesional (filtro de agenda)</span>
            <select value={selectedProfId} onChange={e => setSelectedProfId(e.target.value)} disabled={!isAdmin}
              className="w-full bg-background border border-border/50 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:border-primary disabled:opacity-60">
              {isAdmin && <option value="all">Todos los profesionales</option>}
              {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="bg-card border border-border/50 rounded-xl p-5">
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block mb-3">Día a generar (Para este diseño)</span>
            <div className="text-sm font-medium">
              Viendo: {dayName} {dayNumber}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Este diseño muestra 1 solo día a la vez. Si seleccionás más fechas, solo se renderizará el primer día libre.
            </p>
          </div>

          {/* Story fields */}
          <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground block">Datos de la historia</span>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[9px] uppercase tracking-widest text-muted-foreground block mb-1.5">✦ Servicio (en imagen)</label>
                <select value={serviceName} onChange={e => setServiceName(e.target.value)}
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary font-medium">
                  <option value="KAPPING GEL">KAPPING GEL</option>
                  {services.map(s => (
                    <option key={s.id} value={s.name.toUpperCase()}>{s.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-widest text-muted-foreground block mb-1.5">✦ Profesional (en imagen)</label>
                <select value={profDisplayName} onChange={e => setProfDisplayName(e.target.value)}
                  className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary font-medium">
                  <option value="JOHA MOLINERO">JOHA MOLINERO</option>
                  {professionals.map(p => (
                    <option key={p.id} value={p.name.toUpperCase()}>{p.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={handleDownload} disabled={generating || freeSlotsPerDay.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-[#b5506a] text-white text-sm font-bold px-5 py-4 rounded-xl hover:bg-[#9c4258] transition-colors disabled:opacity-60">
              <Download size={18} />
              {generating ? "Generando PNG..." : "Descargar historia (PNG)"}
            </button>
          </div>
        </div>

        {/* RIGHT: PREVIEW (HTML TO CANVAS TARGET) */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0" style={{ width: '400px' }}>
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Vista previa (Escalada para web)</span>
          
          <div className="w-full rounded-2xl overflow-hidden shadow-2xl relative border border-border/30 bg-black">
            {/* 
              This inner container is strictly 1080x1920. 
              We use CSS transform to scale it down so it fits on screen, but html-to-image reads the full size.
            */}
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '1080px',
                height: '1920px',
                transform: 'scale(0.37037)', // 400 / 1080
                transformOrigin: 'top left',
              }}
            >
              <div 
                ref={storyRef}
                style={{
                  width: '1080px',
                  height: '1920px',
                  background: 'radial-gradient(circle at 10% 20%, #ffebf0 0%, #fff 40%, #fae1e6 100%)',
                  position: 'relative',
                  overflow: 'hidden',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
                className="flex flex-col items-center py-20 px-[60px]"
              >
                {/* Abstract pink blobs for background */}
                <div className="absolute -top-[10%] -left-[20%] w-[800px] h-[800px] bg-[#fbcfe8] rounded-full mix-blend-multiply filter blur-[100px] opacity-70"></div>
                <div className="absolute top-[40%] -right-[20%] w-[900px] h-[900px] bg-[#fecdd3] rounded-full mix-blend-multiply filter blur-[120px] opacity-60"></div>
                <div className="absolute -bottom-[10%] left-[10%] w-[800px] h-[800px] bg-[#fce7f3] rounded-full mix-blend-multiply filter blur-[100px] opacity-80"></div>

                {/* Main White Card Container */}
                <div className="w-full flex-1 bg-white/90 backdrop-blur-sm rounded-[50px] shadow-lg flex flex-col items-center pt-[140px] px-12 pb-12 z-10 border border-white relative h-full">
                  
                  {/* Top Circular Logo */}
                  <div className="absolute -top-[120px] left-1/2 -translate-x-1/2 w-[240px] h-[240px] bg-[#fce8ed] rounded-full flex flex-col items-center justify-center p-2 shadow-sm border-[4px] border-white">
                    <div className="w-full h-full rounded-full flex flex-col items-center justify-center relative">
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        <defs>
                          <path id="textPathTop" d="M 40,100 A 60,60 0 0,1 160,100" />
                        </defs>
                        {/* Curved Text JOHA MOLINERO */}
                        <text fill="#8c3d52" fontSize="16" fontWeight="600" letterSpacing="4" style={{fontFamily: 'serif'}}>
                          <textPath href="#textPathTop" startOffset="50%" textAnchor="middle">
                            JOHA MOLINERO
                          </textPath>
                        </text>
                        {/* Eyebrow */}
                        <path d="M 75 75 Q 100 65 125 75" fill="none" stroke="#231f20" strokeWidth="4" strokeLinecap="round" />
                        {/* Eye / Eyelashes */}
                        <path d="M 80 85 Q 100 95 120 85" fill="none" stroke="#231f20" strokeWidth="4" strokeLinecap="round" />
                        <path d="M 90 90 L 85 98" fill="none" stroke="#231f20" strokeWidth="3" strokeLinecap="round" />
                        <path d="M 100 92 L 100 102" fill="none" stroke="#231f20" strokeWidth="3" strokeLinecap="round" />
                        <path d="M 110 90 L 115 98" fill="none" stroke="#231f20" strokeWidth="3" strokeLinecap="round" />
                        {/* Hands */}
                        <path d="M 70 120 C 80 135 100 135 120 125 C 130 120 140 115 150 110" fill="none" stroke="#b5506a" strokeWidth="3" strokeLinecap="round" />
                        <path d="M 60 130 C 75 145 100 145 120 135 C 130 130 140 125 150 120" fill="none" stroke="#b5506a" strokeWidth="3" strokeLinecap="round" />
                        {/* Text beauty studio */}
                        <text x="100" y="165" fill="#8c3d52" fontSize="14" fontWeight="400" fontStyle="italic" textAnchor="middle" style={{fontFamily: 'serif'}}>
                          beauty studio
                        </text>
                      </svg>
                    </div>
                  </div>

                  {/* Header Text */}
                  <h2 className="text-[#4a393e] text-[50px] font-medium tracking-[0.25em] mt-8 mb-2">TURNOS</h2>
                  <h1 className="text-[#b5506a] text-[100px] font-bold leading-none tracking-tight font-serif mb-6 drop-shadow-sm">DISPONIBLES</h1>
                  
                  <div className="flex items-center gap-6 w-full px-20 mb-6">
                    <div className="h-[2px] flex-1 bg-[#e3a1b0]"></div>
                    <Heart className="text-[#b5506a]" fill="#b5506a" size={28} />
                    <div className="h-[2px] flex-1 bg-[#e3a1b0]"></div>
                  </div>

                  <p className="text-[#4a393e] text-[32px] font-medium tracking-wide mb-10">
                    RESERVÁ TU MOMENTO <span className="text-[#b5506a] font-bold">PARA VOS</span>
                  </p>

                  {/* Pills (Servicio / Profesional) */}
                  <div className="w-full space-y-4 px-6 mb-12">
                    {/* Servicio Pill */}
                    <div className="w-full bg-[#fcf2f4] rounded-[50px] p-4 flex items-center gap-6 shadow-sm border border-[#fae1e6]">
                      <div className="w-[80px] h-[80px] bg-white rounded-full shadow-sm flex items-center justify-center shrink-0 border border-[#fae1e6]">
                        {/* Hands holding SVG */}
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#b5506a" strokeWidth="1.5">
                          <path d="M14.5 17.5L3 6l2.5-2.5L17 15" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M13 19l8-8-2.5-2.5L7 13" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M16 16l-4 4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="text-[#6d555c] text-[20px] uppercase tracking-widest font-medium">SERVICIO</span>
                        <span className="text-[#b5506a] text-[36px] font-bold uppercase leading-tight">{serviceName}</span>
                      </div>
                    </div>

                    {/* Profesional Pill */}
                    <div className="w-full bg-[#fcf2f4] rounded-[50px] p-4 flex items-center gap-6 shadow-sm border border-[#fae1e6]">
                      <div className="w-[80px] h-[80px] bg-white rounded-full shadow-sm flex items-center justify-center shrink-0 border border-[#fae1e6]">
                        {/* Woman Face SVG */}
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#b5506a" strokeWidth="1.5">
                          <path d="M12 2a5 5 0 0 0-5 5v2a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M7 14v1a5 5 0 0 0 10 0v-1" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 11v1" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M9 16c0 1.66 1.34 3 3 3s3-1.34 3-3" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5 22v-2a7 7 0 0 1 14 0v2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="text-[#6d555c] text-[20px] uppercase tracking-widest font-medium">PROFESIONAL</span>
                        <span className="text-[#b5506a] text-[36px] font-bold uppercase leading-tight">{profDisplayName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Calendar Grid Container */}
                  <div className="w-full bg-white rounded-[40px] border border-[#f5d9e0] shadow-sm relative pt-[50px] pb-8 px-8 mb-10 flex-1">
                    {/* Date Badge */}
                    <div className="absolute -top-[30px] left-1/2 -translate-x-1/2 bg-[#b5506a] text-white rounded-full py-3 px-10 flex items-center gap-3 shadow-md">
                      <Calendar size={28} />
                      <span className="text-[28px] font-bold tracking-widest">{dayName} {dayNumber}</span>
                    </div>

                    {/* Slots Grid */}
                    <div className="grid grid-cols-4 gap-4">
                      {firstDay.slots.map((slot, i) => (
                        <div key={i} className="border-[2px] border-[#f5d9e0] rounded-[30px] py-3 flex items-baseline justify-center gap-1 shadow-sm">
                          <span className="text-[#b5506a] text-[28px] font-bold">{slot}</span>
                          <span className="text-[#a5868f] text-[16px] font-medium">HS</span>
                        </div>
                      ))}
                      {firstDay.slots.length === 0 && (
                        <div className="col-span-4 text-center py-8 text-[28px] text-[#a5868f]">
                          Sin turnos libres para esta fecha.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Categories Icons */}
                  <div className="flex justify-between w-full px-10 mb-8">
                    {['UÑAS', 'CEJAS', 'FACIALES', 'MAQUILLAJE'].map((cat, i) => (
                      <div key={i} className="flex flex-col items-center gap-3">
                        <div className="w-[60px] h-[60px] flex items-center justify-center text-[#4a393e]">
                          {i === 0 && <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 17.5L3 6l2.5-2.5L17 15" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 19l8-8-2.5-2.5L7 13" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 16l-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          {i === 1 && <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 15S6 12 12 12s9 3 9 3" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 14S7 11 12 11s8 3 8 3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          {i === 2 && <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2" strokeLinecap="round" strokeLinejoin="round"/><line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2" strokeLinecap="round"/><line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2" strokeLinecap="round"/></svg>}
                          {i === 3 && <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h4"/><path d="M8 18h8"/><path d="M8 14h8"/></svg>}
                        </div>
                        <span className="text-[16px] text-[#4a393e] font-medium tracking-wide">{cat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Reservá Ahora CTA */}
                  <div className="w-full bg-[#ba647a] text-white rounded-full py-5 flex items-center justify-center gap-4 shadow-md mb-8">
                    <MessageCircle size={32} />
                    <span className="text-[32px] font-bold tracking-wider">RESERVÁ AHORA</span>
                  </div>

                  {/* Footer Instagram */}
                  <div className="flex flex-col items-center gap-2 mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="border-[1.5px] border-[#b5506a] rounded-lg p-1 text-[#b5506a]">
                        <Instagram size={20} />
                      </div>
                      <span className="text-[#b5506a] text-[26px] font-medium">@estudiojohamolinero</span>
                    </div>
                    <span className="text-[#a5868f] text-[22px] font-medium">o desde el link de la bio</span>
                  </div>

                </div>
              </div>
            </div>
            
            {/* 
              This forces the preview container to have the correct aspect ratio (400 x 711) 
              since the inner div is absolute positioned or scaled.
            */}
            <div style={{ paddingBottom: '177.77%' }}></div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
