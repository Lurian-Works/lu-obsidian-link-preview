import { type LinkInputObject, LinkObjectSchema } from "./schema"
import { LuLinkError } from "./utils/helper"
import { type RegexFlag, textHelper as txt } from "./utils/text-helper"

class LinkTextParser {
  block
  inline
  constructor(private readonly id: string){
this.block.getData =
    (text: string)=>{
      return linkBlockParser.getData(text)
    }
    this.block.findLinkSections = (text:string)=>{
      inlineLinkParser.findLinkSections(text, this.id)
    }
    getInlineLinkValues(input: string){
      return inlineLinkParser.getLinkValues(input)
    }
  }

}

function factory(id)
const linkBlockParser = {
  /**
   * return the input as structured object and validates the type
   * does NOT do validation or normalization of paths or anything else
   */
  getData(text: string) {
    const validEntries: LinkInputObject[] = []
    const errors: Error[] = []
    try {
      const tuples = txt.findKeyValuePairs(text)
      const unqObjects = this.groupLinkOptions(tuples)
      unqObjects.forEach(data => {
        const parsed = LinkObjectSchema.safeParse(data)
        if (parsed.success) {
          validEntries.push()
        } else {
          errors.push(
            new LuLinkError(`invalid parsed data`, {
              cause: parsed.error,
            }),
          )
        }
      })

      if (errors) {
        console.error(
          `failed parsing ${errors.length} of ${unqObjects.length} inputs.`,
          ...errors,
        )
      }
      return validEntries
    } catch (e) {
      throw new LuLinkError(`failed parsing text block input`, { cause: e })
    }
  },
  groupLinkOptions(rawTuples: [string, string][]) {
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
  },
}


const inlineLinkParser = {
  /**
   *
   * @param id for example "LuLink"
   * which would apply to "[(LuLink: anything...)]"
   * with the value as a group which is everything after id:
   */
  inlineRegex(id: string, flag?: RegexFlag) {
    return new RegExp(
      `\\[\\s*\\(\\s*${id}\\s*:\\s*([\\s\\S]*?)\\s*\\)\\s*\\]`,
      flag,
    )
  },
  findLinkSections(text: string, id: string) {
    return text.matchAll(this.inlineRegex(id, "g"))
  },
  /**
   *
   * @param input accepts a comma seperated string of values inside double quotes
   * @example (`"[[ C:User/My Plugin/npm data.ts | bla ]]" , "{bla: {} }"`) => [`[[ C:User/My Plugin/npm data.ts | bla ]]`, `{bla: {} }`]
   * opposite of string[].map(s => `"${s}"`).join(",")
   */
  getLinkValues(input: string): string[] {
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
  },
}
