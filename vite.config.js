import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load .env.local and .env.admin into process.env for local Vite dev server
const envLocal = path.resolve(process.cwd(), '.env.local')
const envAdmin = path.resolve(process.cwd(), '.env.admin')
if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal })
if (fs.existsSync(envAdmin)) dotenv.config({ path: envAdmin })

// Local dev middleware that mirrors the Vercel serverless /api/copilot route
function copilotDevPlugin() {
  return {
    name: 'copilot-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/copilot', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          return res.end(JSON.stringify({ error: 'Method Not Allowed' }))
        }

        let bodyStr = ''
        req.on('data', (chunk) => {
          bodyStr += chunk
        })

        req.on('end', async () => {
          try {
            const body = bodyStr ? JSON.parse(bodyStr) : {}
            const authHeader = req.headers['authorization']

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
              res.statusCode = 401
              res.setHeader('Content-Type', 'application/json')
              return res.end(
                JSON.stringify({
                  error: 'Unauthorized: Missing or invalid authorization token.',
                })
              )
            }

            const token = authHeader.split(' ')[1]
            const supabaseUrl = process.env.VITE_SUPABASE_URL
            const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

            if (!supabaseUrl || !supabaseAnonKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              return res.end(
                JSON.stringify({ error: 'Supabase credentials missing.' })
              )
            }

            const supabase = createClient(supabaseUrl, supabaseAnonKey)
            const {
              data: { user },
              error: authError,
            } = await supabase.auth.getUser(token)

            if (authError || !user) {
              res.statusCode = 401
              res.setHeader('Content-Type', 'application/json')
              return res.end(
                JSON.stringify({
                  error: 'Unauthorized session: Verification failed.',
                })
              )
            }

            const apiKey = process.env.GEMINI_API_KEY
            if (!apiKey) {
              // Return friendly informational response if API key is not yet set
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              return res.end(
                JSON.stringify({
                  answer:
                    'Tactical Copilot Standby: GEMINI_API_KEY is not yet configured in your environment. Please add GEMINI_API_KEY to your .env.local file to activate live neural queries. Current system data snapshot was successfully verified.',
                  timestamp: new Date().toISOString(),
                })
              )
            }

            const ai = new GoogleGenAI({ apiKey })

            const systemInstruction = `You are RASAD Tactical Copilot, an operational logistics AI for a mountain military command center (Ladakh sector).
You are analyzing high-altitude forward posts (P01 to P12), depots (D01 to D03), and mountain passes (Khardung La, Chang La, Marsimik La).

OPERATIONAL RULES:
1. Answer concisely, directly, and strictly with exact numbers provided in the system context.
2. If data for a post, item, or question is not available in the context, explicitly acknowledge uncertainty (e.g., "Telemetry unconfirmed for this post"). Never invent false data.
3. You are a READ-ONLY advisory assistant. You never execute database writes, inventory adjustments, or state mutations.
4. Structure operational responses clearly with bullet points or concise metrics where appropriate.
5. Tone: Calm, professional, military-tactical brevity.`

            const prompt = `Current Operational System Telemetry Snapshot:
${JSON.stringify(body.systemContext || {}, null, 2)}

Operator Identity: ${user.email}
Operator Question: "${body.question}"

Provide a concise, direct tactical response based strictly on the snapshot above:`

            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
              config: {
                systemInstruction,
                temperature: 0.2,
              },
            })

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            return res.end(
              JSON.stringify({
                answer: response.text || 'No response generated.',
                timestamp: new Date().toISOString(),
              })
            )
          } catch (err) {
            console.error('Dev Copilot Error:', err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            return res.end(
              JSON.stringify({
                error: 'Internal error processing AI query.',
              })
            )
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), copilotDevPlugin()],
})
