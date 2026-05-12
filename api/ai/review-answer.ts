import type { VercelRequest, VercelResponse } from '@vercel/node'

type ReviewResult = {
  scores: Array<{ metric: string; value: number; feedback: string }>
  overall: number
  suggestions: string[]
  corrected_text: string
}

function reviewAnswerPrompt(question: string, answer: string): string {
  return `You are an expert English language coach evaluating a student's answer to a practice question. Return ONLY a valid JSON object — no markdown, no extra text.

Required structure:
{
  "scores": [
    { "metric": "Grammar",       "value": <0-100>, "feedback": "<1-2 sentences specific to this answer>" },
    { "metric": "Vocabulary",    "value": <0-100>, "feedback": "<1-2 sentences specific to this answer>" },
    { "metric": "Fluency",       "value": <0-100>, "feedback": "<1-2 sentences specific to this answer>" },
    { "metric": "Coherence",     "value": <0-100>, "feedback": "<1-2 sentences specific to this answer>" },
    { "metric": "Relevance",     "value": <0-100>, "feedback": "<1-2 sentences specific to this answer>" }
  ],
  "overall": <0-100>,
  "suggestions": ["<specific actionable improvement>", "<specific actionable improvement>"],
  "corrected_text": "<the full answer rewritten with corrections applied — preserve the author's voice and meaning>"
}

Metric definitions:
- Grammar: correctness of tense, agreement, articles, punctuation.
- Vocabulary: word choice, variety, precision.
- Fluency: how natural and flowing the prose reads.
- Coherence: logical flow between sentences and ideas.
- Relevance: how well the answer addresses the question.

overall = weighted average of the 5 scores.
suggestions = 2-4 concrete improvements for THIS specific answer.
corrected_text = a rewrite that applies all fixes. Keep meaning + roughly the same length.

Question:
"""
${question}
"""

Student's answer:
"""
${answer}
"""`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body as { question?: unknown; answer?: unknown }
  const question = body?.question
  const answer = body?.answer
  if (typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question required' })
  }
  if (typeof answer !== 'string' || !answer.trim()) {
    return res.status(400).json({ error: 'answer required' })
  }

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: reviewAnswerPrompt(question, answer) }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2048,
    }),
  })

  if (!groqRes.ok) {
    return res.status(502).json({ error: 'groq_error', status: groqRes.status })
  }

  const groqData = (await groqRes.json()) as { choices: Array<{ message: { content: string } }> }
  const result: ReviewResult = JSON.parse(groqData.choices[0].message.content)
  return res.json(result)
}
