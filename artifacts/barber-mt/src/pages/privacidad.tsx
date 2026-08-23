import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";

export default function Privacidad() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <Link href="/">
            <a className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-8 group">
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Volver al inicio
            </a>
          </Link>
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Política de Privacidad</h1>
          <p className="text-muted-foreground text-lg">Joha Molinero Beauty Studio</p>
          <p className="text-xs text-muted-foreground mt-2 font-mono">Última actualización: 23 de agosto de 2026</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="prose prose-sm md:prose-base dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary hover:prose-a:text-primary/80 max-w-none space-y-8"
        >
          <section>
            <h2 className="text-xl font-bold border-b pb-2 mb-4">1. Quiénes somos</h2>
            <p className="leading-relaxed text-muted-foreground">
              Joha Molinero Beauty Studio (Molinero Johana Gabriela, CUIT 27-38251629-5), 
              con domicilio en Bv. Sarmiento y Catamarca 0, Río Segundo, Córdoba, Argentina, 
              es responsable del tratamiento de los datos personales que se recolectan a 
              través de este sitio web y de nuestro canal de WhatsApp Business.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold border-b pb-2 mb-4">2. Qué datos recolectamos</h2>
            <p className="leading-relaxed text-muted-foreground">
              Cuando te contactás con nosotros por WhatsApp o completás algún formulario 
              en este sitio, podemos recolectar: nombre y apellido, número de teléfono, 
              información sobre turnos, servicios solicitados o consultas realizadas, y 
              mensajes enviados a través de nuestro canal de atención.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold border-b pb-2 mb-4">3. Para qué usamos tus datos</h2>
            <p className="leading-relaxed text-muted-foreground">
              Usamos tu información para responder tus consultas y coordinar turnos, 
              enviarte confirmaciones, recordatorios o novedades sobre nuestros servicios, 
              y mejorar la atención que te brindamos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold border-b pb-2 mb-4">4. Con quién compartimos tus datos</h2>
            <p className="leading-relaxed text-muted-foreground">
              No vendemos ni compartimos tus datos personales con terceros, salvo con 
              proveedores tecnológicos necesarios para operar nuestro canal de mensajería 
              (por ejemplo, Meta/WhatsApp Business API), y únicamente en la medida 
              necesaria para prestar el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold border-b pb-2 mb-4">5. Cómo protegemos tus datos</h2>
            <p className="leading-relaxed text-muted-foreground">
              Tomamos medidas razonables para proteger tu información contra accesos no 
              autorizados, pérdida o uso indebido.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold border-b pb-2 mb-4">6. Tus derechos</h2>
            <p className="leading-relaxed text-muted-foreground">
              Podés solicitar en cualquier momento el acceso, la rectificación o la 
              eliminación de tus datos personales escribiéndonos a través de nuestro 
              WhatsApp o al correo de contacto que figura en este sitio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold border-b pb-2 mb-4">7. Retención de datos</h2>
            <p className="leading-relaxed text-muted-foreground">
              Conservamos tus datos únicamente durante el tiempo necesario para los 
              fines para los cuales fueron recolectados, o según lo exija la normativa 
              vigente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold border-b pb-2 mb-4">8. Cambios en esta política</h2>
            <p className="leading-relaxed text-muted-foreground">
              Podemos actualizar esta política ocasionalmente. Cualquier cambio será 
              publicado en esta misma página.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold border-b pb-2 mb-4">9. Contacto</h2>
            <p className="leading-relaxed text-muted-foreground">
              Si tenés dudas sobre esta política de privacidad, podés contactarnos por 
              WhatsApp o al correo de contacto del negocio.
            </p>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
