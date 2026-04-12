const API_URL = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

export async function apiRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const url = `${API_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }

  return payload;
}
