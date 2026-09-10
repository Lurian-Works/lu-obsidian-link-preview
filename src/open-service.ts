import { spawn } from "node:child_process"
import type { ElectronShell } from "./environment/electron-adapter"
import type { ObsidianAdapter } from "./environment/obsidian-adapter"
import { WebURLSchema } from "./schema"
import { type PathUtils, pathHelper } from "./utils/path-helper"

type FsOpen =
  | string
  | {
      path: string
      options?: { newTab?: boolean }
    }

export class OpenService {
  /**
   * @param deps.obsidian only for opening urls - falls back to the global window.open method
   */
  constructor(
    private deps: {
      obsidian: ObsidianAdapter
      electron?: ElectronShell | null
      pathUtils: PathUtils
    },
  ) {}
  async open(input: FsOpen): Promise<void> {
    const path = typeof input === "string" ? input : input.path
    const newTab =
      typeof input === "string" ? false : Boolean(input.options?.newTab)

    if (WebURLSchema.safeParse(path).success) {
      await this.openUrl(path)
    } else if (this.deps.pathUtils.isVaultPath(path)) {
      const vaultPath = this.deps.pathUtils.toVaultPath(path)
      this.openVaultPath(vaultPath, {
        newTab: newTab,
      })
    } else if (await pathHelper.isExistingFolder(path)) {
      this.openFolder(path)
    } else if (pathHelper.isAbsolute(path)) {
      await this.openLocalPath(path)
    }
  }

  // NOTICE: Works just on Desktop
  async openFolder(folder: string) {
    spawn("cmd", ["/c", "start", "", folder])
  }

  async openUrl(url: string): Promise<void> {
    if (this.deps.electron) {
      await this.deps.electron.openExternal(url)
      return
    }
    window.open(url, "_blank")
  }

  async openLocalPath(path: string): Promise<void> {
    if (this.deps.electron) {
      await this.deps.electron.openPath(path)
      return
    }
    window.open(pathHelper.toFileUrl(path), "_blank")
  }

  openVaultPath(path: string, options?: { newTab?: boolean }) {
    this.deps.obsidian.openVaultPath(path, { newTab: options?.newTab })
  }
}
