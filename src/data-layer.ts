import { requestUrl } from "obsidian"
import type { OgpData } from "./schema"
import { getHtmlMeta, getHtmlTitle, toAbsoluteUrl } from "./utils/helper"

export class DataManager {
  private cache = new Map<string, OgpData>()
  async getOpenGraphData(url: string): Promise<OgpData> {
    const cached = this.cache.get(url)
    if (cached) return cached

    const response = await requestUrl({
      url,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 Obsidian Link Preview Plugin",
      },
    })

    const html = response.text

    const data: OgpData = {
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
      siteName: getHtmlMeta(html, "og:site_name"),
    }

    this.cache.set(url, data)
    return data
  }
}
