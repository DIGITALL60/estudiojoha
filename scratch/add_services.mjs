const API_URL = 'http://localhost:5000/api';

const services = [
  // Sector Uñas
  { name: "Esmaltado Tradicional", category: "Uñas", duration: 60, price: 3000 },
  { name: "Adicional de Capping", category: "Uñas", duration: 30, price: 2000 },
  { name: "Softgel", category: "Uñas", duration: 120, price: 8000 },
  // Sector Pies
  { name: "Belleza de Pies", category: "Pies", duration: 60, price: 4000 },
  { name: "Pedicuría Premium", category: "Pies", duration: 60, price: 5000 },
  { name: "Pedicuría Jelly", category: "Pies", duration: 60, price: 6000 },
  // Cejas y Pestañas
  { name: "Perfilado de Cejas", category: "Cejas y Pestañas", duration: 30, price: 2500 },
  { name: "Cejas con Henna", category: "Cejas y Pestañas", duration: 60, price: 3500 },
  { name: "Laminado de Cejas", category: "Cejas y Pestañas", duration: 60, price: 4500 },
  { name: "Depilación de Rostro", category: "Cejas y Pestañas", duration: 30, price: 2000 },
  // Depi Definitiva
  { name: "Depi Definitiva / Láser Diodo", category: "Depi Definitiva", duration: 30, price: 10000 },
  // Cama Solar
  { name: "Cama Solar", category: "Cama Solar", duration: 15, price: 3000 },
  // Sector Facial
  { name: "Limpieza Facial Premium", category: "Facial", duration: 90, price: 8500 },
  { name: "Tratamiento Dermaplaning", category: "Facial", duration: 120, price: 9000 },
  { name: "Tratamiento Despigmentante", category: "Facial", duration: 120, price: 11000 },
  { name: "Tratamiento Antiage", category: "Facial", duration: 120, price: 12000 },
  // Catálogo Eventos
  { name: "Peinados Sociales", category: "Catálogo Eventos", duration: 60, price: 15000 },
  { name: "Maquillaje Social", category: "Catálogo Eventos", duration: 60, price: 18000 }
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

  console.log('Adding services...');
  for (const srv of services) {
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
