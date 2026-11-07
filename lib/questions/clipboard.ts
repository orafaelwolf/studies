/** Read only image items explicitly provided by a paste event. */
export function clipboardImage(data: Pick<DataTransfer, 'items' | 'files'>): File | null {
  const images: File[] = []
  for (const item of Array.from(data.items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const image = item.getAsFile()
      if (image) images.push(image)
    }
  }
  images.push(...Array.from(data.files).filter((file) => file.type.startsWith('image/')))
  return images.find((file) => ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) || images[0] || null
}

// Parse inert HTML only; never add the document or any of its markup to the page.
export function clipboardHtmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script,style,noscript,template,svg').forEach((node) => node.remove())
  const blocks = new Set(['P', 'DIV', 'LI', 'BR', 'H1', 'H2', 'H3', 'H4', 'TR', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER'])
  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const element = node as Element
    const content = Array.from(element.childNodes, walk).join('')
    return blocks.has(element.tagName) ? '\n' + content + '\n' : content
  }
  return Array.from(doc.body.childNodes, walk).join('').replace(/\n[ \t]*\n[ \t]*\n/g, '\n\n').trim()
}
