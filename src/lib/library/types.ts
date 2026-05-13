export type LibraryModuleTag = 'faculty' | 'devlab' | 'english'

export type LibraryProgressMode = 'auto' | 'manual'

export type LibraryBook = {
  id: string
  user_id: string
  title: string
  author: string | null
  storage_path: string
  page_count: number | null
  cover_path: string | null
  last_page_read: number | null
  progress_mode: LibraryProgressMode
  tags: string[]
  module_tags: LibraryModuleTag[]
  created_at: string
}

export type BookCitationSourceKind = 'faculty_note' | 'devlab_post'

export type BookCitation = {
  id: string
  user_id: string
  book_id: string
  source_kind: BookCitationSourceKind
  source_id: string
  page: number
  note: string | null
  created_at: string
}

export type BookCitationWithBook = BookCitation & {
  library_books: Pick<LibraryBook, 'id' | 'title' | 'author' | 'storage_path' | 'cover_path' | 'page_count'>
}
