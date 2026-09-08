import z from "zod"

/**
 * supports all types of urls including file url and uri
 */
export const URLSchema = z.url()
export type UrlString = z.infer<typeof URLSchema>

export const WebURLSchema = z.httpUrl()
export type WebUrl = z.infer<typeof WebURLSchema>

export const FileUrlSchema = z
  .url()
  .refine(url => new URL(url).protocol === "file:", "not a valid file URL")
export type FileUrl = z.infer<typeof FileUrlSchema>

export const OgpDataSchema = z.object({
  url: z.string(),
  title: z.string(),
  siteName: z.string(),
  description: z.string().optional(),
  image: z.string().optional(),
})

export type OgpData = z.infer<typeof OgpDataSchema>

export const HexColorSchema = z
  .string()
  .regex(
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
    "Invalid hex color",
  )

/**
 * title, description and color will overwrite the global settings or OGP Data
 * keys have to be lowerkase completely in order to simplify parsing raw text block inputs
 */
export const LinkObjectSchema = z.object({
  path: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  hostname: z.string().optional(),
})
export type LinkInputObject = z.infer<typeof LinkObjectSchema>

export const RenderOptionsSchema = z.object({
  layout: z.enum(["row", "quad"]).optional(),
})

type renderLinkBlock = (
  items: LinkInputObject | string | (LinkInputObject | string)[],
  options?: z.infer<typeof RenderOptionsSchema>,
) => HTMLDivElement

const LinkCardSettingSchema = z.object({
  enableDevApi: z.boolean().optional(),
  allowOutsideVault: z.boolean(),
  alwaysResolveVaultPathsToFile: z.boolean().optional(),
  // deactivate all js styling and fall back to css in order to make styling completely css dependent
  cssMode: z.boolean(),
  quads: z.object({
    showImage: z.boolean(),
    showDescription: z.enum(["all", "none", "link", "files"]),
    showTitle: z.boolean(),
  }),
  rows: z.object({
    showImage: z.boolean(),
    showDescription: z.enum(["all", "none", "link", "files"]),
    size: {
      // size units are in em
      maxHeight: z.number(),
      maxWidth: z.number(),
    },
  }),
  color: z.object({
    link: HexColorSchema,
    folder: HexColorSchema,
    file: HexColorSchema,
  }),
})

export type LinkCardSettings = z.infer<typeof LinkCardSettingSchema>
