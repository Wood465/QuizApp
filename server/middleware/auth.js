import { pool } from "../db.js";
import { verifyToken } from "../utils/jwt.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing authorization token." });
  }

  try {
    const payload = verifyToken(token);
    const result = await pool.query(
      "SELECT id, name, email, role, provider FROM users WHERE id = $1 LIMIT 1",
      [payload.sub],
    );

    if (!result.rowCount) {
      return res.status(401).json({ message: "User not found." });
    }

    req.user = result.rows[0];
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  return next();
}
