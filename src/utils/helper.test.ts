import { describe, expect, test } from "vitest"
import { InlineLinkParser } from "../data-manager"
import { FileUrlSchema } from "../schema"

describe("InlineLinkParser", () => {
  const text = `bla ba:[(LuLink: User/My Plugin/npm data.ts)] brum\n
  bla blaub / []() [(  LuLink: " C:User/My Plugin/npm data.ts | bla" , "{bla: {} }" ) ]([]

[(Lulink: "User/My Plugin/npm data.ts|bla)]
[(LuLink: "User/My Plugin/npm data.ts|bla`

  test("getAllInlineBlocks", () => {
    expect(
      [...InlineLinkParser.findLinkSections(text, "LuLink")].map(lr => lr[0]),
    ).toEqual([
      "[(LuLink: User/My Plugin/npm data.ts)]",
      `[(  LuLink: " C:User/My Plugin/npm data.ts | bla" , "{bla: {} }" ) ]`,
    ])
  })

  test("inline regex value group", () => {
    expect(
      [...InlineLinkParser.findLinkSections(text, "LuLink")].map(lr => {
        return { full: lr[0], value: lr[1] }
      }),
    ).toEqual([
      {
        full: "[(LuLink: User/My Plugin/npm data.ts)]",
        value: "User/My Plugin/npm data.ts",
      },
      {
        full: `[(  LuLink: " C:User/My Plugin/npm data.ts | bla" , "{bla: {} }" ) ]`,
        value: `" C:User/My Plugin/npm data.ts | bla" , "{bla: {} }"`,
      },
    ])
  })

  test("getInlineLinkValues", () => {
    const linkSections = [...InlineLinkParser.findLinkSections(text, "LuLink")]
    const sectionValueRaw = linkSections[1]?.[1] as string

    const values = InlineLinkParser.getLinkValues(sectionValueRaw)

    expect(values).toEqual([
      {
        path: "C:User/My Plugin/npm data.ts",
        name: "bla",
      },
    ])
  })
})

test("File Url Schema", () => {
  const notFileUrl = "C://mein Ordner Ordner"
  const fileUrl = "file:///C:mein Ordner Ordner"
  expect(FileUrlSchema.safeParse(notFileUrl).success).toBe(false)
  expect(FileUrlSchema.safeParse(fileUrl).success).toBe(true)
})
