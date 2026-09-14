import { readdir, stat } from "node:fs/promises"
import path from "node:path"
import type { ElectronFs } from "../environment/electron-adapter"
import type { WindowsAdapter } from "../environment/windows-adapter"
import type { Platform } from "../schema"
import { pathHelper } from "../utils/path-helper"

export class LuLinkFsAdapter {
  constructor(
    private readonly deps: {
      readonly platform: Platform
      readonly electronFs: ElectronFs
      readonly windows: WindowsAdapter
    },
  ) {}
  /**
   *
   * @returns data url
   */
  async getFileIcon(path: string) {
    let image: string | undefined
    try {
      image = (await this.deps.electronFs.createFileThumbnail(path)).toDataURL()
    } catch {}
    if (!image) {
      try {
        image = (await this.deps.windows.getFileIcon(path)) ?? undefined
      } catch {}
    }
    return image
  }

  async pathInfo(path: string): Promise<PathInfo> {
    const childPathInfo = pathHelper.toObject(path)
    const childStat = await stat(path)

    const simple = {
      name: childPathInfo.name,
      path,
      isDirectory: childStat.isDirectory(),
      isFile: childStat.isFile(),
      mtime: childStat.mtime,
      ctime: childStat.ctime,
      size: childStat.size,
    }
    if (simple.isDirectory) {
      return {
        ...simple,
        isDir: true,
        childs: async () => await this.dirChildrenInfo(simple.path),
      }
    } else {
      return {
        ...simple,
        isFile: true,
        ext: childPathInfo.ext,
        icon: async () => await this.getFileIcon(simple.path),
      }
    }
  }

  async dirChildrenInfo(folderPath: string) {
    const childrenPaths = await readdir(folderPath, { withFileTypes: true })
    const childrenInfo: PathInfo[] = []
    for (const child of childrenPaths) {
      const childPath = path.join(folderPath, child.name)
      childrenInfo.push(await this.pathInfo(childPath))
    }
    return childrenInfo
  }
}

interface PathStatBase {
  path: string
  name: string
  ctime: Date
  mtime: Date
  size: number
  isDir?: boolean
  isFile?: boolean
}

interface DirInfo extends PathStatBase {
  isDir: true
  childs(): Promise<(DirInfo | FileInfo)[]>
}

interface FileInfo extends PathStatBase {
  isFile: true
  ext: string
  icon(): Promise<string | undefined>
}

type PathInfo = DirInfo | FileInfo
