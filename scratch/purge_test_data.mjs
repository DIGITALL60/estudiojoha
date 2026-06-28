const API_URL = 'http://localhost:5000/api';

async function main() {
  console.log('Logging in as admin...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password123' })
  });

  if (!loginRes.ok) {
    console.error('Login failed. Ensure the server is running and credentials are correct.');
    return;
  }
  
  const { token } = await loginRes.json();
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  async function purgeEndpoint(endpoint, keepCondition = null) {
    console.log(`Fetching ${endpoint}...`);
    const res = await fetch(`${API_URL}/data/${endpoint}`, { headers });
    if (!res.ok) {
      console.error(`Failed to fetch ${endpoint}`);
      return;
    }
    const items = await res.json();
    console.log(`Found ${items.length} items in ${endpoint}.`);
    
    let deletedCount = 0;
    for (const item of items) {
      if (keepCondition && keepCondition(item)) {
        console.log(`Keeping item: ${item.name || item.id}`);
        continue;
      }
      const delRes = await fetch(`${API_URL}/data/${endpoint}/${item.id}`, { method: 'DELETE', headers });
      if (delRes.ok) {
        deletedCount++;
      } else {
        const errText = await delRes.text();
        console.error(`Failed to delete item ${item.id} from ${endpoint}. Status: ${delRes.status}, Error: ${errText}`);
      }
    }
    console.log(`Deleted ${deletedCount} items from ${endpoint}.`);
  }

  // Purge Appointments
  await purgeEndpoint('appointments');
  
  // Purge Clients
  await purgeEndpoint('clients');
  
  // Purge Expenses
  await purgeEndpoint('expenses');
  
  // Purge Products
  await purgeEndpoint('products');

  // Purge Professional Schedules
  await purgeEndpoint('schedules');
  
  // Purge Professional Services
  await purgeEndpoint('professional-services');

  // Purge Professionals (Keep admin)
  await purgeEndpoint('professionals', (prof) => prof.role.toLowerCase() === 'admin' || prof.username === 'admin');

  // We DO NOT purge 'services' because we just loaded the real ones.
  console.log('Skipping services as they contain the real synced catalog.');

  console.log('Purge complete!');
}

main().catch(console.error);
