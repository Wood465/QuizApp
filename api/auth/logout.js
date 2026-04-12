import { clearAuthCookie, json } from "../_lib/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { message: "Method Not Allowed" });
  }

  clearAuthCookie(res);
  return json(res, 200, { ok: true });
}

