import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { listarDocumentos } from "@/lib/db"
import { SESSION_COOKIE, verificarTokenSesion } from "@/lib/session"

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const rfc = await verificarTokenSesion(token)
  if (!rfc) {
    return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 })
  }

  try {
    const documentos = await listarDocumentos(rfc)
    return NextResponse.json({ ok: true, documentos })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { ok: false, error: "No se pudieron cargar los documentos." },
      { status: 500 }
    )
  }
}
