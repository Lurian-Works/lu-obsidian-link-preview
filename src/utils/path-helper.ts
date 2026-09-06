import { access, stat } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

/**
 * Vault Path Representation:
 * - `/` as separator
 * - percent-encoded characters decoded
 * - inside vault: relative to vault root
 * - outside vault: absolute file path
 */
export const vaultPathRepresentation = "Folder inside vault/file.md"

type Platform = NodeJS.Platform

const currentPlatform = os.platform()

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
    return decodeURIComponent(input).replaceAll("\\", "/").replace(/\/+/g, "/")
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

  toFileUrl(path: string): string {
    return pathToFileURL(path).pathname
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
  toPlatform(normalized: string, platform: Platform): string {
    if (platform === "win32") {
      return normalized.replaceAll("/", "\\")
    }
    return normalized
  },
}

export const mdLink = {
  isWikiLink(value: string | undefined): boolean {
    return /^\[\[[^|\]]+(?:\|[^\]]*)?\]\]$/.test(value ?? "")
  },
  isMarkdownLink(link: string | undefined): boolean {
    return link?.match(/^\[[^\]]*\]\(([^)]+)\)$/) !== null
  },
  /**
   * works on wiki and markdown links
   */
  isLink(value: string) {
    if (this.isMarkdownLink(value)) return true
    if (this.isWikiLink(value)) return true
    return false
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
      throw new Error("string contains multiple links")
    }
    return matches[0].match(/\[[^\]]*\]\(([^)]+)\)/)?.[1]
  },
  wikiLinkToPath(link: string) {
    return link
      .match(/^\[\[([^|\]]+)(?:\|[^\]]*)?\]\]$/)?.[1]
      ?.trim()
      .replace(/^(?:\.\.\/)+/, "")
  },
  /**
   * works on wiki and markdown links
   * throws an error on invalid links so better check it before
   * @returns a vault path
   */
  toPath(link: string): string {
    if (!link) return link
    let result: string | undefined
    if (this.isWikiLink(link)) {
      result = this.wikiLinkToPath(link.replace(/^(?:\.\.\/)+/, ""))
    } else if (this.isMarkdownLink(link)) {
      result = this.markdownLinkToPath(link.replace(/^(?:\.\.\/)+/, ""))
    }
    if (result) {
      return result
    } else throw new Error("no markdown- or wiki-link signature found")
  },
}

export class PathUtils {
  constructor(
    private readonly vaultRoot: string,
    private readonly defaultLinkFormat?: "WikiLink" | "MarkdownLink",
  ) {}
  /**
   * @param path - vault or absolute path
   * @returns vault path representation
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
        ? `[${file.name}](${file.name}.md)`
        : `[${file.name}](${file.name}${file.ext})`
    } else {
      return file.ext === ""
        ? `[${file.name}](${file.dir}/${file.name}.md)`
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
  resolveYamlPath(propVal: string | { path: string; [key: string]: unknown }) {
    if (typeof propVal === "object" && "path" in propVal) {
      return this.toVaultPath(pathHelper.normalize(propVal.path))
    }
    return mdLink.isLink(propVal) ? mdLink.toPath(propVal) : propVal
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
