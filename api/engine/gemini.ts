import { GoogleGenerativeAI } from "@google/generative-ai"
import { state, type Patient, type Room } from "../store/state"

interface GeminiResult {
  selectedId: string
  reason: string
  aiUsed: boolean
}

interface Candidate {
  id: string
  name: string
  waitMin: number
  queuePosition: number
  medicalReason: string
}

const TIMEOUT_MS = 8000
const MAX_RETRIES = 2

export async function selectCandidate(
  candidates: Patient[],
  sourceRoom: Room,
  destRoom: Room,
  thresholdMin: number,
): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || candidates.length < 2) {
    return fallback(candidates)
  }

  const now = Date.now()
  const candidateData: Candidate[] = candidates.map((p) => ({
    id: p.id,
    name: p.name,
    waitMin: Math.floor((now - new Date(p.checkedInAt).getTime()) / 60000),
    queuePosition: p.queuePosition ?? 99,
    medicalReason: p.medicalReason,
  }))

  const sourceLoad = sourceRoom.queue.length * sourceRoom.avgDurationMin
  const destLoad = destRoom.queue.length * destRoom.avgDurationMin
  const delta = sourceLoad - destLoad

  const enabledRules = state.settings.aiPrompt
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (line.includes("[ ]")) return false // Skip disabled rules
      return line.length > 0
    })
    .map((line) => line.replace(/^-\s*\[[x ]\]\s*/, "").replace(/^-\s*/, "").trim())
    .join("\n- ")

  const prompt = `Current situation:
Source room: ${sourceRoom.name}, load = ${sourceLoad} min
Destination room: ${destRoom.name}, load = ${destLoad} min
Load delta: ${delta} min (threshold: ${thresholdMin} min)

Eligible candidates to move (all Normal patients):
${JSON.stringify(candidateData, null, 2)}

Rules:
- ${enabledRules}
Respond with valid JSON only:
{
  "selected_id": "...",
  "reason": "A highly detailed, natural explanation in English explaining the choice comprehensively, comparing wait time, queue position, and medical urgency (e.g., 'Although wait times are equal, Laura Davis is selected due to her urgent pre-surgery status and highest queue position, minimizing disruption to the flow of the source room')"
}`

  console.log("[gemini] request", JSON.stringify({ prompt, candidateData, sourceLoad, destLoad, delta }, null, 2))

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
    systemInstruction:
      "You are a queue coordinator AI for a medical wellness center. You help decide which patient should be moved to balance room loads. Always respond with valid JSON only. No explanation outside JSON.",
  })

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resultPromise = model.generateContent(prompt)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS),
      )

      const result = await Promise.race([resultPromise, timeoutPromise])
      const text = result.response.text().trim()

      console.log("[gemini] response", text)

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("no JSON")

      const parsed = JSON.parse(jsonMatch[0]) as { selected_id: string; reason: string }
      const valid = candidates.find((c) => c.id === parsed.selected_id)
      if (!valid) throw new Error("invalid selected_id")

      return { selectedId: parsed.selected_id, reason: parsed.reason, aiUsed: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const is429 = msg.includes("429") || msg.includes("Too Many Requests")
      if (is429 && attempt < MAX_RETRIES) {
        const delay = 7000 * (attempt + 1)
        console.log(`[gemini] 429 — retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      console.log("[gemini] error / fallback", msg)
      return fallback(candidates)
    }
  }

  return fallback(candidates)
}

function fallback(candidates: Patient[]): GeminiResult {
  return {
    selectedId: candidates[0].id,
    reason: "Auto-selected longest-waiting patient",
    aiUsed: false,
  }
}
