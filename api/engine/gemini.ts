import { GoogleGenerativeAI } from "@google/generative-ai"
import { state, type Patient, type Room } from "../store/state"
import type { Env } from "../index"

let cfEnv: Env | null = null

export function setEnv(env: Env) {
  cfEnv = env
}

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

export interface BatchPair {
  pairId: string
  sourceRoom: Room
  destRoom: Room
  candidates: Patient[]
  thresholdMin: number
}

export interface BatchResult {
  pairId: string
  selectedId: string
  reason: string
  aiUsed: boolean
}

const TIMEOUT_MS = 8000
const MAX_RETRIES = 2

export async function selectCandidate(
  candidates: Patient[],
  sourceRoom: Room,
  destRoom: Room,
  thresholdMin: number,
): Promise<GeminiResult> {
  const apiKey = cfEnv?.GEMINI_API_KEY
  if (!apiKey || candidates.length < 2) {
    return fallback(candidates)
  }

  const now = Date.now()
  const candidateData = buildCandidateData(candidates, now)
  const sourceLoad = sourceRoom.queue.length * sourceRoom.avgDurationMin
  const destLoad = destRoom.queue.length * destRoom.avgDurationMin
  const delta = sourceLoad - destLoad
  const enabledRules = getEnabledRules()

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
  "reason": "One short phrase (max 8 words) explaining why this patient was chosen. Focus only on the deciding factor. Examples: 'Longest wait time', 'Urgent pre-surgery status', 'Highest queue position + critical condition'"
}`

  console.log("[gemini] request\n" + prompt)

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
    // model: "gemini-2.5-flash",
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

      console.log("[gemini] response\n" + text)

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

function getEnabledRules(): string {
  return state.settings.aiPrompt
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !line.includes("[ ]") && line.length > 0)
    .map((line) => line.replace(/^-\s*\[[x ]\]\s*/, "").replace(/^-\s*/, "").trim())
    .join("\n- ")
}

function buildCandidateData(candidates: Patient[], now: number): Candidate[] {
  return candidates.map((p) => ({
    id: p.id,
    name: p.name,
    waitMin: Math.floor((now - new Date(p.checkedInAt).getTime()) / 60000),
    queuePosition: p.queuePosition ?? 99,
    medicalReason: p.medicalReason,
  }))
}

export async function selectCandidatesBatch(pairs: BatchPair[]): Promise<BatchResult[]> {
  const apiKey = cfEnv?.GEMINI_API_KEY
  if (!apiKey || pairs.length === 0) {
    return pairs.map((p) => ({ pairId: p.pairId, ...fallback(p.candidates), aiUsed: false }))
  }

  const now = Date.now()
  const enabledRules = getEnabledRules()

  const pairsPayload = pairs.map((p) => {
    const sourceLoad = p.sourceRoom.queue.length * p.sourceRoom.avgDurationMin
    const destLoad = p.destRoom.queue.length * p.destRoom.avgDurationMin
    return {
      pair_id: p.pairId,
      source: { name: p.sourceRoom.name, load_min: sourceLoad },
      dest: { name: p.destRoom.name, load_min: destLoad },
      delta_min: sourceLoad - destLoad,
      threshold_min: p.thresholdMin,
      candidates: buildCandidateData(p.candidates, now),
    }
  })

  const prompt = `You are assigning patients to balance room loads across multiple room pairs simultaneously.

Room pairs needing rebalance:
${JSON.stringify(pairsPayload, null, 2)}

Rules:
- ${enabledRules}

IMPORTANT: Each patient can only appear in one assignment. If a patient is a candidate in multiple pairs, assign them to only the most beneficial pair.

Respond with valid JSON array only — one entry per pair where a beneficial move exists. Omit pairs with no good candidate:
[
  {
    "pair_id": "...",
    "selected_id": "...",
    "reason": "One short phrase (max 8 words) explaining the deciding factor"
  }
]`

  console.log("[gemini] batch request\n" + prompt)

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite",
    systemInstruction:
      "You are a queue coordinator AI for a medical wellness center. You help decide which patients should be moved to balance room loads. Always respond with valid JSON only. No explanation outside JSON.",
  })

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resultPromise = model.generateContent(prompt)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS),
      )

      const result = await Promise.race([resultPromise, timeoutPromise])
      const text = result.response.text().trim()

      console.log("[gemini] batch response\n" + text)

      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error("no JSON array")

      const parsed = JSON.parse(jsonMatch[0]) as Array<{ pair_id: string; selected_id: string; reason: string }>

      const assignedPatients = new Set<string>()
      const results: BatchResult[] = []

      for (const entry of parsed) {
        const pair = pairs.find((p) => p.pairId === entry.pair_id)
        if (!pair) continue
        const valid = pair.candidates.find((c) => c.id === entry.selected_id)
        if (!valid || assignedPatients.has(entry.selected_id)) continue
        assignedPatients.add(entry.selected_id)
        results.push({ pairId: entry.pair_id, selectedId: entry.selected_id, reason: entry.reason, aiUsed: true })
      }

      // Fallback for pairs Gemini skipped
      for (const pair of pairs) {
        if (!results.find((r) => r.pairId === pair.pairId)) {
          results.push({ pairId: pair.pairId, ...fallback(pair.candidates), aiUsed: false })
        }
      }

      return results
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const is429 = msg.includes("429") || msg.includes("Too Many Requests")
      if (is429 && attempt < MAX_RETRIES) {
        const delay = 7000 * (attempt + 1)
        console.log(`[gemini] batch 429 — retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      console.log("[gemini] batch error / fallback", msg)
      return pairs.map((p) => ({ pairId: p.pairId, ...fallback(p.candidates), aiUsed: false }))
    }
  }

  return pairs.map((p) => ({ pairId: p.pairId, ...fallback(p.candidates), aiUsed: false }))
}
