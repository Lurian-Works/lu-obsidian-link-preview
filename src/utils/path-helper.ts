import { access, stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import z from "zod"
import {
  type DvLink,
  FileUrlSchema,
  type Platform,
  WebURLSchema,
} from "../schema"
import { LuLinkError } from "./helper"

/**
 * Vault Path Representation:
 * - `/` as separator
 * - percent-encoded characters decoded
 * - inside vault: relative to vault root, without seperator at the start
 * - outside vault: absolute file path
 */
export const VaultPathRepresentation = [
  "Folder inside vault/file.md",
  "C:/Folder outside vault/file.md",
] as const

/**
 * all input paths (except for pathHelper.normalize) are expected to be valid paths/path-sections, so dont forget to normalized or validate them
 * output path are normalized
 */
export const pathHelper = {
  /**
   * unified representation:
   * - `/` as separator
   * - percent-encoded characters decoded
   * - duplicate separators removed
   * @example
   * ("C:/Users///\\User/My%20Plugin/npm data.ts") => "C:/Users/User/My Plugin/npm data.ts"
   * ("./My Folder/npm-data/") => "./My Folder/npm-data/"
   * ("My Folder") => "My Folder"
   */
  normalize(input: string): string {
    return (
      decodeURIComponent(input.trim())
        .replaceAll("\\", "/")
        // remove duplicates
        .replace(/\/+/g, "/")
    )
  },

  /**
    * @example
    * ("C:/Users/User/My Plugin/npm data.ts") =>
    * {
        root: 'C:/',
        dir: 'C:/Users/User/My Plugin',
        base: 'npm data.ts',
        ext: '.ts',
        name: 'npm data'
      }
 */
  toObject(inPath: string) {
    return path.parse(inPath)
  },

  async exists(filePath: string) {
    try {
      await access(filePath)
      return true
    } catch {
      return false
    }
  },

  toFileUrl(path: string) {
    return pathToFileURL(path)
  },

  fromFileUrl(url: string | URL) {
    return this.normalize(fileURLToPath(url))
  },

  isAbsolute(inPath: string): boolean {
    return path.isAbsolute(inPath)
  },

  /**
   * checks if a path is a folder - works just for actually existing folders / directories
   */
  async isExistingFolder(path: string) {
    const pathStat = await stat(path)
    return pathStat.isDirectory()
  },

  isInsideFolder(pathToCheck: string, folderPath: string): boolean {
    return this.normalize(pathToCheck).startsWith(
      `${this.normalize(folderPath)}/`,
    )
  },

  /**
   * Check whether a path appears to use the expected platform format.
   */
  isPlatformValid(pathStr: string, platform: Platform): boolean {
    if (platform === "win32") {
      // Windows separators are allowed, but `/` is also accepted by Windows.
      return /^[a-zA-Z]:[\\/]|^\\\\/.test(pathStr)
    }
    // Unix-like paths should not contain Windows drive notation or backslash separators.
    return !/^[a-zA-Z]:[\\/]/.test(pathStr) && !pathStr.includes("\\")
  },
  /**
   * Convert a normalized path to the requested platform format.
   */
  toPlatform(path: string, platform: Platform): string {
    if (platform === "win32") {
      return path.replaceAll("/", "\\")
    }
    return path
  },
}

export const WikiLinkSchema = z.string().regex(/^\[\[[^|\]]+(?:\|[^\]]*)?\]\]$/)
export const MarkdownLinkSchema = z.string().regex(/^\[[^\]]*\]\(([^)]+)\)$/)

