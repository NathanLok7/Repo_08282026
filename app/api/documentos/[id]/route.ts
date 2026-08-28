import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { eliminarArchivo, leerArchivo } from "@/lib/blob"
import { eliminarDocumento, obtenerDocumento } from "@/lib/db"
import { SESSION_COOKIE, verificarTokenSesion } from "@/lib/session"

async function obtenerRfcSesion(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return verificarTokenSesion(token)
}

// Transmite el archivo (blob privado) directo al navegador, sin exponer
// nunca la URL del blob en el cliente.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rfc = await obtenerRfcSesion()
  if (!rfc) {
    return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 })
  }

  const { id } = await params
  const documento = await obtenerDocumento(id)
  if (!documento || documento.rfc !== rfc) {
    return NextResponse.json({ ok: false, error: "Documento no encontrado." }, { status: 404 })
  }

  const stream = await leerArchivo(documento.ruta_storage)
  if (!stream) {
    return NextResponse.json({ ok: false, error: "No se pudo obtener el archivo." }, { status: 500 })
  }

  return new NextResponse(stream, {
    headers: {
      "Content-Type": documento.tipo_mime || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(documento.nombre_archivo)}"`,
    },
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rfc = await obtenerRfcSesion()
  if (!rfc) {
    return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 })
  }

  const { id } = await params
  const documento = await obtenerDocumento(id)
  if (!documento || documento.rfc !== rfc) {
    return NextResponse.json({ ok: false, error: "Documento no encontrado." }, { status: 404 })
  }

  await eliminarArchivo(documento.ruta_storage, documento.blob_url)
  await eliminarDocumento(id)

  return NextResponse.json({ ok: true })
}
