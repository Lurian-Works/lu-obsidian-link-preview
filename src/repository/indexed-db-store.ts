import Dexie, { type EntityTable } from "dexie"
import { type OgpData, OgpDataSchema } from "../schema"
import { LuLinkError } from "../utils/helper"

export class LuLinkDb extends Dexie {
  ogpData!: EntityTable<OgpData, "url">

  constructor() {
    super("LuLinkDb")
    this.version(1).stores({
      ogpData: "url, siteName",
    })
  }
}

export class OgpStore {
  ogpData: Map<string, OgpData> = new Map()
  constructor(private readonly db: LuLinkDb) {}

  add(ogpData: OgpData) {
    try {
      const valid = OgpDataSchema.safeParse(ogpData)
      if (valid.success) {
        this.ogpData.set(ogpData.url, ogpData)
        this.db.ogpData.add(ogpData)
      } else {
        throw new LuLinkError(`invalid ogpData`, { cause: valid.error })
      }
    } catch (e) {
      throw new LuLinkError(`failed adding ogpData`, { cause: e })
    }
  }

  async get(url: string) {
    const cached = this.ogpData.get(url)
    if (cached) return cached
    const data = await this.db.ogpData.get(url)
    if (data) this.ogpData.set(url, data)
    return data
  }
  async clear() {
    this.ogpData.clear()
    await this.db.ogpData.clear()
  }
}