export const mdLink = {
  isWikiLink(value: string | undefined): boolean {
    return WikiLinkSchema.safeParse(value).success
  },
  isMarkdownLink(link: string | undefined): boolean {
    return MarkdownLinkSchema.safeParse(link).success
  },
  /**
   * works on wiki and markdown links
   */
  isLink(value: string) {
    return this.isMarkdownLink(value) || this.isWikiLink(value)
  },

  extractWikilinks(text: string) {
    return text.match(/\[[^\]]*\]/g)
  },

  /**
   * @param markdownLink any string containing a valid markdown file link - if the string contains multiple links it will throw an error to prevent data loss. This does not prevent data loss from malformed links
   * @returns a string depending on the input -
   * if extension and folder are missing it just returns the name, so be sure to convert to full path if needed
   *
   * does not support obsidian aliases and anchors in order to support all valid file names/paths
   */
  markdownLinkToPath(markdownLink: string): string | undefined {
    const matches = markdownLink.match(/\[[^\]]*\]\(([^)]+)\)/g)
    if (!matches) {
      return undefined
    }
    if (matches.length > 1) {
      throw new LuLinkError("string contains multiple links")
    }
    const rawPath = matches[0].match(/\[[^\]]*\]\(([^)]+)\)/)?.[1]?.trim()

    const fileUrl = FileUrlSchema.safeParse(rawPath)
    return fileUrl.success ? pathHelper.fromFileUrl(fileUrl.data) : rawPath
  },
  wikiLinkToPath(link: string) {
    const rawPath = link.match(/^\[\[([^|\]]+)(?:\|[^\]]*)?\]\]$/)?.[1]?.trim()
    const fileUrl = FileUrlSchema.safeParse(rawPath)
    return fileUrl.success ? pathHelper.fromFileUrl(fileUrl.data) : rawPath
  },
  /**
   * works on wiki and markdown links
   * throws an error on invalid links so better check it before
   * @returns a vault path
   */
  toPath(link: string): string {
    let result: string | undefined
    if (this.isWikiLink(link)) {
      result = this.wikiLinkToPath(link)
    } else if (this.isMarkdownLink(link)) {
      result = this.markdownLinkToPath(link)
    }
    if (result) {
      return result
    } else throw new LuLinkError("no markdown- or wiki-link signature found")
  },
  parseMarkdownLink(link: string) {
    try {
      const matches = [...link.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)]
      if (matches.length < 1)
        throw new LuLinkError("no markdown- or wiki-link signature found")
      if (matches.length > 1)
        throw new LuLinkError("string contains multiple links")
      const match = matches[0] as RegExpExecArray
      const name = match[1]?.trim()
      const path = match[2]?.trim()
      if (!path) throw new LuLinkError(`no path detected`)
      return {
        named: name,
        path: path,
      }
    } catch (e) {
      throw new LuLinkError("failed parsing markdown-link", {
        cause: e,
      })
    }
  },
  parseWikiLink(link: string) {
    try {
      const matches = [...link.matchAll(/\[\[([^|\]]*)(?:\|(.*)?)?\]\]/g)]
      if (matches.length < 1)
        throw new LuLinkError("no markdown- or wiki-link signature found")
      if (matches.length > 1)
        throw new LuLinkError("string contains multiple links")
      const match = matches[0] as RegExpExecArray
      const path = match[1]?.trim()
      const name = match[2]?.trim()
      if (!path) throw new LuLinkError(`no path detected`)
      return {
        named: name,
        path: path,
      }
    } catch (e) {
      throw new LuLinkError("failed parsing wikilink", {
        cause: e,
      })
    }
  },
  parse(link: string) {
    try {
      const type = this.isWikiLink(link)
        ? "wiki"
        : this.isMarkdownLink(link)
          ? "md"
          : undefined
      if (!type)
        throw new LuLinkError("no markdown- or wiki-link signature found")
      return {
        path: this.toPath(link),
        named:
          type === "md"
            ? this.parseMarkdownLink(link).named
            : this.parseWikiLink(link).named,
        type,
      }
    } catch (e) {
      throw new LuLinkError(`failed parsing link`, { cause: e })
    }
  },
}

export class PathUtils {
  constructor(
    private readonly vaultRoot: string,
    private readonly defaultLinkFormat?: "WikiLink" | "MarkdownLink",
  ) {}
  /**
   * @param path - vault or absolute path
   * @returns vault path {@link VaultPathRepresentation}
   * @example
   * ("C:/Users/User/My Plugin/npm data.ts") => "C:/Users/User/My Plugin/npm data.ts"
   * ("/Folder/npm data.ts") => "/Folder/npm data.ts"
   * ("C:/Vault Root/Folder/file") => "Folder/file"
   */
  toVaultPath(path: string) {
    const normalizedFull = this.toFullPath(path)
    const normalizedRoot = pathHelper.normalize(this.vaultRoot)

    if (!normalizedFull.startsWith(normalizedRoot)) return path
    return normalizedFull.slice(normalizedRoot.length).replace(/^\/+/, "")
  }

  /**
   *
   * @param inPath any path, can also be a folder path
   * @returns absolute path either unchanged or with vault root if it was relative
   */
  toFullPath(inPath: string) {
    const normPath = pathHelper.normalize(inPath)
    if (pathHelper.isAbsolute(normPath)) return normPath
    return pathHelper.normalize(path.join(this.vaultRoot, normPath))
  }

