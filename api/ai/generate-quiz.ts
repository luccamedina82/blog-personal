import type { VercelRequest, VercelResponse } from '@vercel/node'

type GeneratedQuestion = {
  question: string
  type: 'multiple_choice' | 'true_false' | 'open'
  options?: string[]
  answer: string
  explanation: string
}

function quizPrompt(
  notes: Array<{ title: string; content: string }>,
  quizType: string,
  count: number,
): string {
  const typeInstr =
    quizType === 'multiple_choice'
      ? 'All questions must be type "multiple_choice" with exactly 4 options labeled A–D.'
      : quizType === 'true_false'
      ? 'All questions must be type "true_false" with options ["True", "False"].'
      : quizType === 'open'
      ? 'All questions must be type "open" with no options field.'
      : 'Mix the question types: use roughly equal parts "multiple_choice", "true_false", and "open".'

  const notesText = notes
    .map((n, i) => `### Note ${i + 1}: ${n.title}\n${n.content}`)
    .join('\n\n---\n\n')

  return `You are a quiz generator for study notes. Generate exactly ${count} questions from the notes below.
${typeInstr}

Return ONLY a valid JSON object — no markdown, no extra text.

Required structure:
{
  "questions": [
    {
      "question": "<clear, specific question based directly on the notes>",
      "type": "multiple_choice",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "<full option text of the correct answer, e.g. 'A. ...' >",
      "explanation": "<why this is correct, referencing the source note>"
    }
  ]
}

Rules:
- Questions must be directly answerable from the provided notes.
- For multiple_choice: exactly 4 options labeled A. B. C. D., answer = full option text.
- For true_false: options = ["True", "False"], answer = "True" or "False".
- For open: no options field, answer = concise but complete expected response.
- Each explanation must mention which note the answer comes from.
- Write questions and answers in the same language as the notes.

Notes:
${notesText}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const body = req.body as {
    notes?: Array<{ title: string; content: string }>
    quizType?: string
    count?: number
  }

  if (!Array.isArray(body.notes) || body.notes.length === 0)
    return res.status(400).json({ error: 'notes required' })
  if (!body.quizType)
    return res.status(400).json({ error: 'quizType required' })

  const count = Math.min(Math.max(Number(body.count) || 8, 3), 20)
  const prompt = quizPrompt(body.notes, body.quizType, count)

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.4,
          maxOutputTokens: 4096,
        },
      }),
    },
  )

  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => '')
    return res.status(502).json({ error: 'gemini_error', status: geminiRes.status, detail: errText })
  }

  const geminiData = await geminiRes.json() as {
    candidates?: Array<{ content: { parts: Array<{ text: string }> } }>
    error?: { message: string }
  }

  if (geminiData.error) {
    return res.status(502).json({ error: 'gemini_error', detail: geminiData.error.message })
  }

  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return res.status(502).json({ error: 'empty_response' })

  const result = JSON.parse(text) as { questions: GeneratedQuestion[] }
  return res.json(result)
}
