import { randomUUID } from "node:crypto"

import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { eliminarArchivo, subirArchivo } from "@/lib/blob"
import { insertarDocumento, obtenerClientePorRfc } from "@/lib/db"
import { SESSION_COOKIE, verificarTokenSesion } from "@/lib/session"

const TAMANO_MAXIMO = 15 * 1024 * 1024 // 15 MB

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const rfc = await verificarTokenSesion(token)
  if (!rfc) {
    return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 })
  }

  const formData = await request.formData()
  const archivo = formData.get("archivo")

  if (!(archivo instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "No se recibió ningún archivo." },
      { status: 400 }
    )
  }

  if (archivo.size > TAMANO_MAXIMO) {
    return NextResponse.json({ ok: false, error: "El archivo supera los 15 MB." }, { status: 400 })
  }

  const cliente = await obtenerClientePorRfc(rfc)
  if (!cliente) {
    return NextResponse.json({ ok: false, error: "Cliente no encontrado." }, { status: 404 })
  }

  const rutaStorage = `${rfc}/${randomUUID()}-${archivo.name}`

  let archivoSubido
  try {
    archivoSubido = await subirArchivo(
      rutaStorage,
      archivo,
      archivo.type || "application/octet-stream"
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json({ ok: false, error: "No se pudo subir el archivo." }, { status: 500 })
  }

  try {
    const documento = await insertarDocumento({
      clienteId: cliente.id,
      rfc,
      nombreArchivo: archivo.name,
      tipoMime: archivo.type || null,
      tamanoBytes: archivo.size,
      rutaStorage,
      blobUrl: archivoSubido.url,
    })
    return NextResponse.json({ ok: true, documento })
  } catch (error) {
    console.error(error)
    await eliminarArchivo(rutaStorage, archivoSubido.url)
    return NextResponse.json(
      { ok: false, error: "No se pudo registrar el documento." },
      { status: 500 }
    )
  }
}
