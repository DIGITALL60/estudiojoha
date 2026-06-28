// Script to check and fix inconsistent service categories
const base = 'http://localhost:5173';

const res = await fetch(`${base}/api/data/services`);
const services = await res.json();

const cats = [...new Set(services.map(s => s.category))].sort();
console.log('Total services:', services.length);
console.log('Categories found:');
cats.forEach(c => {
  const count = services.filter(s => s.category === c).length;
  console.log(`  "${c}" - ${count} services`);
});
