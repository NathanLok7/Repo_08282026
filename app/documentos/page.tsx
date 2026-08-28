import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { SESSION_COOKIE, verificarTokenSesion } from "@/lib/session"

import { DocumentosClient } from "./documentos-client"

export default async function DocumentosPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const rfc = await verificarTokenSesion(token)
  if (!rfc) redirect("/login")

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 p-6">
      <DocumentosClient rfc={rfc} />
    </div>
  )
}
