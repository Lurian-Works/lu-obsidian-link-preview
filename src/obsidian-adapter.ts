import { Notice } from "obsidian"
import { extractUrl, isValidUrl } from "./helper"
import type LuLinkPreviewPlugin from "./main"
import type { LinkCardFactory } from "./presentation"

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

        if (!isValidUrl(url)) {
          this.cardFactory.renderError(el, "Invalid link-preview URL.")
          return
        }

        await this.cardFactory.renderPreview(el, url)
      },
    )
  }

  registerInlinePreview() {
    this.plugin.registerMarkdownPostProcessor(element => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)

      const textNodes: Text[] = []

      while (walker.nextNode()) {
        textNodes.push(walker.currentNode as Text)
      }

      for (const node of textNodes) {
        this.cardFactory.replaceInlinePreviewSyntax(node)
      }
    })
  }

  registerCommands() {
    this.plugin.addCommand({
      id: "convert-to-link-block",
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

        editor.replaceSelection(`\`\`\`link-preview\n${url}\n\`\`\``)
      },
    })
    this.plugin.addCommand({
      id: "convert-to-inline-link-card",
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

        editor.replaceSelection(`[(lu-link-prev: ${url})]`)
      },
    })
  }
}
