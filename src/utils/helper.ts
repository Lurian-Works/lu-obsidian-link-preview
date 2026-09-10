import { error } from "node:console"
import { type OgpData, WebURLSchema } from "../schema"

export class LuLinkError extends Error {}

export function luLinkMessage(message: string, showPopup?: boolean) {
  console.log(`LuLink: ${message}`)
}

/**
 * extracts urls from any text that contains any
 */
export function extractUrls(value: string): string[] | null {
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

/**
 * updates an nested object while only updating/adding whats defined in the update
 * @example
 * deepUpdate({num: 3, data: {path: "a", values: {val1: "a", val2: "a"}}} , {data: {values: {val2: "b"}}, info:"b"})
 * => {num: 3, data: {path: "a", values: {val1: "a", val2: "b"}, info: "b"}}
 */
export function deepUpdate<
  T extends Record<string, unknown>,
  U extends Record<string, unknown>,
>(target: T, update: U): T & U {
  if (!isPlainObject(target) || !isPlainObject(update)) {
    throw new Error(`not an object`)
  }
  const result: Record<string, unknown> = { ...target }
  for (const key of Object.keys(update)) {
    const value = update[key]
    if (value === undefined) {
      continue
    }
    const current = result[key]
    if (isPlainObject(current) && isPlainObject(value)) {
      result[key] = deepUpdate(current, value)
    } else {
      result[key] = value
    }
  }
  return result as T & U
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
  )
}
