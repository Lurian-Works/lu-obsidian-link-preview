import type { LinkInputObject, OgpData } from "./schema"
import { getOpenGraphData } from "./utils/helper"
import { type PathUtils, pathHelper } from "./utils/path-helper"

export class DataManager {
  constructor(private readonly pathUtils: PathUtils) {}

  private cache = new Map<string, OgpData>()

  /**
   * @param path file url/path or web url
   */
  async getPathData(path: string): Promise<LinkInputObject> {
    const parsedPath = this.pathUtils.parseInputString(path)
    if (parsedPath.type === "webUrl") {
      const ogData = await getOpenGraphData(parsedPath.path)
      return {
        path: parsedPath.path,
        title: ogData.title,
        hostname: ogData.siteName,
        description: ogData.description,
        image: ogData.image,
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
