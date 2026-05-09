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
  "suggestions": ["<specific actionable improvement>", "<specific actionable improvement>", "<specific actionable improvement>"]
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

Text to analyze:
"""
${text}
"""`
}
