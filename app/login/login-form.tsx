"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { esRfcValido, normalizarRfc } from "@/lib/rfc"

export function LoginForm() {
  const router = useRouter()
  const [rfc, setRfc] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const rfcNormalizado = normalizarRfc(rfc)

    if (!esRfcValido(rfcNormalizado)) {
      setError("Ese RFC no tiene un formato válido (ej. VAE050101AB1).")
      return
    }

    setError(null)
    setCargando(true)
    try {
      const respuesta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfc: rfcNormalizado }),
      })
      const datos = await respuesta.json()

      if (!respuesta.ok || !datos.ok) {
        setError(datos.error ?? "No se pudo iniciar sesión.")
        return
      }

      toast.success("Sesión iniciada")
      router.push("/documentos")
      router.refresh()
    } catch {
      setError("No se pudo conectar con el servidor.")
    } finally {
      setCargando(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Ingresa tu RFC para acceder a tus documentos.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rfc">RFC</Label>
            <Input
              id="rfc"
              name="rfc"
              placeholder="VAE050101AB1"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={13}
              aria-invalid={error ? true : undefined}
              className="font-mono uppercase"
              value={rfc}
              onChange={(event) => setRfc(event.target.value.toUpperCase())}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
          <Button type="submit" disabled={cargando}>
            {cargando ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
