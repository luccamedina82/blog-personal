import type { DevLabBlock } from '@/lib/devlab/types'

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function blocksToPlainText(title: string, blocks: DevLabBlock[]): string {
  const parts: string[] = [title]
  for (const b of blocks) {
    if (b.kind === 'text') parts.push(stripHtml(b.html))
    else if (b.kind === 'quote') parts.push(b.content)
    // skip code + image
  }
  return parts.filter(Boolean).join('\n\n')
}
