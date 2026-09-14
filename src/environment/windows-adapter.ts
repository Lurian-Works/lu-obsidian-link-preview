import { execFile } from "node:child_process"
import { promisify } from "node:util"

export class WindowsAdapter {
  execFileAsync = promisify(execFile)

  async getFileIcon(path: string): Promise<string | null> {
    if (process.platform !== "win32") {
      return null
    }

    const script = `
Add-Type -AssemblyName System.Drawing

$path = $env:LU_ICON_PATH

try {
    $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($path)

    if ($null -eq $icon) {
        exit 1
    }

    try {
        $bitmap = $icon.ToBitmap()

        try {
            $stream = [System.IO.MemoryStream]::new()

            try {
                $bitmap.Save(
                    $stream,
                    [System.Drawing.Imaging.ImageFormat]::Png
                )

                [Convert]::ToBase64String($stream.ToArray())
            }
            finally {
                $stream.Dispose()
            }
        }
        finally {
            $bitmap.Dispose()
        }
    }
    finally {
        $icon.Dispose()
    }
}
catch {
    exit 1
}
`

    try {
      const { stdout } = await this.execFileAsync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          script,
        ],
        {
          windowsHide: true,
          env: {
            ...process.env,
            LU_ICON_PATH: path,
          },
          maxBuffer: 1024 * 1024,
        },
      )

      const base64 = stdout.trim()

      if (!base64) {
        return null
      }

      return `data:image/png;base64,${base64}`
    } catch {
      return null
    }
  }
}
