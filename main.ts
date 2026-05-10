
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
    this.registerMarkdownCodeBlockProcessor(
      "link-preview",
      async (source, el) => {
        const url = source.trim();

        if (!url || !/^https?:\/\//i.test(url)) {
          el.createEl("div", {
            text: "Invalid link-preview URL.",
            cls: "lp-error",
          });
          return;
        }

        el.empty();
        el.createEl("div", {
          text: "Loading preview...",
          cls: "lp-loading",
        });

        try {
          const data = await this.getOpenGraphData(url);
          el.empty();
          this.renderCard(el, data);
        } catch (error) {
          el.empty();
          el.createEl("div", {
            text: "Could not load link preview.",
            cls: "lp-error",
          });
          console.error("Link preview failed:", error);
        }
      }
    );

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
  }

  private extractUrl(value: string): string | null {
    const markdownLinkMatch = value.match(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i);
    if (markdownLinkMatch?.[1]) return markdownLinkMatch[1];

    const plainUrlMatch = value.match(/https?:\/\/\S+/i);
    if (plainUrlMatch?.[0]) return plainUrlMatch[0];

    return null;
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
      image:
        this.toAbsoluteUrl(
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
      cls: "lp-card",
      attr: {
        href: data.url,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    });

    if (data.image) {
      card.createEl("img", {
        cls: "lp-image",
        attr: {
          src: data.image,
          alt: "",
        },
      });
    }

    const content = card.createEl("div", {
      cls: "lp-content",
    });

    content.createEl("div", {
      text: data.title || data.url,
      cls: "lp-title",
    });

    if (data.description) {
      content.createEl("div", {
        text: data.description,
        cls: "lp-description",
      });
    }

    content.createEl("div", {
      text: data.siteName || new URL(data.url).hostname,
      cls: "lp-site",
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

  private toAbsoluteUrl(value: string | undefined, baseUrl: string): string | undefined {
    if (!value) return undefined;

    try {
      return new URL(value, baseUrl).toString();
    } catch {
      return undefined;
    }
  }
}