const fs = require('fs');
const path = require('path');
const adminDir = path.join('c:/Users/Carlos/Desktop/PROYECTOS 2026/estudiojoha-main/estudiojoha-main/artifacts/barber-mt/src/pages/admin');
fs.readdirSync(adminDir).forEach(file => {
  if (file.endsWith('.tsx')) {
    const p = path.join(adminDir, file);
    let c = fs.readFileSync(p, 'utf8');
    if (c.includes('fetch(') && !c.includes('fetchAPI')) {
      c = 'import { fetchAPI } from "@/lib/api";\n' + c;
      c = c.replace(/fetch\(/g, 'fetchAPI(');
      fs.writeFileSync(p, c);
      console.log('Updated ' + file);
    }
  }
});
