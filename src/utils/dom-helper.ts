export function getTextNodes(element: HTMLElement) {
  const textNodes: Text[] = []
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text)
  }
  return textNodes
}
