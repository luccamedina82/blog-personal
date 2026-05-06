import { Node, mergeAttributes } from '@tiptap/core'

export const BookCitationExtension = Node.create({
  name: 'bookCitation',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      bookId: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-book-id') },
      bookTitle: { default: '', parseHTML: (el: HTMLElement) => el.getAttribute('data-book-title') ?? '' },
      storagePath: { default: '', parseHTML: (el: HTMLElement) => el.getAttribute('data-storage-path') ?? '' },
      page: { default: 1, parseHTML: (el: HTMLElement) => Number(el.getAttribute('data-page') ?? 1) },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-bc]' }]
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderHTML({ node }: any) {
    const { bookId, bookTitle, storagePath, page } = node.attrs as {
      bookId: string; bookTitle: string; storagePath: string; page: number
    }
    return [
      'span',
      mergeAttributes({
        'data-bc': '1',
        'data-book-id': bookId,
        'data-book-title': bookTitle,
        'data-storage-path': storagePath,
        'data-page': String(page),
        class: 'book-citation-chip',
        contenteditable: 'false',
      }),
      `📖 ${bookTitle} p. ${page}`,
    ]
  },
})
