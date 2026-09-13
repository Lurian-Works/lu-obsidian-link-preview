import { describe, expect, test } from "vitest"
import { InlineLinkParser, linkBlockParser } from "../data-manager"
import { FileUrlSchema } from "../schema"
import { textHelper } from "./text-helper"

describe("Inline Parser", () => {
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

    const values = InlineLinkParser.getLinkValues(
      '"C:\\mein ordner odner\\Lurian Works\\Media\\PicturesA\\EyeOfVerandur\\IMG_20250309_134354.jpg" , " C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender-launcher.exe | blender", "https://blender.org"',
    )

    expect(values).toEqual([
      {
        path: "C:\\mein ordner odner\\Lurian Works\\Media\\PicturesA\\EyeOfVerandur\\IMG_20250309_134354.jpg",
        name: undefined,
      },
      {
        path: "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender-launcher.exe",
        name: "blender",
      },
      { path: "https://blender.org", ame: undefined },
    ])
  })
})

test("FileUrl Schema", () => {
  const notFileUrl = "C://mein Ordner Ordner"
  const fileUrl = "file:///C:mein Ordner Ordner"
  expect(FileUrlSchema.safeParse(notFileUrl).success).toBe(false)
  expect(FileUrlSchema.safeParse(fileUrl).success).toBe(true)
})

describe("Block Parser", () => {
  const sourceText = `path: "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender-launcher.exe"\n
description: "bla bla"\n
path: "C:/folder/name.md"`

  const rawTuples = textHelper.findKeyValuePairs(sourceText)

  test("find key-value pairs", () => {
    expect(rawTuples).toEqual([
      [
        "path",
        "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender-launcher.exe",
      ],
      ["description", "bla bla"],
      ["path", "C:/folder/name.md"],
    ])
  })

  test("group path options", () => {
    expect(linkBlockParser.groupLinkOptions(rawTuples)).toEqual([
      {
        path: "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender-launcher.exe",
        description: "bla bla",
      },
      {
        path: "C:/folder/name.md",
      },
    ])
  })
  test("get full data", () => {
    expect(linkBlockParser.getData(sourceText)).toEqual([
      {
        path: "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender-launcher.exe",
        description: "bla bla",
      },
      { path: "C:/folder/name.md" },
    ])
  })
})
