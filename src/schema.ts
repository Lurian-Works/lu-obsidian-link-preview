import z from "zod"

export type Platform = NodeJS.Platform

/**
 * supports all types of urls including file url and uri
 */
export const URLSchema = z.url()
export type UrlString = z.infer<typeof URLSchema>

export const WebURLSchema = z.httpUrl()
export type WebUrl = z.infer<typeof WebURLSchema>

export const FileUrlSchema = z.url().refine(url => {
  if (!url.trim().startsWith("file:")) {
    return false
  }
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}, "not a valid file URL")
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
export const LinkInputObjectSchema = z.object({
  path: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  hostname: z.string().optional(),
})
export type LinkInputObject = z.infer<typeof LinkInputObjectSchema>

export const LinkObjectSchema = LinkInputObjectSchema.required({
  title: true,
  hostname: true,
})
export type LinkObject = z.infer<typeof LinkObjectSchema>

export interface DvLink {
  path: string
}
