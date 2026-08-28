import { NextResponse, type NextRequest } from "next/server"

import { SESSION_COOKIE, verificarTokenSesion } from "@/lib/session"

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const rfc = await verificarTokenSesion(token)

  if (!rfc) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 })
    }
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/documentos/:path*", "/api/documentos/:path*"],
}
