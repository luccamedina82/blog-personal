import type { VercelRequest, VercelResponse } from '@vercel/node'

type AnnotationKind = 'grammar' | 'style' | 'clarity' | 'suggestion'

type IncomingBlock = { id: string; plainText: string }

type ProposedAnnotation = {
  blockId: string
  originalText: string
  suggestion: string
  rationale?: string
  kind: AnnotationKind
}

function reviewPrompt(blocks: IncomingBlock[]): string {
  const blocksFormatted = blocks
    .map((b, i) => `--- Block #${i + 1} (id=${b.id}) ---\n${b.plainText}`)
    .join('\n\n')
  return `You are an expert writing coach reviewing a draft DevLab blog post. Find passages that could be improved and return inline suggestions.

Rules:
- Return ONLY valid JSON, no markdown.
- Schema: { "annotations": [{ "blockId": "<id>", "originalText": "<exact verbatim substring of the block's text>", "suggestion": "<improved replacement, plain text only, NO HTML tags>", "rationale": "<short why>", "kind": "grammar|style|clarity|suggestion" }] }
- originalText MUST appear verbatim (character-for-character) in the corresponding block's text.
- originalText and suggestion MUST be plain text. NO HTML tags (<, >), NO markdown, NO code blocks.
- Pick 4–8 high-value annotations total across all blocks. Skip nitpicks.
- kind: grammar = correctness; style = tone/word choice; clarity = simplification; suggestion = restructure/add detail.

Blocks:
${blocksFormatted}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body as { blocks?: unknown }
  const rawBlocks = body?.blocks
  if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) {
    return res.status(400).json({ error: 'blocks required' })
  }
  const blocks: IncomingBlock[] = []
  for (const b of rawBlocks) {
    if (
      b &&
      typeof b === 'object' &&
      typeof (b as { id?: unknown }).id === 'string' &&
      typeof (b as { plainText?: unknown }).plainText === 'string' &&
      (b as { plainText: string }).plainText.trim().length > 0
    ) {
      blocks.push({ id: (b as { id: string }).id, plainText: (b as { plainText: string }).plainText })
    }
  }
  if (blocks.length === 0) {
    return res.status(400).json({ error: 'no usable blocks' })
  }

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: reviewPrompt(blocks) }],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 2048,
    }),
  })

  if (!groqRes.ok) {
    return res.status(502).json({ error: 'groq_error', status: groqRes.status })
  }

  const groqData = (await groqRes.json()) as { choices: Array<{ message: { content: string } }> }
  const parsed = JSON.parse(groqData.choices[0].message.content) as { annotations?: unknown }

  const valid: ProposedAnnotation[] = []
  const allowedKinds: AnnotationKind[] = ['grammar', 'style', 'clarity', 'suggestion']
  const blockMap = new Map(blocks.map((b) => [b.id, b.plainText]))

  if (Array.isArray(parsed.annotations)) {
    for (const a of parsed.annotations) {
      if (!a || typeof a !== 'object') continue
      const r = a as Record<string, unknown>
      const blockId = r.blockId
      const originalText = r.originalText
      const suggestion = r.suggestion
      const kind = r.kind
      if (typeof blockId !== 'string') continue
      if (typeof originalText !== 'string' || originalText.length === 0) continue
      if (typeof suggestion !== 'string' || suggestion.length === 0) continue
      if (typeof kind !== 'string' || !allowedKinds.includes(kind as AnnotationKind)) continue
      // Guard: no HTML tags in originalText or suggestion
      if (/[<>]/.test(originalText) || /[<>]/.test(suggestion)) continue
      // originalText must appear verbatim in block
      const blockText = blockMap.get(blockId)
      if (!blockText || !blockText.includes(originalText)) continue
      valid.push({
        blockId,
        originalText,
        suggestion,
        rationale: typeof r.rationale === 'string' ? r.rationale : undefined,
        kind: kind as AnnotationKind,
      })
    }
  }

  return res.json({ annotations: valid })
}
