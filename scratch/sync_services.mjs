const API_URL = 'http://localhost:5000/api';

const newServices = [
  // Cejas y Pestañas
  { name: "Diseño + Perfilado de Cejas", category: "Cejas y Pestañas", duration: 30, price: 19500 },
  { name: "Mantenimiento de Perfilado", category: "Cejas y Pestañas", duration: 20, price: 16500 },
  { name: "Diseño + Perfilado + Henna", category: "Cejas y Pestañas", duration: 60, price: 25000 },
  { name: "Diseño + Perfilado + Laminado", category: "Cejas y Pestañas", duration: 90, price: 26000 },
  { name: "Diseño + Perfilado HD (Henna y Laminado)", category: "Cejas y Pestañas", duration: 120, price: 28000 },
  { name: "Nutrición de Cejas", category: "Cejas y Pestañas", duration: 45, price: 8000 },
  { name: "Microblading de Cejas", category: "Cejas y Pestañas", duration: 150, price: 100000 },
  { name: "Retoque Inicial", category: "Cejas y Pestañas", duration: 120, price: 40000 },
  { name: "Retoque Futuro", category: "Cejas y Pestañas", duration: 120, price: 50000 },
  { name: "Lifting de Pestañas + Nutrición/Botox + Tinte", category: "Cejas y Pestañas", duration: 120, price: 29000 },
  { name: "Depilación Bozo", category: "Cejas y Pestañas", duration: 15, price: 6500 },
  { name: "Rostro Completo", category: "Cejas y Pestañas", duration: 45, price: 17000 },
  { name: "Retiro de Pestañas", category: "Cejas y Pestañas", duration: 45, price: 8000 },

  // Uñas
  { name: "Manicuría Simple", category: "Uñas", duration: 30, price: 17000 },
  { name: "Spa de Manos (Completo)", category: "Uñas", duration: 15, price: 10000 },
  { name: "Esmalte Tradicional (Liso)", category: "Uñas", duration: 60, price: 20000 },
  { name: "Esmalte Tradicional (French)", category: "Uñas", duration: 75, price: 22000 },
  { name: "Esmalte Semipermanente (Liso) + Niv", category: "Uñas", duration: 60, price: 20000 },
  { name: "Esmalte Semipermanente (French) + Niv", category: "Uñas", duration: 90, price: 24000 },
  { name: "Esmalte Semipermanente (Full Deco) + Niv", category: "Uñas", duration: 90, price: 26000 },
  { name: "Capping Liso", category: "Uñas", duration: 60, price: 19000 },
  { name: "Capping + French o Baby Boomer", category: "Uñas", duration: 90, price: 21000 },
  { name: "Softgel (Liso)", category: "Uñas", duration: 90, price: 28000 },
  { name: "Softgel (French)", category: "Uñas", duration: 120, price: 32000 },
  { name: "Softgel Full Deco Compleja", category: "Uñas", duration: 180, price: 38000 },
  { name: "Retiro de Semipermanente / Capping", category: "Uñas", duration: 45, price: 17000 },
  { name: "Retiro de Softgel", category: "Uñas", duration: 60, price: 18000 },

  // Pies
  { name: "Belleza de Pies Básica (Sin Esmaltado)", category: "Pies", duration: 30, price: 17000 },
  { name: "Belleza de Pies Básica + Esmaltado Tradi Liso", category: "Pies", duration: 45, price: 18500 },
  { name: "Belleza de Pies Básica + Esmaltado Semi Liso", category: "Pies", duration: 60, price: 20000 },
  { name: "Premium Sin Esmaltado", category: "Pies", duration: 60, price: 21000 },
  { name: "Premium + Esmaltado Semi Liso", category: "Pies", duration: 75, price: 23000 },
  { name: "Reconstrucción Uña del Pie", category: "Pies", duration: 15, price: 4500 },

  // Facial
  { name: "Limpieza Facial Básica", category: "Facial", duration: 30, price: 26000 },
  { name: "Limpieza Facial Profunda", category: "Facial", duration: 60, price: 28000 },
  { name: "Limpieza Facial Profunda Anti Age", category: "Facial", duration: 90, price: 35000 },
  { name: "Peeling Químico", category: "Facial", duration: 45, price: 35000 },
  { name: "Aparatología Facial", category: "Facial", duration: 60, price: 30000 },
  { name: "Aparatología Corporal", category: "Facial", duration: 60, price: 30000 },

  // Depi Definitiva
  { name: "Combo 1 (Cavado, Tiro Cola, 1/2 Pierna, Axilas)", category: "Depi Definitiva", duration: 30, price: 19000 },
  { name: "Combo 2 (Cavado, Tiro Cola, Pierna Entera, Axilas)", category: "Depi Definitiva", duration: 30, price: 21000 },
  { name: "Bozo", category: "Depi Definitiva", duration: 5, price: 5000 },
  { name: "Axilas", category: "Depi Definitiva", duration: 10, price: 7000 },
  { name: "Piernas Completas", category: "Depi Definitiva", duration: 15, price: 12000 },
  { name: "Cavado Completo", category: "Depi Definitiva", duration: 15, price: 8000 },

  // Cama Solar
  { name: "Bronceado Saludable", category: "Cama Solar", duration: 30, price: 4000 },
  { name: "Sesión Individual", category: "Cama Solar", duration: 10, price: 2000 }
];

async function main() {
  console.log('Logging in...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password123' })
  });

  if (!loginRes.ok) {
    console.error('Login failed');
    return;
  }
  const { token } = await loginRes.json();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  console.log('Fetching existing services...');
  const getRes = await fetch(`${API_URL}/data/services`, { headers });
  const existingServices = await getRes.json();

  console.log(`Found ${existingServices.length} existing services. Purging...`);
  for (const srv of existingServices) {
    await fetch(`${API_URL}/data/services/${srv.id}`, { method: 'DELETE', headers });
  }

  console.log('Inserting new services...');
  for (const srv of newServices) {
    const res = await fetch(`${API_URL}/data/services`, {
      method: 'POST',
      headers,
      body: JSON.stringify(srv)
    });
    
    if (res.ok) {
      console.log(`Added: ${srv.name}`);
    } else {
      console.error(`Failed to add: ${srv.name}`, await res.text());
    }
  }
  
  console.log('Done!');
}

main().catch(console.error);
