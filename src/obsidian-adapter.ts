import { Notice } from "obsidian"
import type LuLinkPreviewPlugin from "./main"
import { errorEl, type LinkCardFactory } from "./presentation"
import { extractUrl, isWebUrl } from "./utils/helper"

export class ObsidianAdapter {
  constructor(
    private readonly plugin: LuLinkPreviewPlugin,
    private readonly cardFactory: LinkCardFactory,
  ) {}
  registerCodeBlockPreview() {
    this.plugin.registerMarkdownCodeBlockProcessor(
      "link-preview",
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
      for (const node of this.findInlineCardIdentifier(element)) {
        this.renderInlineCard(node)
      }
    })
  }

  findInlineCardIdentifier(element: HTMLElement) {
    const textNodes: Text[] = []
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode as Text)
    }
    return textNodes
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
}
