// Fix inconsistent categories + fill missing services
const base = 'http://localhost:5173';

const res = await fetch(`${base}/api/data/services`);
const services = await res.json();

// Step 1: Rename "Uñas" -> "Sector Uñas" and "Facial" -> "Sector Facial"
const renames = [
  { from: 'Uñas', to: 'Sector Uñas' },
  { from: 'Facial', to: 'Sector Facial' },
];

for (const { from, to } of renames) {
  const targets = services.filter(s => s.category === from);
  for (const svc of targets) {
    const r = await fetch(`${base}/api/data/services/${svc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...svc, category: to }),
    });
    console.log(`Renamed "${svc.name}" from "${from}" to "${to}" -> ${r.status}`);
  }
}

// Step 2: Add missing services for thin categories
const toAdd = [
  // Depi Definitiva (only 1 exists)
  { name: 'Depilación Axilas', category: 'Depi Definitiva', duration: 30, price: 4000, cod: 'DEPI2' },
  { name: 'Depilación Piernas Completas', category: 'Depi Definitiva', duration: 60, price: 8000, cod: 'DEPI3' },
  { name: 'Depilación Ingles', category: 'Depi Definitiva', duration: 30, price: 5000, cod: 'DEPI4' },
  { name: 'Depilación Facial', category: 'Depi Definitiva', duration: 20, price: 3000, cod: 'DEPI5' },
  // Cama Solar (only 1 exists)
  { name: 'Sesión 10 minutos', category: 'Cama Solar', duration: 20, price: 3500, cod: 'SOL2' },
  { name: 'Sesión 15 minutos', category: 'Cama Solar', duration: 25, price: 5000, cod: 'SOL3' },
  { name: 'Pack 5 sesiones', category: 'Cama Solar', duration: 15, price: 15000, cod: 'SOL4' },
];

// Check which already exist (by name) to avoid duplicates
const existingNames = services.map(s => s.name.toLowerCase());

for (const svc of toAdd) {
  if (existingNames.includes(svc.name.toLowerCase())) {
    console.log(`Skipping "${svc.name}" (already exists)`);
    continue;
  }
  const r = await fetch(`${base}/api/data/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(svc),
  });
  console.log(`Added "${svc.name}" -> ${r.status}`);
}

// Final check
const res2 = await fetch(`${base}/api/data/services`);
const final = await res2.json();
const cats = [...new Set(final.map(s => s.category))].sort();
console.log('\n✅ Final state:');
cats.forEach(c => {
  const count = final.filter(s => s.category === c).length;
  console.log(`  "${c}" - ${count} services`);
});
console.log('Total:', final.length);
