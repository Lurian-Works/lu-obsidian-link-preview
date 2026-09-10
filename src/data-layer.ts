import { type LinkInputObject, type OgpData } from "./schema"

import { getOpenGraphData } from "./utils/helper"
import { type PathUtils, pathHelper } from "./utils/path-helper"

interface ogpDataStore {
  add(ogpData: OgpData): void
  get(url: string): Promise<OgpData | undefined>
}

export class LuLinkCardManager {
  constructor(
    private readonly pathUtils: PathUtils,
    private readonly ogpStore: ogpDataStore,
    private readonly blockParser: LinkBlockParser,
    private readonly inlineParser: inlineLinkParser,
  ) {}
  async parseBlockText(text: string): Promise<LinkInputObject[]> {
    const finalData: LinkInputObject[] = []
    const inputs = linkBlockParser.getData(text)
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
