export function evaluatorPrompt(text: string): string {
  return `You are an expert English language evaluator. Analyze the text below and return ONLY a valid JSON object — no markdown, no extra text.

Required structure:
{
  "scores": [
    { "metric": "Formality",   "value": <0-100>, "feedback": "<1-2 sentences specific to this text>" },
    { "metric": "Naturalness", "value": <0-100>, "feedback": "<1-2 sentences specific to this text>" },
    { "metric": "Nativeness",  "value": <0-100>, "feedback": "<1-2 sentences specific to this text>" },
    { "metric": "Complexity",  "value": <0-100>, "feedback": "<1-2 sentences specific to this text>" },
    { "metric": "Cohesion",    "value": <0-100>, "feedback": "<1-2 sentences specific to this text>" },
    { "metric": "Coherence",   "value": <0-100>, "feedback": "<1-2 sentences specific to this text>" }
  ],
  "overall": <0-100>,
  "suggestions": ["<specific actionable improvement>", "<specific actionable improvement>", "<specific actionable improvement>"],
  "corrected_text": "<the full text rewritten with all suggestions applied — preserve the author's voice, intent, and structure>"
}

Metric definitions:
- Formality: register and word choice on a casual→academic spectrum (100 = highly formal/academic)
- Naturalness: how closely the prose mirrors fluent everyday English (100 = perfectly natural)
- Nativeness: idiomatic phrasing typical of native speakers (100 = fully native-like)
- Complexity: lexical and syntactic difficulty (100 = very complex)
- Cohesion: connectors and reference chains across sentences (100 = highly cohesive)
- Coherence: logical progression of ideas at paragraph level (100 = perfectly coherent)

overall = weighted average of the 6 scores.
suggestions = 3 concrete, actionable improvements for THIS specific text (not generic tips).
corrected_text = a rewrite that applies all suggestions. Keep the same meaning and roughly the same length.

Text to analyze:
"""
${text}
"""`
}

export function cardsPrompt(content: string, deckCategory: string, count: number): string {
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
