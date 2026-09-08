import { type LinkInputObject, LinkObjectSchema, type OgpData } from "./schema"
import { getOpenGraphData, LuLinkError } from "./utils/helper"
import { type PathUtils, pathHelper } from "./utils/path-helper"
import { textHelper as txt } from "./utils/text-helper"

interface ogpDataStore {
  add(ogpData: OgpData): void
  get(url: string): Promise<OgpData | undefined>
}

export class LuLinkCardManager {
  constructor(
    private readonly pathUtils: PathUtils,
    private readonly ogpStore: ogpDataStore,
  ) {}
  async getBlockData(text: string): Promise<LinkInputObject[]> {
    const finalData: LinkInputObject[] = []
    const inputs = DataParser.getTextBlockData(text)
    inputs.forEach(async input => {
      const data = await this.getLinkData(input.path)
      const result: LinkInputObject = {
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

  private async getLinkData(path: string): Promise<LinkInputObject> {
    const parsedPath = this.pathUtils.parseInputString(path)
    if (parsedPath.type === "webUrl") {
      const stored = await this.ogpStore.get(parsedPath.path)
      const ogpData = stored || (await getOpenGraphData(parsedPath.path))
      if (!stored) {
        this.ogpStore.add(ogpData)
      }
      return {
        path: parsedPath.path,
        title: ogpData.title,
        hostname: ogpData.siteName,
        description: ogpData.description,
        image: ogpData.image,
      }
    } else {
      const pathData = pathHelper.toObject(parsedPath.path)
      return {
        path: parsedPath.path,
        title: pathData.name,
        hostname: `local - ${pathData.base}`,
      }
    }
  }
}

const DataParser = {
  /**
   * @param path file url/path or web url
   */
  /**
   * return the input as structured object and validates the type
   * does NOT do validation or normalization of paths or anything else
   */
  getTextBlockData(text: string) {
    const validEntries: LinkInputObject[] = []
    const errors: Error[] = []
    try {
      const tuples = txt.findKeyValuePairs(text)
      const unqObjects = this.groupLinkOptions(tuples)
      unqObjects.forEach(data => {
        const parsed = LinkObjectSchema.safeParse(data)
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
