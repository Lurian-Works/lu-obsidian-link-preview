import { expect, test } from "vitest"
import { InlineLinkParser } from "../data-manager"
import { FileUrlSchema } from "../schema"

const text = `bla ba:[(LuLink: [[User/My Plugin/npm data.ts]])] brum\n
bla blaub / []() [(  LuLink: "[[ C:User/My Plugin/npm data.ts | bla ]]" , "{bla: {} }" ) ]([]

[(Lulink: "[[User/My Plugin/npm data.ts|bla]])]
[(LuLink: "[[User/My Plugin/npm data.ts|bla]]`
test("getAllInlineBlocks", () => {
  expect(
    [...InlineLinkParser.findLinkSections(text, "LuLink")].map(lr => lr[0]),
  ).toEqual([
    "[(LuLink: [[User/My Plugin/npm data.ts]])]",
    `[(  LuLink: "[[ C:User/My Plugin/npm data.ts | bla ]]" , "{bla: {} }" ) ]`,
  ])
})

test("getInlineLinkValues", () => {
  const valueGroup = [
    ...InlineLinkParser.findLinkSections(text, "LuLink"),
  ][1]?.[1]
  if (valueGroup) {
    expect(valueGroup).toBe(
      `"[[ C:User/My Plugin/npm data.ts | bla ]]" , "{bla: {} }"`,
    )
    expect(InlineLinkParser.getLinkValues(valueGroup)).toEqual([
      `[[ C:User/My Plugin/npm data.ts | bla ]]`,
      `{bla: {} }`,
    ])
  }
})

test("File Url Schema", () => {
  const notFileUrl = "C://mein Ordner Ordner"
  const fileUrl = "file:///C:mein Ordner Ordner"
  expect(FileUrlSchema.safeParse(notFileUrl).success).toBe(false)
  expect(FileUrlSchema.safeParse(fileUrl).success).toBe(true)
})
