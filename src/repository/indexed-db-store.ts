import Dexie, { type EntityTable } from "dexie"
import { type OgpData, OgpDataSchema } from "../schema"
import { LuLinkError } from "../utils/helper"

export class LuLinkDb extends Dexie {
  ogpData!: EntityTable<OgpDataEntry, "url">
  iconCache!: EntityTable<IconCacheEntry, "id">

  constructor() {
    super("LuLinkDb")
    this.version(1).stores({
      ogpData: "url, siteName",
      iconCache: "id, createdAt",
    })
  }
}

export interface OgpDataEntry extends OgpData {
  createdAt: number
}

export class OgpStore {
  ogpData: Map<string, OgpDataEntry> = new Map()
  constructor(private readonly db: LuLinkDb) {}

  add = (ogpData: OgpData) => {
    try {
      const valid = OgpDataSchema.safeParse(ogpData)
      const entry = { ...ogpData, createdAt: Date.now() }
      if (valid.success) {
        this.ogpData.set(ogpData.url, entry)
        this.db.ogpData.add(entry)
      } else {
        throw new LuLinkError(`invalid ogpData`, { cause: valid.error })
      }
    } catch (e) {
      throw new LuLinkError(`failed adding ogpData`, { cause: e })
    }
  }

  get = async (url: string) => {
    const cached = this.ogpData.get(url)
    if (cached) return cached
    const data = await this.db.ogpData.get(url)
    if (data) this.ogpData.set(url, data)
    return data
  }
  clear = async () => {
    this.ogpData.clear()
    await this.db.ogpData.clear()
  }
}

export interface IconCacheEntry {
  id: string
  image: Blob
  createdAt: number
}

export class IconStore {
  iconCache: Map<string, IconCacheEntry> = new Map()
  constructor(private readonly db: LuLinkDb) {}

  add = async (data: { path: string; imageUrl: string }) => {
    const blob = await fetch(data.imageUrl).then(response => response.blob())
    const entry = { id: data.path, image: blob, createdAt: Date.now() }
    this.iconCache.set(entry.id, entry)
    await this.db.iconCache.add(entry)
    return entry
  }

  get = async (id: string) => {
    const cached = this.iconCache.get(id)
    if (cached) return cached
    const data = await this.db.iconCache.get(id)
    if (data) this.iconCache.set(id, data)
    return data
  }

  clear = async () => {
    this.iconCache.clear()
    await this.db.iconCache.clear()
  }
}
