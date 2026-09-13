export type ElectronRequire = NodeJS.Require

export type ElectronModule = {
  app: Electron.App
  shell: Electron.Shell
  nativeImage: typeof import("electron").nativeImage
}

export class ElectronAdapter {
  electron: typeof Electron
  constructor() {
    const electron = this.requireElectron()?.("electron")
    if (!electron) throw new Error(`LuLink: failed to access electron`)
    this.electron = electron as typeof Electron
  }
  private requireElectron(): ElectronRequire | undefined {
    return (
      window as Window & {
        require?: NodeJS.Require
      }
    ).require
  }
}

export class FileSystemAdapter {
  constructor(private readonly electron: ElectronModule) {}
  async getFileIcon(
    path: string,
    size?: {
      height: number
      width: number
    },
  ) {
    return await this.electron.nativeImage.createThumbnailFromPath(
      path,
      size || { width: 128, height: 128 },
    )
  }
}
