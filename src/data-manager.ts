import type { RequestUrlParam, RequestUrlResponsePromise } from "obsidian"
import type { FileSystemAdapter } from "./environment/electron-adapter"
import type { OgpStore } from "./repository/indexed-db-store"
import {
  type LinkInputObject,
  LinkInputObjectSchema,
  type LinkObject,
  type OgpData,
} from "./schema"
import { luDebug } from "./utils/debug"
import {
  getHtmlMeta,
  getHtmlTitle,
  LuLinkError,
  toAbsoluteUrl,
} from "./utils/helper"
import { type PathUtils, pathHelper } from "./utils/path-helper"
import type { RegexFlag } from "./utils/text-helper"
import { textHelper as txt } from "./utils/text-helper"

const dmDebug = luDebug("DataManager")

export class DataManager {
  constructor(
    private readonly deps: {
      readonly pathUtils: PathUtils
      readonly ogpStore: OgpStore
      readonly blockParser: typeof linkBlockParser
      readonly inlineParser: InlineLinkParser
      readonly electronFs: FileSystemAdapter
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
    const fooDebug = dmDebug.extend("getLinkData")
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
      let image: string | undefined

      try {
        image = (await this.deps.electronFs.getFileIcon(path)).toDataURL()
      } catch (e) {
        fooDebug(`failed getting image from path, cause:`, e)
      }
      const pathData = pathHelper.toObject(parsedPath.path)
      return {
        path: parsedPath.path,
        title: parsedPath.named || pathData.name,
        hostname: `local - ${pathData.base}`,
        image: image,
      }
    }
  }

  /**
   * @param text full text of LuLink codeblock
   * @returns full LinkObject - options from the codeblock will have the highest priority and overwrite ogpData and fallbacks
   */
  async getBlockData(text: string): Promise<LinkObject[]> {
    const gbdDebug = dmDebug.extend("getBlockData")
    gbdDebug(`input: ${text}`)

    const finalData: LinkObject[] = []
    const blockData = this.deps.blockParser.getData(text)
    gbdDebug(`blockData: ${JSON.stringify(blockData)}`)
    let i = 0
    for (const inputObject of blockData) {
      i++
      const data = await this.getLinkData(inputObject.path)
      gbdDebug(`linkData${i}: ${finalData}`)
      const result = {
        path: data.path,
        title: inputObject.title || data.title,
        description: inputObject.description || data.description,
        hostname: inputObject.hostname || data.hostname,
        image: inputObject.image || data.image,
      }
      gbdDebug(`result${i}: ${JSON.stringify(result)}`)
      finalData.push(result)
    }

    gbdDebug(`finalData: ${JSON.stringify(finalData)}`)

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
  static getLinkValues(input: string) {
    const fooDebug = dmDebug.extend("getLinkValues")
    fooDebug(`input: ${input}`)

    const matchedVals = [...input.matchAll(/"\s?([^|"]*)\|?([^"]*)?"/g)]

    fooDebug(`matchedvals: ${matchedVals}`)

    const mappedValues = matchedVals
      .map(v => {
        return {
          path: v[1]?.trim(),
          name: v[2]?.trim(),
        }
      })
      .filter(v => Boolean(v.path))
      .map(v => {
        return { path: v.path, name: v.name ? v.name : undefined }
      }) as {
      path: string
      name: string | undefined
    }[]

    fooDebug(`mappedValues`, mappedValues)
    const output = mappedValues.filter(v => v.path !== undefined)

    fooDebug(`parsedValues: ${matchedVals}`)
    fooDebug(`output: ${output}`)
    return output
  }
}

const lbpDebug = dmDebug.extend("linkBlockParser")

export const linkBlockParser = {
  /**
   * return the input as structured object and validates the type
   * does NOT do validation or normalization of paths or anything else
   */
  getData(text: string) {
    try {
      const fooDebug = lbpDebug.extend("getData")
      fooDebug(`input: ${text}`)

      const validEntries: LinkInputObject[] = []
      const errors: Error[] = []
      const tuples = txt.findKeyValuePairs(text)
      fooDebug(`tuples: ${tuples}`)
      const unqObjects = this.groupLinkOptions(tuples)
      fooDebug(`unqObjects: ${JSON.stringify(unqObjects)}`)
      unqObjects.forEach(data => {
        const parsed = LinkInputObjectSchema.safeParse(data)
        if (parsed.success) {
          validEntries.push(parsed.data)
        } else {
          errors.push(
            new LuLinkError(`invalid parsed data`, {
              cause: parsed.error,
            }),
          )
        }
      })

      if (errors.length > 0) {
        console.error(
          `failed parsing ${errors.length} of ${unqObjects.length} inputs.`,
          ...errors,
        )
      }
      fooDebug(`validEntries: ${JSON.stringify(validEntries)}`)

      return validEntries
    } catch (e) {
      throw new LuLinkError(`failed parsing text block input`, { cause: e })
    }
  },
  groupLinkOptions(rawTuples: [string, string][]) {
    const fooDebug = lbpDebug.extend("getData")
    fooDebug(`input:`, rawTuples)

    let i = 0

    const result: Record<string, string>[] = []

    while (rawTuples[i]?.[0] === "path") {
      const pathTuple = rawTuples[i]
      fooDebug(`pathTuple:`, pathTuple)
      const pathOptions: ([string, string] | undefined)[] = []
      i++
      while (rawTuples[i]?.[0] !== "path" && i < rawTuples.length) {
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
    fooDebug(`result: ${result}`)
    return result
  },
}
