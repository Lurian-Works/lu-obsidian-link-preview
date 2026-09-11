import type { RequestUrlParam, RequestUrlResponsePromise } from "obsidian"
import type { OgpStore } from "./repository/indexed-db-store"
import {
  type LinkInputObject,
  LinkInputObjectSchema,
  type LinkObject,
  type OgpData,
} from "./schema"
import {
  getHtmlMeta,
  getHtmlTitle,
  LuLinkError,
  toAbsoluteUrl,
} from "./utils/helper"
import { type PathUtils, pathHelper } from "./utils/path-helper"
import type { RegexFlag } from "./utils/text-helper"
import { textHelper as txt } from "./utils/text-helper"

export class DataManager {
  constructor(
    private readonly deps: {
      readonly pathUtils: PathUtils
      readonly ogpStore: OgpStore
      readonly blockParser: typeof linkBlockParser
      readonly inlineParser: InlineLinkParser
      readonly requestUrl: (
        request: string | RequestUrlParam,
      ) => RequestUrlResponsePromise
    },
  ) {}

  /**
   *
   * @param path path, url or wiki/markdown-link containing those
   * @returns full LinkObjectData
   */
  async getLinkData(path: string): Promise<LinkObject> {
    const parsedPath = this.deps.pathUtils.parseInputString(path)
    if (parsedPath.type === "webUrl") {
      const stored = await this.deps.ogpStore.get(parsedPath.path)
      const ogpData = stored || (await this.getOpenGraphData(parsedPath.path))
      if (!stored) {
        this.deps.ogpStore.add(ogpData)
      }
      return {
        path: parsedPath.path,
        title: parsedPath.named || ogpData.title,
        hostname: ogpData.siteName,
        description: ogpData.description,
        image: ogpData.image,
      }
    } else {
      const pathData = pathHelper.toObject(parsedPath.path)
      return {
        path: parsedPath.path,
        title: parsedPath.named || pathData.name,
        hostname: `local - ${pathData.base}`,
      }
    }
  }

  /**
   * @param text full text of LuLink codeblock
   * @returns full LinkObject - options from the codeblock will have the highest priority and overwrite ogpData and fallbacks
   */
  async getBlockData(text: string): Promise<LinkObject[]> {
    const finalData: LinkObject[] = []
    const inputs = this.deps.blockParser.getData(text)
    inputs.forEach(async input => {
      const data = await this.getLinkData(input.path)
      const result = {
        path: data.path,
        title: input.title || data.title,
        description: input.description || data.description,
        hostname: input.hostname || data.hostname,
        image: input.image || data.image,
      }
      finalData.push(result)
    })
    return finalData
  }
  async getOpenGraphData(url: string): Promise<OgpData> {
    const response = await this.deps.requestUrl({
      url,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 Obsidian LuLink Plugin",
      },
    })

    const html = response.text

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
}

export class InlineLinkParser {
  constructor(private readonly id: string) {}
  regex(flag?: RegexFlag) {
    return InlineLinkParser.regex(this.id, flag)
  }
  findLinkSections(text: string) {
    return InlineLinkParser.findLinkSections(text, this.id)
  }
  getLinkValues(input: string) {
    return InlineLinkParser.getLinkValues(input)
  }
  /**
   *
   * @param id for example "LuLink"
   * which would apply to "[(LuLink: anything...)]"
   * with the value as a group which is everything after id:
   */
  static regex(id: string, flag?: RegexFlag) {
    return new RegExp(
      `\\[\\s*\\(\\s*${id}\\s*:\\s*([\\s\\S]*?)\\s*\\)\\s*\\]`,
      flag,
    )
  }
  static findLinkSections(text: string, id: string) {
    return text.matchAll(InlineLinkParser.regex(id, "g"))
  }
  /**
   *
   * @param input accepts a comma seperated string of values inside double quotes
   * @example (`"[[ C:User/My Plugin/npm data.ts | bla ]]" , "{bla: {} }"`) => [`[[ C:User/My Plugin/npm data.ts | bla ]]`, `{bla: {} }`]
   * opposite of string[].map(s => `"${s}"`).join(",")
   */
  static getLinkValues(input: string): string[] {
    const values: string[] = []
    let current = ""
    let inQuotes = false

    for (const char of input) {
      if (char === '"') {
        inQuotes = !inQuotes
        continue
      }
      if (char === "," && !inQuotes) {
        values.push(current.trim())
        current = ""
        continue
      }
      current += char
    }
    if (current.trim()) {
      values.push(current.trim())
    }

    return values
  }
}

export const linkBlockParser = {
  /**
   * return the input as structured object and validates the type
   * does NOT do validation or normalization of paths or anything else
   */
  getData(text: string) {
    const validEntries: LinkInputObject[] = []
    const errors: Error[] = []
    try {
      const tuples = txt.findKeyValuePairs(text)
      const unqObjects = this.groupLinkOptions(tuples)
      unqObjects.forEach(data => {
        const parsed = LinkInputObjectSchema.safeParse(data)
        if (parsed.success) {
          validEntries.push()
        } else {
          errors.push(
            new LuLinkError(`invalid parsed data`, {
              cause: parsed.error,
            }),
          )
        }
      })

      if (errors) {
        console.error(
          `failed parsing ${errors.length} of ${unqObjects.length} inputs.`,
          ...errors,
        )
      }
      return validEntries
    } catch (e) {
      throw new LuLinkError(`failed parsing text block input`, { cause: e })
    }
  },
  groupLinkOptions(rawTuples: [string, string][]) {
    let i = 0

    const result: Record<string, string>[] = []

    while (rawTuples[i]?.[0] === "path") {
      const pathTuple = rawTuples[i]
      const pathOptions: ([string, string] | undefined)[] = []
      i++
      while (rawTuples[i]?.[0] !== "path") {
        pathOptions.push(rawTuples[i])
        i++
      }
      if (pathTuple) {
        result.push(
          Object.fromEntries([
            pathTuple,
            ...pathOptions.filter(p => p !== undefined),
          ]),
        )
      }
    }
    return result
  },
}
