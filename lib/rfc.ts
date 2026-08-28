// Mismo formato que usa registry.py: 3 letras (moral) o 4 (física) + fecha aaaammdd + homoclave.
export const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/

export function normalizarRfc(valor: string): string {
  return valor.trim().toUpperCase()
}

export function esRfcValido(valor: string): boolean {
  return RFC_REGEX.test(normalizarRfc(valor))
}
