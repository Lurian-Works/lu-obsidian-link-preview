import * as fs from "node:fs/promises"
import { LuLinkError } from "../utils/helper"
import { pathHelper } from "../utils/path-helper"

export class JsonStore {
  basePath
  constructor(deps: {
    storageRoot: string
  }) {
    this.basePath = `${deps.storageRoot}/json-store`
  }

  async get(
    id: string,
    reviver?: (this: unknown, key: string, value: unknown) => unknown,
  ) {
    const raw = await fs.readFile(this.idToPath(id), "utf8")
    return JSON.parse(raw, reviver)
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
