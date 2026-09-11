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
   * @param deps.obsidian only for opening urls - falls back to the global window.open() method if not available
   */
  constructor(
    private deps: {
      obsidian: ObsidianAdapter
      electron?: ElectronShell | null
      pathUtils: PathUtils
    },
  ) {}
  /**
   *
   * @param input either a string which can be a path/url or an object with a path property and optional options property -
   * paths inside the vault or in a vault format will be opened by obsidian -
   * everything outside the vault for example other apps will be opened with your systems default method. -
   * So it is basically the same as clicking it directly in file explorer/desktop -
   * this does not resolve/normalize or convert any paths so be sure to give it a valid path/url or use the {@link PathUtils} resolveYamlPath method which accepts nearly everything path/link/url related ( though this will return an array you would have to deconstruct with for e.g. resolveYamlPath(path)[0] )
   */
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
    const command =
      process.platform === "win32"
        ? "cmd"
        : process.platform === "darwin"
          ? "open"
          : "xdg-open"

    const args =
      process.platform === "win32" ? ["/c", "start", "", folder] : [folder]

    spawn(command, args, {
      detached: true,
      stdio: "ignore",
    }).unref()
  }

  /**
   * falls back to the global window.open() method if electron is not available
   */
  async openUrl(url: string): Promise<void> {
    if (this.deps.electron) {
      await this.deps.electron.openExternal(url)
      return
    }
    window.open(url, "_blank")
  }
  /**
   * falls back to the global window.open() method if electron is not available
   */
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
