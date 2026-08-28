// Aplica db/schema.sql contra POSTGRES_URL. Alternativa a psql (que no
// siempre está instalado en Windows). Uso: node scripts/migrate.mjs
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { db } from "@vercel/postgres"

const rutaSchema = fileURLToPath(new URL("../db/schema.sql", import.meta.url))
const contenido = readFileSync(rutaSchema, "utf8")

const sentencias = contenido
  .split(/;\s*(?:\n|$)/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"))

for (const sentencia of sentencias) {
  console.log(`> ${sentencia.split("\n")[0]}...`)
  await db.query(sentencia)
}

console.log(`Listo: ${sentencias.length} sentencias aplicadas.`)
await db.end()
