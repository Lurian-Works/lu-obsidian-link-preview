import { App, Editor, Notice } from "obsidian"
import type { DataManager } from "./data-manager"
import type LuLinkPreviewPlugin from "./main"
import { errorEl } from "./presentation"
import { getTextNodes } from "./utils/dom-helper"
import { extractUrl, isWebUrl } from "./utils/helper"

export class ObsidianCardService {
  constructor(
    private readonly plugin: LuLinkPreviewPlugin,
    private readonly cardFactory: LinkCardFactory,
    private readonly codeBlockId: string,
  ) {}
  registerCodeBlockPreview() {
    this.plugin.registerMarkdownCodeBlockProcessor(
      this.codeBlockId,
      async (source, el) => {
        const url = source.trim()

        if (!isWebUrl(url)) {
          el.appendChild(errorEl("Invalid link-preview URL."))
          return
        }
        await this.cardFactory.renderLinkCard(el, url)
      },
    )
  }

  registerInlinePreview() {
    this.plugin.registerMarkdownPostProcessor(element => {
      for (const node of getTextNodes(element)) {
        this.renderInlineCard(node)
      }
    })
  }

  registerCommands() {
    this.plugin.addCommand({
      id: "lu-link-convert-to-link-block",
      name: "LuLink: to link block",
      editorCallback: editor => {
        const selectedText = editor.getSelection().trim()
        if (!selectedText) {
          new Notice("Select a link first.")
          return
        }
        const url = extractUrl(selectedText)
        if (!url) {
          new Notice("Selected text does not contain a valid URL.")
          return
        }
        editor.replaceSelection(`\`\`\`LuLink\n${url}\n\`\`\``)
      },
    })

    this.plugin.addCommand({
      id: "lu-link-convert-to-inline-link-card",
      name: "LuLink: to inline link card",
      editorCallback: editor => {
        const selectedText = editor.getSelection().trim()

        if (!selectedText) {
          new Notice("Select a link first.")
          return
        }

        const url = extractUrl(selectedText)

        if (!url) {
          new Notice("Selected text does not contain a valid URL.")
          return
        }

        editor.replaceSelection(`[(LuLink: ${url})]`)
      },
    })
  }

  async renderInlineCard(node: Text) {
    const text = node.nodeValue
    if (!text) return

    const regex = /\[\(LuLink:\s*(https?:\/\/[^\s)]+)\s*\)\]/gi
    const matches = [...text.matchAll(regex)]

    if (!matches.length) return

    const fragment = document.createDocumentFragment()
    let lastIndex = 0

    for (const match of matches) {
      const fullMatch = match[0]
      const url = match[1]
      const start = match.index ?? 0

      if (url) {
        const before = text.slice(lastIndex, start)
        if (before) {
          fragment.appendChild(document.createTextNode(before))
        }
        const container = createEl("span")
        container.classList.add("lu-lc-inline-container")

        fragment.appendChild(container)
        await this.cardFactory.renderLinkCard(container, url)

        lastIndex = start + fullMatch.length
      }
    }
    const after = text.slice(lastIndex)
    if (after) {
      fragment.appendChild(document.createTextNode(after))
    }
    node.parentNode?.replaceChild(fragment, node)
  }
  selectedUrlsToCards(editor: Editor) {
    const selectedText = editor.getSelection().trim()
    if (!selectedText) {
      new Notice("Nothing selected")
      return
    }
    const urls = extractUrl(selectedText)
    if (!urls) {
      new Notice("Selected text does not contain a valid URL.")
      return
    }
    editor.replaceSelection(`\`\`\`LuLink\n${urls.join("\n")}\n\`\`\``)
  }
}

export class ObsidianAdapter {
  constructor(private readonly app: App) {}
  openVaultPath(path: string, options?: { newTab?: boolean }) {
    this.app.workspace.openLinkText(path, "", options?.newTab)
  }
}
