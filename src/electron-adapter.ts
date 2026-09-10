export type ElectronRequire = NodeJS.Require

export type ElectronShell = {
  openExternal(url: string): Promise<void>
  openPath(path: string): Promise<string>
}

export class ElectronAdapter {
  private getElectronRequire(): ElectronRequire | undefined {
    return (
      window as Window & {
        require?: NodeJS.Require
      }
    ).require
  }

  getElectronShell(): ElectronShell | null {
    const electron = this.getElectronRequire()?.("electron")
    return electron?.shell ?? null
  }
}
