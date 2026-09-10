import z from "zod"
import type { JsonStore } from "../repository/json-store"
import { deepUpdate, LuLinkError, luLinkMessage } from "../utils/helper"

export const UiSettingsSchema = z.object({
  showHost: z.boolean().optional(),
  showImage: z.boolean().optional(),
  showDescription: z.boolean().optional(),
  /*
  size: z
    .object({
      // size units are in em
      maxHeight: z.number().optional(),
      maxWidth: z.number().optional(),
    })
    .optional(),
    */
})
export const LinkCardSettingSchema = z.object({
  enableDevApi: z.boolean().optional(),
  allowOutsideVault: z.boolean().optional(),
  alwaysResolveVaultPathsToFile: z.boolean().optional(),
  ui: UiSettingsSchema.optional(),
  /*quads: UiSettingsSchema.optional(),
  rows: UiSettingsSchema.optional(),
  color: z
    .object({
      link: HexColorSchema,
      folder: HexColorSchema,
      file: HexColorSchema,
    })
    .optional(),
    */
})

export type LinkCardSettings = z.infer<typeof LinkCardSettingSchema>

export class ConfigManager {
  private settingsData: LinkCardSettings
  private constructor(
    private readonly storage: JsonStore,
    readonly storageId: string,
    data?: LinkCardSettings,
  ) {
    this.settingsData = data || {}
  }
  get data() {
    return { ...this.settingsData }
  }
  set data(settings: LinkCardSettings) {
    LinkCardSettingSchema.parse(settings)
    this.settingsData = settings
  }
  update(settings: LinkCardSettings) {
    LinkCardSettingSchema.parse(settings)
    this.settingsData = deepUpdate(this.settingsData, settings)
    this.save()
  }
  save() {
    try {
      if (!this.settingsData) return
      const parsed = LinkCardSettingSchema.safeParse(this.settingsData)
      if (parsed.success) {
        if (Object.keys(parsed.data).length < 1) return
        this.storage.save(this.storageId, parsed.data)
      } else {
        throw new Error(`malformed runtime data`)
      }
    } catch (e) {
      throw new LuLinkError(`failed saving settings`, { cause: e })
    }
  }
  static async init(store: JsonStore, storageId: string) {
    const stored = await store.get(storageId)
    if (!stored) {
      luLinkMessage(`No Config found - proceeded with default config`)
      const data = {}
      return new ConfigManager(store, storageId, data)
    }

    const parsed = LinkCardSettingSchema.safeParse(stored)
    if (parsed.success) {
      const data = parsed.data
      return new ConfigManager(store, storageId, data)
    }
    luLinkMessage(`stored settings invalid`)
    const data = {}
    return new ConfigManager(store, storageId, data)
  }
}
