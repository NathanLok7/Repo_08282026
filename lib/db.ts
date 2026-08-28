import "server-only"
import { randomUUID } from "node:crypto"
import { mkdirSync } from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"

import { sql } from "@vercel/postgres"

// Con LOCAL_DEV=true usa SQLite en disco (.data/local.db, node:sqlite viene
// con Node, cero instalación) para poder correr y probar todo sin nube. En
// Vercel (LOCAL_DEV sin definir) usa Postgres real. Mismo contrato en ambos
// casos, así que las rutas de la API no necesitan saber cuál está activo.
const LOCAL = process.env.LOCAL_DEV === "true"

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

let sqliteInstancia: DatabaseSync | null = null

function getSqlite(): DatabaseSync {
  if (sqliteInstancia) return sqliteInstancia

  const dir = path.join(process.cwd(), ".data")
  mkdirSync(dir, { recursive: true })

  const db = new DatabaseSync(path.join(dir, "local.db"))
  db.exec(`
    create table if not exists clientes (
      id text primary key,
      rfc text not null unique,
      nombre text,
      creado_en text not null default (datetime('now'))
    );
    create table if not exists documentos (
      id text primary key,
      cliente_id text not null references clientes (id) on delete cascade,
      rfc text not null,
      nombre_archivo text not null,
      tipo_mime text,
      tamano_bytes integer not null,
      ruta_storage text not null,
      blob_url text not null,
      creado_en text not null default (datetime('now'))
    );
  `)
  sqliteInstancia = db
  return db
}

export async function upsertCliente(rfc: string): Promise<Cliente> {
  if (LOCAL) {
    const db = getSqlite()
    const existente = db
      .prepare("select id, rfc, nombre from clientes where rfc = ?")
      .get(rfc) as Cliente | undefined
    if (existente) return existente

    const id = randomUUID()
    db.prepare("insert into clientes (id, rfc) values (?, ?)").run(id, rfc)
    return { id, rfc, nombre: null }
  }

  const { rows } = await sql<Cliente>`
    insert into clientes (rfc)
    values (${rfc})
    on conflict (rfc) do update set rfc = excluded.rfc
    returning id, rfc, nombre
  `
  return rows[0]
}

export async function obtenerClientePorRfc(rfc: string): Promise<Cliente | null> {
  if (LOCAL) {
    const db = getSqlite()
    const fila = db
      .prepare("select id, rfc, nombre from clientes where rfc = ?")
      .get(rfc) as Cliente | undefined
    return fila ?? null
  }

  const { rows } = await sql<Cliente>`
    select id, rfc, nombre from clientes where rfc = ${rfc}
  `
  return rows[0] ?? null
}

export async function listarDocumentos(rfc: string): Promise<Documento[]> {
  if (LOCAL) {
    const db = getSqlite()
    return db
      .prepare(
        `select id, nombre_archivo, tipo_mime, tamano_bytes, creado_en
         from documentos where rfc = ? order by creado_en desc`
      )
      .all(rfc) as unknown as Documento[]
  }

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
  if (LOCAL) {
    const db = getSqlite()
    const id = randomUUID()
    db.prepare(
      `insert into documentos
        (id, cliente_id, rfc, nombre_archivo, tipo_mime, tamano_bytes, ruta_storage, blob_url)
       values (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      datos.clienteId,
      datos.rfc,
      datos.nombreArchivo,
      datos.tipoMime,
      datos.tamanoBytes,
      datos.rutaStorage,
      datos.blobUrl
    )
    const fila = db
      .prepare(
        "select id, nombre_archivo, tipo_mime, tamano_bytes, creado_en from documentos where id = ?"
      )
      .get(id) as Documento
    return fila
  }

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
  if (LOCAL) {
    const db = getSqlite()
    const fila = db
      .prepare(
        `select id, rfc, ruta_storage, blob_url, nombre_archivo, tipo_mime, tamano_bytes, creado_en
         from documentos where id = ?`
      )
      .get(id) as DocumentoConRuta | undefined
    return fila ?? null
  }

  const { rows } = await sql<DocumentoConRuta>`
    select id, rfc, ruta_storage, blob_url, nombre_archivo, tipo_mime, tamano_bytes, creado_en
    from documentos
    where id = ${id}
  `
  return rows[0] ?? null
}

export async function eliminarDocumento(id: string): Promise<void> {
  if (LOCAL) {
    getSqlite().prepare("delete from documentos where id = ?").run(id)
    return
  }

  await sql`delete from documentos where id = ${id}`
}
