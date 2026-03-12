const DEFAULT_DOMAIN = "health.app"

export function resolveEmail(input: string): string {
  const trimmed = input.trim()
  if (trimmed.includes("@")) return trimmed
  return `${trimmed}@${DEFAULT_DOMAIN}`
}