  pathToWikiLink(filePath: string) {
    const fileName = pathHelper.toObject(filePath).name
    return `[[${this.toVaultPath(filePath)}|${fileName}]]`
  }

  pathToMarkdownLink(path: string) {
    const file = pathHelper.toObject(this.toVaultPath(path))
    if (file.dir === "") {
      return file.ext === ""
        ? `[${file.name}](${file.name})`
        : `[${file.name}](${file.name}${file.ext})`
    } else {
      return file.ext === ""
        ? `[${file.name}](${file.dir}/${file.name})`
        : `[${file.name}](${file.dir}/${file.name}${file.ext})`
    }
  }

  /**
   * @param linkFormat overwrites the defaultLinkFormat of the parent class if set. default falls back to Wikilink since obsidian behaves kinda strange with md links sometimes
   * @returns
   */
  pathToLink(path: string, linkFormat?: "WikiLink" | "MarkdownLink") {
    this.defaultLinkFormat
    if (linkFormat === "MarkdownLink") {
      return this.pathToMarkdownLink(path)
    }
    return this.pathToWikiLink(path)
  }

  /**
   * @param input vaultPath, absolutePath, fileUrl, webUrl or wiki/markdown-link containing one of those
   * @returns vaulPathRepresentation or webUrl
   */
  parseInputString(input: string): {
    path: string
    named?: string
    type: "webUrl" | "localPath"
  } {
    const isMdOrWiki = mdLink.isLink(input)
    const parsedLink = isMdOrWiki ? mdLink.parse(input) : undefined

    const path = parsedLink ? parsedLink.path : input
    const webUrl = WebURLSchema.safeParse(path)
    if (webUrl.success) {
      return {
        path: webUrl.data,
        type: "webUrl",
        named: parsedLink ? parsedLink.named : undefined,
      }
    }
    const fileUrl = FileUrlSchema.safeParse(path)
    const rawPath = fileUrl.success
      ? pathHelper.fromFileUrl(fileUrl.data)
      : path
    const vaultFormat = this.toVaultPath(rawPath)
    return {
      path: vaultFormat,
      type: "localPath",
      named: parsedLink ? parsedLink.named : undefined,
    }
  }

  /**
   * @param extension default = ".md"
   * @reaturns Full file path. Adds incremental suffix if filename already exists in folder.
   */
  async getUniqueFilePath(
    folder: string,
    baseName: string,
    extension: string = ".md",
  ) {
    let index = 1

    let filePath = this.toFullPath(
      pathHelper.normalize(path.join(folder, `${baseName}${extension}`)),
    )
    while (await pathHelper.exists(filePath)) {
      filePath = pathHelper.normalize(
        path.join(folder, `${baseName} ${index}${extension}`),
      )
      index++
    }
    return filePath
  }

  /**
   * @param propVal can be a string path, string wikilink, string markdown link or a dataview link object
   * returns the value unchanged if its not a link-string or link-object
   */
  resolveYamlPath(propVal: string | DvLink) {
    if (typeof propVal === "object" && "path" in propVal) {
      const path = mdLink.isLink(propVal.path)
        ? mdLink.toPath(propVal.path)
        : FileUrlSchema.safeParse(propVal.path).success
          ? pathHelper.fromFileUrl(propVal.path)
          : propVal.path
      return this.toVaultPath(path)
    }
    const path = mdLink.isLink(propVal)
      ? mdLink.toPath(propVal)
      : FileUrlSchema.safeParse(propVal).success
        ? pathHelper.fromFileUrl(propVal)
        : propVal
    return this.toVaultPath(path)
  }

  isVaultPath(inPath: string): boolean {
    const normPath = pathHelper.normalize(inPath)
    if (!normPath) return false

    const fullFile = pathHelper.toObject(this.toFullPath(normPath))
    if (
      pathHelper.isInsideFolder(fullFile.dir, this.vaultRoot)
      || fullFile.dir === this.vaultRoot
    )
      return true
    if (/[<>:"|?*]/.test(normPath) || normPath.startsWith("/")) return false
    return normPath
      .split("/")
      .every(
        part =>
          part.length > 0
          && part !== "."
          && part !== ".."
          && !part.endsWith("."),
      )
  }
}
