import { WebURLSchema } from "../schema"

export function extractUrl(value: string): string | null {
  const markdownLinkMatch = value.match(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i)
  if (markdownLinkMatch?.[1]) return markdownLinkMatch[1]

  const plainUrlMatch = value.match(/https?:\/\/\S+/i)
  if (plainUrlMatch?.[0]) return plainUrlMatch[0]

  return null
}

export function isWebUrl(value: string): boolean {
  if (WebURLSchema.safeParse(value).success) return true
  return false
}

export function toAbsoluteUrl(
  value: string | undefined,
  baseUrl: string,
): string | undefined {
  if (!value) return undefined

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return undefined
  }
}

export function decodeHtml(value: string): string {
  const textarea = document.createElement("textarea")
  textarea.innerHTML = value
  return textarea.value
}

export function getHtmlTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>(.*?)<\/title>/i)
  return match?.[1] ? decodeHtml(match[1].trim()) : undefined
}

export function getHtmlMeta(
  html: string,
  property: string,
): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["'][^>]*>`,
      "i",
    ),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtml(match[1])
  }

  return undefined
}
