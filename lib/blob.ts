import "server-only"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import { del as blobDel, get as blobGet, put as blobPut } from "@vercel/blob"

// Mismo interruptor que lib/db.ts: en local guarda los archivos en
// .data/blobs, en Vercel usa un Blob store privado real.
const LOCAL = process.env.LOCAL_DEV === "true"
const DIR_LOCAL = path.join(process.cwd(), ".data", "blobs")

export type ArchivoSubido = {
  url: string
  pathname: string
}

export async function subirArchivo(
  pathname: string,
  archivo: File,
  contentType: string
): Promise<ArchivoSubido> {
  if (LOCAL) {
    const destino = path.join(DIR_LOCAL, pathname)
    await mkdir(path.dirname(destino), { recursive: true })
    await writeFile(destino, Buffer.from(await archivo.arrayBuffer()))
    return { url: `local:${pathname}`, pathname }
  }

  const blob = await blobPut(pathname, archivo, {
    access: "private",
    contentType,
    addRandomSuffix: false,
  })
  return { url: blob.url, pathname: blob.pathname }
}

export async function leerArchivo(pathname: string): Promise<ReadableStream | null> {
  if (LOCAL) {
    try {
      const buffer = await readFile(path.join(DIR_LOCAL, pathname))
      return new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(buffer))
          controller.close()
        },
      })
    } catch {
      return null
    }
  }

  const resultado = await blobGet(pathname, { access: "private" })
  if (!resultado || resultado.statusCode !== 200) return null
  return resultado.stream
}

export async function eliminarArchivo(pathname: string, url: string): Promise<void> {
  if (LOCAL) {
    await rm(path.join(DIR_LOCAL, pathname), { force: true })
    return
  }

  await blobDel(url)
}
