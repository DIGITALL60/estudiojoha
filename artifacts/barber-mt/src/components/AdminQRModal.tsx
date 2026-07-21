import { motion } from "framer-motion";
import { X, QrCode, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function AdminQRModal({ onClose }: { onClose: () => void }) {
  const bookingUrl = window.location.origin;

  const handleDownload = () => {
    const svg = document.getElementById("booking-qr-code");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width + 40; // padding
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = "turno-qr.png";
        downloadLink.href = `${pngFile}`;
        downloadLink.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/20">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <QrCode size={16} className="text-primary" /> QR para Mostrador
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center space-y-6">
          <p className="text-xs text-muted-foreground">
            Tus clientas pueden escanear este código para abrir el sistema de turnos directamente en su celular.
          </p>

          <div className="bg-white p-4 rounded-xl shadow-inner border border-border/50 flex items-center justify-center">
            <QRCodeSVG
              id="booking-qr-code"
              value={bookingUrl}
              size={200}
              level="H"
              includeMargin={true}
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              imageSettings={{
                src: "/logo-black.png", // Assuming there is a logo or it gracefully falls back
                x: undefined,
                y: undefined,
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>

          <button
            onClick={handleDownload}
            className="w-full bg-primary text-primary-foreground font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors text-sm"
          >
            <Download size={16} /> Descargar QR
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
