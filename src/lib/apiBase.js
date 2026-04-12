function isLocalhost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function resolveApiBase() {
  const raw = (import.meta.env.VITE_API_URL || "").trim();
  if (!raw) {
    return "";
  }

  const normalized = raw.replace(/\/$/, "");

  if (typeof window === "undefined") {
    return normalized;
  }

  if (isLocalhost(window.location.hostname)) {
    return normalized;
  }

  return "";
}

