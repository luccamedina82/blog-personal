export type DevLabCategory = {
  id: string
  user_id: string
  slug: string
  label: string
  description: string | null
  icon: string
}

export type CodeAnnotation = {
  line: number
  title: string
  body: string
}

export type DevLabBlock =
  | { id: string; kind: 'text'; html: string }
  | { id: string; kind: 'code'; filename: string; language: string; code: string; annotations: CodeAnnotation[] }
  | { id: string; kind: 'quote'; content: string; attribution: string }
  | { id: string; kind: 'image'; storage_path: string; alt: string }

export type DevLabPost = {
  id: string
  user_id: string
  category_id: string | null
  title: string
  excerpt: string | null
  blocks: DevLabBlock[]
  tags: string[]
  pinned: boolean
  reading_time: string | null
  created_at: string
}

export type PostDraft = {
  category_id: string | null
  title: string
  excerpt: string
  tags: string[]
  blocks: DevLabBlock[]
}
