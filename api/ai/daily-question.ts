import type { VercelRequest, VercelResponse } from '@vercel/node'

type Tone = 'casual' | 'formal' | 'technical'

const TONE_HINT: Record<Tone, string> = {
  casual:
    'Casual: small-talk, personal opinion, daily life, hobbies. Friendly conversational style. Examples: "How was your week?", "What\'s your favorite way to spend a Sunday?"',
  formal:
    'Formal: argumentative, essay-style, debate or analysis. Examples: "Argue for or against remote work in 4-5 sentences.", "What are the trade-offs of free higher education?"',
  technical:
    'Technical: software, science, math, engineering. Requires reasoning with technical vocabulary. Examples: "Explain how a hash map handles collisions.", "Compare TCP vs UDP for real-time applications."',
}

function dailyQuestionPrompt(tone: Tone, recent: string[]): string {
  const recentBlock = recent.length > 0
    ? `\n\nAvoid repeating these recent questions (vary the topic):\n${recent.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : ''
  return `You are an English practice coach. Generate ONE English practice question.

Tone: ${tone}
${TONE_HINT[tone]}

Requirements:
- Output strict JSON: { "question": "<the question in English, under 30 words>" }
- The question should invite a 3-8 sentence response.
- Do NOT include any greeting or preamble.
- Pick an interesting, specific angle (avoid generic openers like "How are you?").${recentBlock}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body as { tone?: unknown; recent?: unknown }
  const tone = body?.tone
  if (tone !== 'casual' && tone !== 'formal' && tone !== 'technical') {
    return res.status(400).json({ error: 'invalid tone' })
  }
  const recent = Array.isArray(body?.recent)
    ? (body.recent as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 8)
    : []

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: dailyQuestionPrompt(tone, recent) }],
      response_format: { type: 'json_object' },
      temperature: 0.9,
      max_tokens: 200,
    }),
  })

  if (!groqRes.ok) {
    return res.status(502).json({ error: 'groq_error', status: groqRes.status })
  }

  const groqData = (await groqRes.json()) as { choices: Array<{ message: { content: string } }> }
  const parsed = JSON.parse(groqData.choices[0].message.content) as { question: string }
  return res.json({ question: parsed.question, model: 'llama-3.3-70b-versatile' })
}
