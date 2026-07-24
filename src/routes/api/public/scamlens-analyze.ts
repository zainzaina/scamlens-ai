import { createFileRoute } from '@tanstack/react-router'

const SYSTEM_PROMPT = `You are ScamLens AI, an expert cybersecurity analyst specialized in detecting scams, phishing, fraud and social engineering.
Analyze the user-provided content (text message, email, URL, or screenshot content) and return a STRICT JSON object matching this schema. Do not include markdown fences, commentary, or extra text. Only JSON.

Schema:
{
  "risk_score": number (0-100),
  "risk_level": "Safe" | "Low Risk" | "Suspicious" | "High Risk" | "Critical",
  "scam_type": "Phishing" | "Bank Scam" | "Government Scam" | "Investment Scam" | "Crypto Scam" | "Employment Scam" | "Lottery Scam" | "Tech Support Scam" | "Romance Scam" | "Marketplace Scam" | "Unknown",
  "confidence": number (0-100),
  "summary": string (1-2 sentences),
  "explanation": string (2-4 sentences, detailed),
  "manipulation_techniques": string[] (subset of: "Urgency","Fear","Authority","Greed","Curiosity","Scarcity","Trust Abuse"),
  "red_flags": string[] (subset of: "Suspicious Links","Unknown Domains","Requests Password","Requests OTP","Requests Money","Grammar Issues","Spoofing","Impersonation","Suspicious Tone","Emotional Manipulation"),
  "scam_dna": string[] (5-8 concrete detected behaviors),
  "future_impact": string[] (3-6 concrete outcomes if the victim follows the message),
  "victim_timeline": [ { "when": string, "event": string } ] (5-7 realistic steps),
  "recommendation": "Ignore" | "Block" | "Delete" | "Verify" | "Report",
  "educational_tip": string (one actionable tip),
  "awareness_score": number (0-100, how well a cautious user would detect this),
  "awareness_notes": string[] (2-3 short observations)
}

Never invent facts about the user. If content is benign, still return the schema with a low risk score and appropriate values.`

type AnalyzeBody = {
  text?: string
  url?: string
}

async function handlePost({ request }: { request: Request }) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server missing GROQ_API_KEY' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  let body: AnalyzeBody
  try {
    body = (await request.json()) as AnalyzeBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  const { text, url } = body || {}
  if (!text && !url) {
    return new Response(JSON.stringify({ error: 'EMPTY_INPUT' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  const userContent: Array<Record<string, unknown>> = []
  if (text) userContent.push({ type: 'text', text: `CONTENT TO ANALYZE (text/message):\n"""${text}"""` })
  if (url)
    userContent.push({
      type: 'text',
      text: `CONTENT TO ANALYZE (URL): ${url}\nAssess the URL for phishing indicators (typosquatting, unusual TLDs, punycode, credential harvesting patterns).`,
    })

  const groqBody: Record<string, unknown> = {
    model: 'openai/gpt-oss-120b',
    temperature: 0.3,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(groqBody),
  })

  if (!res.ok) {
    const t = await res.text()
    return new Response(
      JSON.stringify({ error: `Groq API error ${res.status}: ${t.slice(0, 500)}` }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    )
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const raw = data?.choices?.[0]?.message?.content || ''
  const extractJson = (s: string): string | null => {
    const start = s.indexOf('{')
    if (start < 0) return null
    let depth = 0, inStr = false, esc = false
    for (let i = start; i < s.length; i++) {
      const c = s[i]
      if (inStr) {
        if (esc) esc = false
        else if (c === '\\') esc = true
        else if (c === '"') inStr = false
      } else {
        if (c === '"') inStr = true
        else if (c === '{') depth++
        else if (c === '}') { depth--; if (depth === 0) return s.slice(start, i + 1) }
      }
    }
    return null
  }
  let json: Record<string, unknown> | null = null
  try { json = JSON.parse(raw) } catch { /* try extract */ }
  if (!json) {
    const candidate = extractJson(raw)
    if (candidate) { try { json = JSON.parse(candidate) } catch { json = null } }
  }
  if (!json) {
    return new Response(
      JSON.stringify({ error: 'Model did not return valid JSON', raw: raw.slice(0, 400) }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    )
  }

  return new Response(JSON.stringify(json), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

export const Route = createFileRoute('/api/public/scamlens-analyze')({
  server: {
    handlers: {
      POST: handlePost,
    },
  },
})
