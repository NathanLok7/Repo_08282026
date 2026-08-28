import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { SESSION_COOKIE, verificarTokenSesion } from "@/lib/session"

export default async function Page() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const rfc = await verificarTokenSesion(token)
  redirect(rfc ? "/documentos" : "/login")
}
