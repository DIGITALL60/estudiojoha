export async function fetchAPI(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (response.status === 401) {
    // Optionally trigger a logout if token is expired
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/admin"; // Redirect to login
  }
  
  return response;
}
