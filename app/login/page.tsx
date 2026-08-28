import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { SESSION_COOKIE, verificarTokenSesion } from "@/lib/session"

import { LoginForm } from "./login-form"

export default async function LoginPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const rfc = await verificarTokenSesion(token)
  if (rfc) redirect("/documentos")

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <LoginForm />
    </div>
  )
}
