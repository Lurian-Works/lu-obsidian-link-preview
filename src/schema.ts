import z from "zod"

export const URLSchema = z.httpUrl()

export const OgpDataSchema = z.object({
  url: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  siteName: z.string().optional(),
})

export type OgpData = {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
}

export const HexColorSchema = z
  .string()
  .regex(
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
    "Invalid hex color",
  )

/**
 * title, description and color will overwrite the global settings or OGP Data
 */
const LinkInputObjectSchema = z.object({
  path: z.string(),
  description: z.string().optional(),
  title: z.string().optional(),
  color: z.string().optional(),
})
type LinkInputObject = z.infer<typeof LinkInputObjectSchema>

const RenderOptionsSchema = z.object({
  layout: z.enum(["row", "quad"]).optional(),
  color: HexColorSchema.optional(),
})

type renderLinkBlock = (
  items: LinkInputObject | string | (LinkInputObject | string)[],
  options?: z.infer<typeof RenderOptionsSchema>,
) => HTMLDivElement

const LinkSettingsSchema = z.object({
  allowOutsideVault: z.boolean(),
  // deactivate all js styling and fall back to css in order to make styling completely css dependent
  cssMode: z.boolean(),
  cards: z.object({
    showImage: z.boolean(),
    showDescription: z.enum(["all", "none", "link", "files"]),
    showTitle: z.boolean(),
  }),
  rows: {
    showImage: z.boolean(),
    showDescription: z.enum(["all", "none", "link", "files"]),
    size: {
      // size units are in em
      maxHeight: z.number(),
      maxWidth: z.number(),
    },
  },
  color: z.object({
    link: HexColorSchema,
    folder: HexColorSchema,
    file: HexColorSchema,
  }),
})
