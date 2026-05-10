import type { VercelRequest, VercelResponse } from '@vercel/node'

type GeneratedTip = {
  kind: 'word' | 'phrase' | 'idiom' | 'connector'
  term: string
  meaning: string
  example: string
  register: 'casual' | 'neutral' | 'formal'
  source: string | null
}

function tipPrompt(knownTerms: string[]): string {
  const avoidList =
    knownTerms.length > 0
      ? `\nAvoid these terms (user already knows them): ${knownTerms.slice(0, 60).join(', ')}`
      : ''

  return `You are a daily English tip generator for an intermediate-advanced learner.
Generate exactly 1 useful English tip. Choose from: word, phrase, idiom, or connector.
Prefer less-common but genuinely useful items — not basic everyday words.${avoidList}

Return ONLY a valid JSON object — no markdown, no extra text.

Required structure:
{
  "kind": "word" | "phrase" | "idiom" | "connector",
  "term": "<the word, phrase, idiom, or connector>",
  "meaning": "<clear 1-sentence definition>",
  "example": "<natural example sentence using the term>",
  "register": "casual" | "neutral" | "formal",
  "source": "<optional: book, movie, or context where this is commonly heard — null if generic>"
}

Rules:
- kind "word": single word, interesting vocabulary (not top-1000 words)
- kind "phrase": multi-word expression (2–5 words)
- kind "idiom": figurative expression with non-literal meaning
- kind "connector": discourse marker or linking phrase (e.g. "as a result", "on the contrary")
- example must feel natural, not textbook-stiff
- source can be null`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body as { knownTerms?: unknown }
  const knownTerms = Array.isArray(body.knownTerms)
    ? (body.knownTerms as string[]).filter((t) => typeof t === 'string')
    : []

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' })

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: tipPrompt(knownTerms) }],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 512,
    }),
  })

  if (!groqRes.ok) {
    const errText = await groqRes.text().catch(() => '')
    return res.status(502).json({ error: 'groq_error', status: groqRes.status, detail: errText })
  }

  const groqData = (await groqRes.json()) as {
    choices: Array<{ message: { content: string } }>
  }

  const result = JSON.parse(groqData.choices[0].message.content) as GeneratedTip
  return res.json(result)
}
