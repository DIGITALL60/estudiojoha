import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import LandingDashboard from "@/components/LandingDashboard";
import BookingWizard from "@/components/BookingWizard";
import MisTurnosModal from "@/components/MisTurnosModal";
import { fetchAPI } from "@/lib/api";
import { fetchPublicInfo, type PublicInfo } from "@/lib/publicInfo";

export default function Home() {
  const [showBooking, setShowBooking] = useState(false);
  const [showMisTurnos, setShowMisTurnos] = useState(false);
  const [publicInfo, setPublicInfo] = useState<PublicInfo | null>(null);

  useEffect(() => {
    fetchPublicInfo()
      .then((info) => setPublicInfo(info))
      .catch(console.error);
  }, []);

  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-hidden">
      <LandingDashboard 
        publicInfo={publicInfo} 
        onBookClick={() => setShowBooking(true)} 
      />

      {/* Floating button for Mis Turnos (optional since they have WhatsApp, but good to have) */}
      <button 
        onClick={() => setShowMisTurnos(true)}
        className="fixed bottom-6 right-6 z-40 bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-full shadow-lg border border-border/50 hover:bg-accent/80 transition-colors"
      >
        Mis Turnos
      </button>

      <AnimatePresence>
        {showMisTurnos && <MisTurnosModal onClose={() => setShowMisTurnos(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showBooking && (
          <BookingWizard
            onClose={() => setShowBooking(false)}
            publicInfo={publicInfo}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
