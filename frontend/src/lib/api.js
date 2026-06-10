import { resolveAuthToken } from "./authToken";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export async function fetchJson(path, options = {}) {
  const token = await resolveAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  const payload = await res
    .json()
    .catch(() => ({ error: "Invalid JSON response" }));
  if (!res.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}
