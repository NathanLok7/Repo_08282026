import { NextResponse } from "next/server"

import { upsertCliente } from "@/lib/db"
import { esRfcValido, normalizarRfc } from "@/lib/rfc"
import { crearTokenSesion, SESSION_COOKIE } from "@/lib/session"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const rfcCrudo = typeof body?.rfc === "string" ? body.rfc : ""
  const rfc = normalizarRfc(rfcCrudo)

  if (!esRfcValido(rfc)) {
    return NextResponse.json(
      { ok: false, error: "El RFC no tiene un formato válido (ej. VAE050101AB1)." },
      { status: 400 }
    )
  }

  let cliente
  try {
    cliente = await upsertCliente(rfc)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { ok: false, error: "No se pudo iniciar sesión. Intenta de nuevo." },
      { status: 500 }
    )
  }

  const token = await crearTokenSesion(rfc)
  const response = NextResponse.json({ ok: true, cliente })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
  return response
}
