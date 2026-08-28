// Sesión simple firmada por RFC (sin contraseña, igual que el login que se
// pidió: el RFC identifica al cliente). Implementado con Web Crypto puro
// (sin Buffer ni node:crypto) para que funcione igual en middleware (Edge)
// y en route handlers (Node).

export const SESSION_COOKIE = "semantiks_session"

const encoder = new TextEncoder()

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error("Falta SESSION_SECRET en las variables de entorno.")
  }
  return secret
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
}

function bytesToBase64Url(buffer: ArrayBuffer): string {
  let binario = ""
  for (const byte of new Uint8Array(buffer)) {
    binario += String.fromCharCode(byte)
  }
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlToBytes(valor: string): Uint8Array {
  const base64 = valor
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(valor.length / 4) * 4, "=")
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) {
    bytes[i] = binario.charCodeAt(i)
  }
  return bytes
}

function sonIguales(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function crearTokenSesion(rfc: string): Promise<string> {
  const key = await getKey()
  const firma = await crypto.subtle.sign("HMAC", key, encoder.encode(rfc))
  return `${rfc}.${bytesToBase64Url(firma)}`
}

export async function verificarTokenSesion(
  token: string | undefined | null
): Promise<string | null> {
  if (!token) return null

  const separador = token.lastIndexOf(".")
  if (separador <= 0) return null

  const rfc = token.slice(0, separador)
  const firmaRecibida = base64UrlToBytes(token.slice(separador + 1))

  const key = await getKey()
  const firmaEsperada = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(rfc))
  )

  return sonIguales(firmaEsperada, firmaRecibida) ? rfc : null
}
