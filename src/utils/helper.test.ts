import { expect, test } from "vitest"

const text = `bla ba:[(LuLink: [[User/My Plugin/npm data.ts]])] brum\n
bla blaub / []() [(  LuLink: "[[ C:User/My Plugin/npm data.ts | bla ]]" , "{bla: {} }" ) ]([]

[(Lulink: "[[User/My Plugin/npm data.ts|bla]])]
[(LuLink: "[[User/My Plugin/npm data.ts|bla]]`
test("getAllInlineBlocks", () => {
  expect([...getAllInlineBlocks(text, "LuLink")].map(lr => lr[0])).toEqual([
    "[(LuLink: [[User/My Plugin/npm data.ts]])]",
    `[(  LuLink: "[[ C:User/My Plugin/npm data.ts | bla ]]" , "{bla: {} }" ) ]`,
  ])
})

test("getInlineLinkValues", () => {
  const valueGroup = [
    ...linkCardTextParser.getAllInlineBlocks(text, "LuLink"),
  ][1]?.[1]
  if (valueGroup) {
    expect(valueGroup).toBe(
      `"[[ C:User/My Plugin/npm data.ts | bla ]]" , "{bla: {} }"`,
    )
    expect(linkCardTextParser.getInlineLinkValues(valueGroup)).toEqual([
      `[[ C:User/My Plugin/npm data.ts | bla ]]`,
      `{bla: {} }`,
    ])
  }
})
