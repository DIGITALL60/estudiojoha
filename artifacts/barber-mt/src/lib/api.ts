export async function fetchAPI(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // In production, use the Railway API URL from env variable
  // In dev, use relative URL (proxied by Vite)
  const API_BASE = import.meta.env.VITE_API_URL ?? "";
  const fullUrl = url.startsWith("/api") ? `${API_BASE}${url}` : url;

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (window.location.pathname.startsWith("/admin")) {
      window.location.href = "/login";
    }
  }

  return response;
}
