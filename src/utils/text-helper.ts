import { LinkObjectSchema } from "../schema"
import { LuLinkError } from "./helper"

export const textHelper = {}
/**
 * does not trim whitespace or remove empty lines
 */
function linesToArray(text: string) {
  const lines = text.split(/\r?\n/)
}

/**
 * input can be any text structured in lines with key: value pairs, similar to yaml(i think it should work for yaml, but there are more stable parser)
 * note that this does not support text between such pairs.
 * everything between the end of an key:value pair and the next ":" is considered a key
 * values spanning multiple lines have to be in double quotes
 */
function findKeyValuePairs(raw: string): [string, string][] {
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
}

function groupLinkOptions(rawTuples: [string, string][]) {
  let i = 0

  const result: Record<string, string>[] = []

  while (rawTuples[i]?.[0] === "path") {
    const pathTuple = rawTuples[i]
    const pathOptions: ([string, string] | undefined)[] = []
    i++
    while (rawTuples[i]?.[0] !== "path") {
      pathOptions.push(rawTuples[i])
      i++
    }
    if (pathTuple) {
      result.push(
        Object.fromEntries([
          pathTuple,
          ...pathOptions.filter(p => p !== undefined),
        ]),
      )
    }
  }
  return result
}

/**
 * return the input as structured object and validates the type
 * does NOT do validation or normalization of paths or anything else
 */
export function getTextBlockData(text: string) {
  try {
    const rawObject = findKeyValuePairs(text)
    const valid = LinkObjectSchema.safeParse(rawObject)
    if (valid.success) {
      return valid
    }
    throw new LuLinkError(`invalid parsed data`, {
      cause: valid.error,
    })
  } catch (e) {
    throw new LuLinkError(`failed parsing text block input`, { cause: e })
  }
}
