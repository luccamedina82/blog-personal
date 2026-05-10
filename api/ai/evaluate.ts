import type { VercelRequest, VercelResponse } from '@vercel/node'

type EvaluatorResult = {
  scores: Array<{ metric: string; value: number; feedback: string }>
  overall: number
  suggestions: string[]
  corrected_text: string
}

function evaluatorPrompt(text: string): string {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const text = (req.body as { text?: unknown })?.text
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text required' })
  }

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: evaluatorPrompt(text) }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2048,
    }),
  })

  if (!groqRes.ok) {
    return res.status(502).json({ error: 'groq_error', status: groqRes.status })
  }

  const groqData = await groqRes.json() as {
    choices: Array<{ message: { content: string } }>
  }

  const result: EvaluatorResult = JSON.parse(groqData.choices[0].message.content)
  return res.json(result)
}
