"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Documento = {
  id: string
  nombre_archivo: string
  tipo_mime: string | null
  tamano_bytes: number
  creado_en: string
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentosClient({ rfc }: { rfc: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)

  const cargarDocumentos = useCallback(async () => {
    try {
      const respuesta = await fetch("/api/documentos")
      const datos = await respuesta.json()
      if (datos.ok) setDocumentos(datos.documentos)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarDocumentos()
  }, [cargarDocumentos])

  async function handleArchivos(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return
    setSubiendo(true)
    try {
      for (const archivo of Array.from(archivos)) {
        const formData = new FormData()
        formData.append("archivo", archivo)
        const respuesta = await fetch("/api/documentos/upload", {
          method: "POST",
          body: formData,
        })
        const datos = await respuesta.json()
        if (!respuesta.ok || !datos.ok) {
          toast.error(`${archivo.name}: ${datos.error ?? "Error al subir"}`)
        } else {
          toast.success(`${archivo.name} subido`)
        }
      }
      await cargarDocumentos()
    } finally {
      setSubiendo(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function handleDescargar(id: string) {
    const enlace = document.createElement("a")
    enlace.href = `/api/documentos/${id}`
    enlace.click()
  }

  async function handleEliminar(id: string) {
    const respuesta = await fetch(`/api/documentos/${id}`, { method: "DELETE" })
    const datos = await respuesta.json()
    if (!datos.ok) {
      toast.error("No se pudo eliminar el documento.")
      return
    }
    toast.success("Documento eliminado")
    setDocumentos((previo) => previo.filter((doc) => doc.id !== id))
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium">Documentos</h1>
          <p className="text-muted-foreground text-sm">
            RFC: <span className="font-mono">{rfc}</span>
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Cerrar sesión
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subir documentos</CardTitle>
          <CardDescription>PDF, XML o imágenes. Máximo 15 MB por archivo.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input
            ref={inputRef}
            type="file"
            multiple
            disabled={subiendo}
            onChange={(event) => handleArchivos(event.target.files)}
            className="file:bg-secondary file:text-secondary-foreground text-sm file:mr-4 file:rounded-md file:border-0 file:px-3 file:py-2"
          />
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Tus documentos</CardTitle>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <p className="text-muted-foreground text-sm">Cargando...</p>
          ) : documentos.length === 0 ? (
            <p className="text-muted-foreground text-sm">Todavía no subes ningún documento.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentos.map((documento) => (
                  <TableRow key={documento.id}>
                    <TableCell className="max-w-48 truncate">
                      {documento.nombre_archivo}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{documento.tipo_mime ?? "?"}</Badge>
                    </TableCell>
                    <TableCell>{formatearTamano(documento.tamano_bytes)}</TableCell>
                    <TableCell>
                      {new Date(documento.creado_en).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell className="flex justify-end gap-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDescargar(documento.id)}
                      >
                        Descargar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleEliminar(documento.id)}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
