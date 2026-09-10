import { type OgpData, WebURLSchema } from "../schema"

export class LuLinkError extends Error {}

/**
 * extracts urls from any text that contains any
 */
export function extractUrl(value: string): string[] | null {
  const markdownLinkMatch = value.match(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i)
  if (markdownLinkMatch) return markdownLinkMatch
  return value.match(/https?:\/\/\S+/i)
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

export async function getOpenGraphData(url: string): Promise<OgpData> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 Obsidian LuLink Plugin",
    },
  })

  const html = await response.text()

  const data = {
    url,
    title:
      getHtmlMeta(html, "og:title")
      || getHtmlMeta(html, "twitter:title")
      || getHtmlTitle(html)
      || url,
    description:
      getHtmlMeta(html, "og:description")
      || getHtmlMeta(html, "twitter:description"),
    image: toAbsoluteUrl(
      getHtmlMeta(html, "og:image") || getHtmlMeta(html, "twitter:image"),
      url,
    ),
    siteName: getHtmlMeta(html, "og:site_name") || new URL(url).hostname,
  }
  return data
}
