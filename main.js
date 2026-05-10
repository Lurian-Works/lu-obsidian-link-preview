"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => LinkPreviewPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var LinkPreviewPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.cache = /* @__PURE__ */ new Map();
  }
  async onload() {
    this.registerMarkdownCodeBlockProcessor(
      "link-preview",
      async (source, el) => {
        const url = source.trim();
        if (!url || !/^https?:\/\//i.test(url)) {
          el.createEl("div", {
            text: "Invalid link-preview URL.",
            cls: "lu-lp-error"
          });
          return;
        }
        el.empty();
        el.createEl("div", {
          text: "Loading preview...",
          cls: "lu-lp-loading"
        });
        try {
          const data = await this.getOpenGraphData(url);
          el.empty();
          this.renderCard(el, data);
        } catch (error) {
          el.empty();
          el.createEl("div", {
            text: "Could not load link preview.",
            cls: "lu-lp-error"
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
          new import_obsidian.Notice("Select a link first.");
          return;
        }
        const url = this.extractUrl(selectedText);
        if (!url) {
          new import_obsidian.Notice("Selected text does not contain a valid URL.");
          return;
        }
        editor.replaceSelection(`\`\`\`link-preview
${url}
\`\`\``);
      }
    });
  }
  extractUrl(value) {
    const markdownLinkMatch = value.match(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i);
    if (markdownLinkMatch?.[1])
      return markdownLinkMatch[1];
    const plainUrlMatch = value.match(/https?:\/\/\S+/i);
    if (plainUrlMatch?.[0])
      return plainUrlMatch[0];
    return null;
  }
  async getOpenGraphData(url) {
    const cached = this.cache.get(url);
    if (cached)
      return cached;
    const response = await (0, import_obsidian.requestUrl)({
      url,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 Obsidian Link Preview Plugin"
      }
    });
    const html = response.text;
    const data = {
      url,
      title: this.getMeta(html, "og:title") || this.getMeta(html, "twitter:title") || this.getTitle(html) || url,
      description: this.getMeta(html, "og:description") || this.getMeta(html, "twitter:description"),
      image: this.toAbsoluteUrl(
        this.getMeta(html, "og:image") || this.getMeta(html, "twitter:image"),
        url
      ),
      siteName: this.getMeta(html, "og:site_name")
    };
    this.cache.set(url, data);
    return data;
  }
  renderCard(el, data) {
    const card = el.createEl("a", {
      cls: "lu-lp-card",
      attr: {
        href: data.url,
        target: "_blank",
        rel: "noopener noreferrer"
      }
    });
    if (data.image) {
      card.createEl("img", {
        cls: "lu-lp-image",
        attr: {
          src: data.image,
          alt: ""
        }
      });
    }
    const content = card.createEl("div", {
      cls: "lu-lp-content"
    });
    content.createEl("div", {
      text: data.title || data.url,
      cls: "lu-lp-title"
    });
    if (data.description) {
      content.createEl("div", {
        text: data.description,
        cls: "lu-lp-description"
      });
    }
    content.createEl("div", {
      text: data.siteName || new URL(data.url).hostname,
      cls: "lu-lp-site"
    });
  }
  getMeta(html, property) {
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
      )
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1])
        return this.decodeHtml(match[1]);
    }
    return void 0;
  }
  getTitle(html) {
    const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
    return match?.[1] ? this.decodeHtml(match[1].trim()) : void 0;
  }
  decodeHtml(value) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }
  toAbsoluteUrl(value, baseUrl) {
    if (!value)
      return void 0;
    try {
      return new URL(value, baseUrl).toString();
    } catch {
      return void 0;
    }
  }
};
//# sourceMappingURL=main.js.map
