import { Notice, Plugin, requestUrl } from "obsidian";

type OgData = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

export default class LinkPreviewPlugin extends Plugin {
  private cache = new Map<string, OgData>();

  async onload() {
    this.registerCodeBlockPreview();
    this.registerInlinePreview();
    this.registerCommands();
  }

  private registerCodeBlockPreview() {
    this.registerMarkdownCodeBlockProcessor(
      "link-preview",
      async (source, el) => {
        const url = source.trim();

        if (!this.isValidUrl(url)) {
          this.renderError(el, "Invalid link-preview URL.");
          return;
        }

        await this.renderPreview(el, url);
      }
    );
  }

  private registerInlinePreview() {
    this.registerMarkdownPostProcessor((element) => {
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT
      );

      const textNodes: Text[] = [];

      while (walker.nextNode()) {
        textNodes.push(walker.currentNode as Text);
      }

      for (const node of textNodes) {
        this.replaceInlinePreviewSyntax(node);
      }
    });
  }

  private registerCommands() {
    this.addCommand({
      id: "convert-to-link-preview-card",
      name: "Convert to link preview card",
      editorCallback: (editor) => {
        const selectedText = editor.getSelection().trim();

        if (!selectedText) {
          new Notice("Select a link first.");
          return;
        }

        const url = this.extractUrl(selectedText);

        if (!url) {
          new Notice("Selected text does not contain a valid URL.");
          return;
        }

        editor.replaceSelection(`\`\`\`link-preview\n${url}\n\`\`\``);
      },
    });
    this.addCommand({
      id: "convert-to-inline-link-preview-card",
      name: "Convert to inline link preview card",
      editorCallback: (editor) => {
        const selectedText = editor.getSelection().trim();

        if (!selectedText) {
          new Notice("Select a link first.");
          return;
        }

        const url = this.extractUrl(selectedText);

        if (!url) {
          new Notice("Selected text does not contain a valid URL.");
          return;
        }

        editor.replaceSelection(`[(lu-link-prev: ${url})]`);
      },
    });
  }

  private replaceInlinePreviewSyntax(node: Text) {
    const text = node.nodeValue;
    if (!text) return;

    const regex = /\[\(lu-link-prev:\s*(https?:\/\/[^\s)]+)\s*\)\]/gi;
    const matches = [...text.matchAll(regex)];

    if (!matches.length) return;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    for (const match of matches) {
      const fullMatch = match[0];
      const url = match[1];
      const start = match.index ?? 0;

      const before = text.slice(lastIndex, start);
      if (before) {
        fragment.appendChild(document.createTextNode(before));
      }

      const container = document.createElement("span");
      container.classList.add("lu-lp-inline-container");

      fragment.appendChild(container);
      this.renderPreview(container, url);

      lastIndex = start + fullMatch.length;
    }

    const after = text.slice(lastIndex);
    if (after) {
      fragment.appendChild(document.createTextNode(after));
    }

    node.parentNode?.replaceChild(fragment, node);
  }

  private async renderPreview(el: HTMLElement, url: string) {
    el.empty();

    el.createEl("div", {
      text: "Loading preview...",
      cls: "lu-lp-loading",
    });

    try {
      const data = await this.getOpenGraphData(url);
      el.empty();
      this.renderCard(el, data);
    } catch (error) {
      this.renderError(el, "Could not load link preview.");
      console.error("Link preview failed:", error);
    }
  }

  private renderError(el: HTMLElement, message: string) {
    el.empty();

    el.createEl("div", {
      text: message,
      cls: "lu-lp-error",
    });
  }

  private extractUrl(value: string): string | null {
    const markdownLinkMatch = value.match(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i);
    if (markdownLinkMatch?.[1]) return markdownLinkMatch[1];

    const plainUrlMatch = value.match(/https?:\/\/\S+/i);
    if (plainUrlMatch?.[0]) return plainUrlMatch[0];

    return null;
  }

  private isValidUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
  }

  private async getOpenGraphData(url: string): Promise<OgData> {
    const cached = this.cache.get(url);
    if (cached) return cached;

    const response = await requestUrl({
      url,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 Obsidian Link Preview Plugin",
      },
    });

    const html = response.text;

    const data: OgData = {
      url,
      title:
        this.getMeta(html, "og:title") ||
        this.getMeta(html, "twitter:title") ||
        this.getTitle(html) ||
        url,
      description:
        this.getMeta(html, "og:description") ||
        this.getMeta(html, "twitter:description"),
      image: this.toAbsoluteUrl(
        this.getMeta(html, "og:image") ||
          this.getMeta(html, "twitter:image"),
        url
      ),
      siteName: this.getMeta(html, "og:site_name"),
    };

    this.cache.set(url, data);
    return data;
  }

  private renderCard(el: HTMLElement, data: OgData) {
    const card = el.createEl("a", {
      cls: "lu-lp-card",
      attr: {
        href: data.url,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    });

    if (data.image) {
      card.createEl("img", {
        cls: "lu-lp-image",
        attr: {
          src: data.image,
          alt: "",
        },
      });
    }

    const content = card.createEl("div", {
      cls: "lu-lp-content",
    });

    content.createEl("div", {
      text: data.title || data.url,
      cls: "lu-lp-title",
    });

    if (data.description) {
      content.createEl("div", {
        text: data.description,
        cls: "lu-lp-description",
      });
    }

    content.createEl("div", {
      text: data.siteName || new URL(data.url).hostname,
      cls: "lu-lp-site",
    });
  }

  private getMeta(html: string, property: string): string | undefined {
    const patterns = [
      new RegExp(
        `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["'][^>]*>`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
        "i"
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["'][^>]*>`,
        "i"
      ),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return this.decodeHtml(match[1]);
    }

    return undefined;
  }

  private getTitle(html: string): string | undefined {
    const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
    return match?.[1] ? this.decodeHtml(match[1].trim()) : undefined;
  }

  private decodeHtml(value: string): string {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  private toAbsoluteUrl(
    value: string | undefined,
    baseUrl: string
  ): string | undefined {
    if (!value) return undefined;

    try {
      return new URL(value, baseUrl).toString();
    } catch {
      return undefined;
    }
  }
}