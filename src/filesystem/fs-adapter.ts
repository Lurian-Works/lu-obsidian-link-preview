import type { ElectronFs } from "../environment/electron-adapter"
import type { WindowsAdapter } from "../environment/windows-adapter"
import type { Platform } from "../schema"

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
}
