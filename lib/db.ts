import "server-only"
import { sql } from "@vercel/postgres"

// Postgres del proyecto en Vercel (Storage -> Postgres, usa Neon por debajo).
// La conexión se toma automáticamente de POSTGRES_URL en producción; en
// local hay que copiarla a .env.local (ver .env.example).

export type Cliente = {
  id: string
  rfc: string
  nombre: string | null
}

export type Documento = {
  id: string
  nombre_archivo: string
  tipo_mime: string | null
  tamano_bytes: number
  creado_en: string
}

type DocumentoConRuta = Documento & {
  rfc: string
  ruta_storage: string
  blob_url: string
}

export async function upsertCliente(rfc: string): Promise<Cliente> {
  const { rows } = await sql<Cliente>`
    insert into clientes (rfc)
    values (${rfc})
    on conflict (rfc) do update set rfc = excluded.rfc
    returning id, rfc, nombre
  `
  return rows[0]
}

export async function obtenerClientePorRfc(rfc: string): Promise<Cliente | null> {
  const { rows } = await sql<Cliente>`
    select id, rfc, nombre from clientes where rfc = ${rfc}
  `
  return rows[0] ?? null
}

export async function listarDocumentos(rfc: string): Promise<Documento[]> {
  const { rows } = await sql<Documento>`
    select id, nombre_archivo, tipo_mime, tamano_bytes, creado_en
    from documentos
    where rfc = ${rfc}
    order by creado_en desc
  `
  return rows
}

export async function insertarDocumento(datos: {
  clienteId: string
  rfc: string
  nombreArchivo: string
  tipoMime: string | null
  tamanoBytes: number
  rutaStorage: string
  blobUrl: string
}): Promise<Documento> {
  const { rows } = await sql<Documento>`
    insert into documentos
      (cliente_id, rfc, nombre_archivo, tipo_mime, tamano_bytes, ruta_storage, blob_url)
    values
      (${datos.clienteId}, ${datos.rfc}, ${datos.nombreArchivo}, ${datos.tipoMime},
       ${datos.tamanoBytes}, ${datos.rutaStorage}, ${datos.blobUrl})
    returning id, nombre_archivo, tipo_mime, tamano_bytes, creado_en
  `
  return rows[0]
}

export async function obtenerDocumento(id: string): Promise<DocumentoConRuta | null> {
  const { rows } = await sql<DocumentoConRuta>`
    select id, rfc, ruta_storage, blob_url, nombre_archivo, tipo_mime, tamano_bytes, creado_en
    from documentos
    where id = ${id}
  `
  return rows[0] ?? null
}

export async function eliminarDocumento(id: string): Promise<void> {
  await sql`delete from documentos where id = ${id}`
}
