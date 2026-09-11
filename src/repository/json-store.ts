import * as fs from "node:fs/promises"
import { LuLinkError } from "../utils/helper"
import { pathHelper } from "../utils/path-helper"

export class JsonStore {
  private constructor(public basePath: string) {}
  static async init(storageRoot: string) {
    const basePath = `${storageRoot}/json-store`
    await fs.mkdir(basePath, { recursive: true })
    return new JsonStore(basePath)
  }

  async get(
    id: string,
    reviver?: (this: unknown, key: string, value: unknown) => unknown,
  ) {
    const path = this.idToPath(id)
    if (await pathHelper.exists(path)) {
      const raw = await fs.readFile(path, "utf8")
      return JSON.parse(raw, reviver)
    }
    return undefined
  }

  async save(id: string, data: unknown) {
    try {
      const filePath = this.idToPath(id)
      if (!(await pathHelper.exists(filePath))) {
        fs.mkdir(filePath, { recursive: true })
      }
      await fs.writeFile(this.idToPath(id), JSON.stringify(data, null, 2))
    } catch (e) {
      throw new LuLinkError(`failed saving file`, { cause: e })
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await fs.unlink(this.idToPath(id))
    } catch (e) {
      throw new LuLinkError(`failed deleting file`, { cause: e })
    }
  }

  idToPath(id: string) {
    return `${this.basePath}/${pathHelper.normalize(id)}.json`
  }
}
