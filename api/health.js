import { initDb } from "./_lib/db.js";

export default async function handler(_req, res) {
  await initDb();
  res.status(200).json({ ok: true });
}
