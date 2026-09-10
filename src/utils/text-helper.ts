import { LuLinkError } from "./helper"

export const textHelper = {
  /**
   * does not trim whitespace or remove empty lines
   */
  linesToArray(text: string) {
    const lines = text.split(/\r?\n/)
    return lines
  },
  arrayToLines(array: string[]) {
    return array.join("\n")
  },
  /**
   * removes all "\n", "\r" and "\r\n"
   */
  replaceLineEndings(text: string, replaceWith?: string) {
    return text.replace(/\r\n|\n|\r/g, replaceWith || "")
  },
  /**
   * input can be any text structured in lines with key: value pairs, similar to yaml
   * note that this does not support text between such pairs.
   * everything between the end of an key:value pair and the next ":" is considered a key
   * values spanning multiple lines have to be in double quotes
   */
  findKeyValuePairs(raw: string): [string, string][] {
    const result: [string, string][] = []

    let i = 0

    while (i < raw.length) {
      // Skip empty lines
      while (i < raw.length && (raw[i] === "\n" || raw[i] === "\r")) {
        i++
      }
      if (i >= raw.length) break

      // Read key
      const keyStart = i

      while (i < raw.length && raw[i] !== ":") {
        i++
      }
      if (i >= raw.length) {
        throw new LuLinkError("Expected ':' after key")
      }

      const key = raw.slice(keyStart, i).trim().toLowerCase()

      // Skip ':'
      i++

      // Skip spaces/tabs after ':'
      while (i < raw.length && (raw[i] === " " || raw[i] === "\t")) {
        i++
      }

      // Quoted value
      if (raw[i] === '"') {
        i++
        const valueStart = i

        // find end position
        while (i < raw.length && raw[i] !== '"') {
          i++
        }
        if (i >= raw.length) {
          throw new LuLinkError(`Unterminated quoted value for "${key}"`)
        }

        result.push([key, raw.slice(valueStart, i)])

        // Skip closing quote
        i++
        // Skip whitespace
        while (i < raw.length && (raw[i] === " " || raw[i] === "\t")) {
          i++
        }
        // After a quoted value, expect newline/end
        if (i < raw.length && raw[i] !== "\r" && raw[i] !== "\n") {
          throw new LuLinkError(`Unexpected content after value for "${key}"`)
        }
      }

      // Unquoted value
      else {
        const valueStart = i
        // get end position
        while (i < raw.length && raw[i] !== "\r" && raw[i] !== "\n") {
          i++
        }
        result.push([key, raw.slice(valueStart, i).trimEnd()])
      }
    }

    return result
  },
}

export type RegexFlag = "g" | "y" | "i" | "m" | "s" | "u"

/**
 *
 * @param id for example "LuLink"
 * which would apply to "[(LuLink: anything...)]"
 * with the value as a group which is everything after id:
 */
function inlineLinkRegex(id: string, flag?: RegexFlag) {
  return new RegExp(
    `\\[\\s*\\(\\s*${id}\\s*:\\s*([\\s\\S]*?)\\s*\\)\\s*\\]`,
    flag,
  )
}

class TextParser {
  constructor(private readonly id: string) {}
}

function findInlineLinkSections(text: string, id: string) {
  return text.matchAll(inlineLinkRegex(id, "g"))
}
/**
 *
 * @param input accepts a comma seperated string of values inside double quotes
 * @example (`"[[ C:User/My Plugin/npm data.ts | bla ]]" , "{bla: {} }"`) => [`[[ C:User/My Plugin/npm data.ts | bla ]]`, `{bla: {} }`]
 * opposite of string[].map(s => `"${s}"`).join(",")
 */
function getInlineLinkValues(input: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (const char of input) {
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
      continue
    }
    current += char
  }
  if (current.trim()) {
    values.push(current.trim())
  }

  return values
}

/**
 *
 * @param node text
 * @param id
 * @returns
 */
async function replaceInlineLinkNodes(
  element: HTMLElement,
  id: string,
  render: (
    container: HTMLDivElement,
    value: string[] | undefined,
  ) => void | Promise<void>,
) {
  const textNodes: Text[] = []
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text)
  }

  for (const node of textNodes) {
    const text = node.nodeValue
    if (!text) return

    const linkSections = [...findInlineLinkSections(text, id)]
    if (!linkSections.length) return

    const fragment = document.createDocumentFragment()
    let lastIndex = 0

    for (const linkMatch of linkSections) {
      const fullMatch = linkMatch[0]
      const rawValue = linkMatch[1]
      const startIndex = linkMatch.index ?? 0

      if (rawValue) {
        const v = getInlineLinkValues(rawValue)
        const container = createEl("div")
        container.classList.add("lu-lc-inline-container")

        const before = text.slice(lastIndex, startIndex)
        if (before) {
          fragment.appendChild(document.createTextNode(before))
        }

        fragment.appendChild(container)
        await render(container, v)

        lastIndex = startIndex + fullMatch.length
      }
    }
    const after = text.slice(lastIndex)
    if (after) {
      fragment.appendChild(document.createTextNode(after))
    }
    node.parentNode?.replaceChild(fragment, node)
  }
}
