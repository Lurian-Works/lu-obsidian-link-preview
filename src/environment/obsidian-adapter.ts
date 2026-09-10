import { type App, type Editor, FileSystemAdapter, Notice } from "obsidian"
import type { LinkCardService } from "../link-card-service"
import type LuLinkPreviewPlugin from "../main"
import { pathHelper } from "../utils/path-helper"

export class ObsidianAdapter {
  constructor(private readonly app: App) {}
  openVaultPath(path: string, options?: { newTab?: boolean }) {
    this.app.workspace.openLinkText(path, "", options?.newTab)
  }
  get vaultRoot() {
    const adapter = this.app.vault.adapter
    if (adapter instanceof FileSystemAdapter) {
      return pathHelper.normalize(adapter.getBasePath())
    } else throw new Error("couldnt connect to Obsidians FileSystemAdapter")
  }
}

export class ObsidianCardLink {
  constructor(
    private readonly plugin: LuLinkPreviewPlugin,
    private readonly cardService: LinkCardService,
    private readonly codeBlockId: string,
  ) {}
  // LinkBlock
  registerCodeBlockPreview() {
    this.plugin.registerMarkdownCodeBlockProcessor(
      this.codeBlockId,
      async (source, el) => {
        el.appendChild(await this.cardService.renderCardBlock(source))
      },
    )
  }
  // Inline LinkCards
  registerInlinePreview() {
    this.plugin.registerMarkdownPostProcessor(element => {
      this.cardService.renderInlineLinks(element)
    })
  }
  // Link Converter
  registerCommands() {
    // selection to Block
    this.plugin.addCommand({
      id: "lu-link-convert-to-link-block",
      name: "LuLink: to link block",
      editorCallback: editor => {
        this.selectedUrlsToBlock(editor)
      },
    })
    // selection to Inline Card
    this.plugin.addCommand({
      id: "lu-link-convert-to-inline-link-card",
      name: "LuLink: to inline link card",
      editorCallback: editor => {
        this.selectedUrlToInlineCard(editor)
      },
    })
  }

  /**
   * does not parse or convert or match any paths
   * the selection is splitted by comma and each section is a path/url no matter how it looks
   */
  selectedUrlsToBlock(editor: Editor) {
    const selectedText = editor.getSelection().trim()
    if (!selectedText) {
      new Notice("Nothing selected")
      return
    }
    editor.replaceSelection(
      `\`\`\`LuLink\n${selectedText
        .split(",")
        .map(v => `path: ${v.trim()}`)
        .join(`\n`)}\n\`\`\``,
    )
  }

  selectedUrlToInlineCard(editor: Editor) {
    const selectedText = editor.getSelection().trim()
    if (!selectedText) {
      new Notice("Select a link first.")
      return
    }
    editor.replaceSelection(`[(LuLink: "${selectedText}" )]`)
  }
}
