import { del, get } from "@vercel/blob"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

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

  const resultado = await get(documento.ruta_storage, { access: "private" })
  if (!resultado || resultado.statusCode !== 200) {
    return NextResponse.json({ ok: false, error: "No se pudo obtener el archivo." }, { status: 500 })
  }

  return new NextResponse(resultado.stream, {
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

  await del(documento.blob_url)
  await eliminarDocumento(id)

  return NextResponse.json({ ok: true })
}
