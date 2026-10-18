import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    // 1. Verify user authentication via Supabase JWT token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized: Missing or invalid authorization token.',
      })
    }

    const token = authHeader.split(' ')[1]
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseAnonKey =
      process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({
        error: 'Server configuration error: Supabase credentials missing.',
      })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({
        error: 'Unauthorized session: Verification failed. Please log in again.',
      })
    }

    // 2. Validate request payload
    const { question, systemContext } = req.body || {}
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Missing question in request body.' })
    }

    // 3. Check for GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return res.status(500).json({
        error:
          'GEMINI_API_KEY is not configured on the server. Please add GEMINI_API_KEY to your environment variables.',
      })
    }

    // 4. Initialize Gemini client with free current model (gemini-3.7-flash or gemini-2.5-flash)
    const ai = new GoogleGenAI({ apiKey })

    // Strict system prompt enforcing operational precision
    const systemInstruction = `You are RASAD Tactical Copilot, an operational logistics AI for a mountain military command center (Ladakh sector).
You are analyzing high-altitude forward posts (P01 to P12), depots (D01 to D03), and mountain passes (Khardung La, Chang La, Marsimik La).

OPERATIONAL RULES:
1. Answer concisely, directly, and strictly with exact numbers provided in the system context.
2. If data for a post, item, or question is not available in the context, explicitly acknowledge uncertainty (e.g., "Telemetry unconfirmed for this post"). Never invent false data.
3. You are a READ-ONLY advisory assistant. You never execute database writes, inventory adjustments, or state mutations.
4. Structure operational responses clearly with bullet points or concise metrics where appropriate.
5. Tone: Calm, professional, military-tactical brevity.`

    const prompt = `Current Operational System Telemetry Snapshot:
${JSON.stringify(systemContext || {}, null, 2)}

Operator Identity: ${user.email}
Operator Question: "${question}"

Provide a concise, direct tactical response based strictly on the snapshot above:`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    })

    const answer =
      response.text ||
      'No operational output generated. Please reformulate your query.'

    return res.status(200).json({
      answer,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Copilot API Handler Error:', err)
    return res.status(500).json({
      error:
        'An error occurred while processing your tactical request with the AI engine.',
    })
  }
}
