import type { VercelRequest, VercelResponse } from '@vercel/node'

type CardsResult = {
  cards: Array<{ front: string; back: string; tags: string[] }>
}

function cardsPrompt(content: string, deckCategory: string, count: number): string {
  const categoryHint: Record<string, string> = {
    vocab: 'front = word/phrase, back = definition + example sentence',
    phrasal: 'front = phrasal verb, back = meaning + usage example',
    idioms: 'front = idiom, back = meaning + context',
    'book-quotes': 'front = quote, back = reflection or key idea',
    'tech-notes': 'front = concept/term, back = clear explanation + example',
  }
  const hint = categoryHint[deckCategory] ?? 'front = key term, back = explanation'

  return `You are a flashcard expert. Generate exactly ${count} Anki-style flashcards from the content below.
Category: ${deckCategory}. Card format: ${hint}.
Return ONLY a valid JSON object — no markdown, no extra text.

Required structure:
{
  "cards": [
    { "front": "<term or question>", "back": "<answer + example>", "tags": ["<tag1>", "<tag2>"] }
  ]
}

Rules:
- Each card must be self-contained (no "see above" references).
- Back side: answer first, then short example if applicable.
- Tags: 2-4 keywords from the content (topic, level, etc.).
- Do NOT generate cards for code snippets.

Content:
"""
${content}
"""`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body as { content?: unknown; deck_category?: unknown; count?: unknown }
  const content = body?.content
  const deckCategory = body?.deck_category
  const count = body?.count

  if (typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'content required' })
  }
  if (typeof deckCategory !== 'string') {
    return res.status(400).json({ error: 'deck_category required' })
  }
  const n = typeof count === 'number' ? Math.max(3, Math.min(20, count)) : 5

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: cardsPrompt(content, deckCategory, n) }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 2048,
    }),
  })

  if (!groqRes.ok) {
    return res.status(502).json({ error: 'groq_error', status: groqRes.status })
  }

  const groqData = await groqRes.json() as {
    choices: Array<{ message: { content: string } }>
  }

  const result: CardsResult = JSON.parse(groqData.choices[0].message.content)
  return res.json(result)
}
