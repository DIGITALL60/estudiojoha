import { cloudSendTemplate } from "../artifacts/api-server/src/lib/whatsapp-cloud.js";

async function testAll() {
  const languages = ["es_AR", "es", "es-AR", "es_LA", "es_MX", "es_ES"];
  for (const lang of languages) {
    console.log(`Testing ${lang}...`);
    const res = await cloudSendTemplate("5491111111111", "confirmacion_turno", lang, [
      "Juan",
      "10/08/2026",
      "15:00",
      "Corte de pelo",
      "Johana"
    ]);
    if (res) {
        console.log(`Success with ${lang}!`);
        return;
    }
  }
}
testAll();
