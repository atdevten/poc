import { getFromLobby, removeFromLobby } from "../engine/queue"

// ─── Types ────────────────────────────────────────────────────────────────────

export type PatientType = "emergency" | "vip" | "normal"

export type PatientStatus =
  | "LOBBY"
  | "WAITING"
  | "IN_CONSULTATION"
  | "DONE_ROOM"
  | "COMPLETED"
  | "CANCELLED"

export interface Patient {
  id: string
  name: string
  type: PatientType
  status: PatientStatus
  checkedInAt: Date
  lobbySince: Date | null
  currentRoomId: string | null
  completedRooms: string[]
  remainingRooms: string[]
  rebalanceCount: number
  queuePosition: number | null
  medicalReason: string
}

export interface Room {
  id: string
  name: string
  roomType: string
  avgDurationMin: number
  status: "active" | "idle" | "closed"
  currentPatient: Patient | null
  consultStartAt: Date | null
  queue: Patient[]
}

export interface RoomType {
  id: string
  name: string
  icon: string
  openTime: string
  closeTime: string
  order: number
  avgDurationMin: number
}

export interface Settings {
  rebalanceThresholdMin: number
  maxQueuePerRoom: number
  mode: "auto" | "suggest"
  emergencySoundAlert: boolean
  emergencyBannerAlert: boolean
  allowVipRebalance: boolean
  allowNormalRebalance: boolean
  maxRebalancePerPatient: number
  aiPrompt: string
  roomTypes: RoomType[]
}

export interface RebalanceLog {
  id: string
  timestamp: Date
  trigger: "done" | "emergency" | "periodic" | "manual"
  patientId: string
  fromRoomId: string
  toRoomId: string
  reason: string
  aiUsed: boolean
}

export type WSEventType =
  | "ROOM_UPDATED"
  | "LOBBY_UPDATED"
  | "REBALANCE_SUGGEST"
  | "REBALANCE_APPLIED"
  | "EMERGENCY_ADDED"
  | "PATIENT_COMPLETED"
  | "NOTIFICATION"
  | "SETTINGS_UPDATED"

export interface WSEvent {
  type: WSEventType
  payload: unknown
  timestamp: Date
}

export interface AppState {
  patients: Map<string, Patient>
  rooms: Map<string, Room>
  lobby: Patient[]
  settings: Settings
  logs: RebalanceLog[]
  geminiEnabled: boolean
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const defaultSettings: Settings = {
  rebalanceThresholdMin: 1,
  maxQueuePerRoom: 5,
  mode: "suggest",
  emergencySoundAlert: true,
  emergencyBannerAlert: true,
  allowVipRebalance: false,
  allowNormalRebalance: true,
  maxRebalancePerPatient: 3,
  aiPrompt: "- Pick at least 2 patients\n- Prefer longer wait time (fairness)\n- Prefer higher queue position number (less disruptive to move)\n- If two candidates have wait times within 5 minutes of each other, prefer the one with a more urgent or serious medical reason\n- Balance all three factors — do not pick by a single criterion blindly\n- Write a detailed and natural reason in English comparing wait times, queue position, and medical urgency (e.g., 'Although wait times are equal, Laura Davis is selected due to her urgent pre-surgery status and highest queue position, minimizing disruption to the flow of the source room')",
  roomTypes: [
    { id: "bmi", name: "BMI Check", icon: "🏃", openTime: "08:00", closeTime: "17:00", order: 1, avgDurationMin: 5 },
    { id: "blood_test", name: "Blood Test", icon: "🩸", openTime: "08:00", closeTime: "16:00", order: 2, avgDurationMin: 12 },
    { id: "radiology", name: "Radiology", icon: "🔬", openTime: "08:00", closeTime: "12:00", order: 3, avgDurationMin: 15 },
  ],
}

function seedRooms(settings: Settings): Map<string, Room> {
  const rooms = new Map<string, Room>()
  const roomCounts: Record<string, number> = { bmi: 2, blood_test: 3, radiology: 1 }

  for (const rt of settings.roomTypes) {
    const count = roomCounts[rt.id] ?? 1
    for (let i = 1; i <= count; i++) {
      const id = `${rt.id}-${i}`
      rooms.set(id, {
        id,
        name: `${rt.name} Room ${i}`,
        roomType: rt.id,
        avgDurationMin: rt.avgDurationMin,
        status: "idle",
        currentPatient: null,
        consultStartAt: null,
        queue: [],
      })
    }
  }
  return rooms
}

// ─── Demo seed patients ───────────────────────────────────────────────────────

function makePatient(
  id: string,
  name: string,
  type: PatientType,
  status: PatientStatus,
  completedRooms: string[],
  allRoomTypes: string[],
  waitMinutesAgo: number,
  medicalReason: string,
): Patient {
  const now = new Date()
  return {
    id,
    name,
    type,
    status,
    checkedInAt: new Date(now.getTime() - waitMinutesAgo * 60_000),
    lobbySince: status === "LOBBY" ? new Date(now.getTime() - waitMinutesAgo * 60_000) : null,
    currentRoomId: null,
    completedRooms,
    remainingRooms: allRoomTypes.filter((rt) => !completedRooms.includes(rt)),
    rebalanceCount: 0,
    queuePosition: null,
    medicalReason,
  }
}

export function seedDemoData(appState: AppState): void {
  if (appState.patients.size > 0) return  // already seeded — prevent duplicates on constructor re-call

  const allRooms = defaultSettings.roomTypes.map((rt) => rt.id)

  const demoPatients: Patient[] = [
    // Blood Test Room 1 — HIGH load
    makePatient("V001", "Diana Carter", "vip", "IN_CONSULTATION", ["bmi"], allRooms, 25, "Routine annual blood panel"),
    makePatient("N002", "James Miller", "normal", "WAITING", ["bmi"], allRooms, 22, "Routine cholesterol check"),
    makePatient("N003", "Kevin Brown", "normal", "WAITING", ["bmi"], allRooms, 21, "Suspected anemia, fatigue for 3 weeks"),
    makePatient("N004", "Brian Wilson", "normal", "WAITING", ["bmi"], allRooms, 20, "Diabetes follow-up, HbA1c check"),
    makePatient("N005", "Laura Davis", "normal", "WAITING", ["bmi"], allRooms, 19, "Pre-surgery blood screening, urgent"),
    // Blood Test Room 2 — idle (triggers rebalance from room 1)
    makePatient("N006", "Mark Taylor", "normal", "LOBBY", ["bmi"], allRooms, 14, "Liver function test, mild jaundice"),
    makePatient("N007", "Nancy White", "normal", "LOBBY", ["bmi"], allRooms, 10, "Thyroid hormone level check"),
    // Blood Test Room 3 — idle (no one)
    // BMI Room 1 — HIGH load (bmi-2 is idle → triggers rebalance for bmi type)
    makePatient("N008", "Alice Johnson", "normal", "IN_CONSULTATION", [], allRooms, 25, "Annual wellness check"),
    makePatient("N021", "Tom Baker", "normal", "WAITING", [], allRooms, 19, "Routine BMI tracking"),
    makePatient("N022", "Sara Connor", "normal", "WAITING", [], allRooms, 18, "Pre-pregnancy health screening"),
    makePatient("N023", "Mike Chen", "normal", "WAITING", [], allRooms, 17, "Hypertension with dangerously high BMI"),
    makePatient("N024", "Anna Sousa", "normal", "WAITING", [], allRooms, 16, "Routine BMI tracking"),
    // BMI Room 2 — idle (no one)
    // Radiology Room 1 — MEDIUM load
    makePatient("N009", "Frank Moore", "normal", "IN_CONSULTATION", ["bmi", "blood_test"], allRooms, 8, "Chest X-ray, persistent cough"),
    makePatient("N010", "George Harris", "normal", "WAITING", ["bmi", "blood_test"], allRooms, 12, "Back pain, suspected disc herniation"),
    // Lobby patients
    makePatient("E011", "Chris Evans", "emergency", "LOBBY", [], allRooms, 2, "Acute chest pain, possible MI"),
    makePatient("V012", "Diana Prince", "vip", "LOBBY", ["bmi"], allRooms, 5, "Executive health screening"),
    makePatient("N013", "Paul Martin", "normal", "LOBBY", [], allRooms, 11, "Routine annual check-up"),
    makePatient("N014", "Carol Smith", "normal", "LOBBY", ["bmi", "blood_test"], allRooms, 20, "Joint pain, suspected arthritis"),
    // Blood Test Room 3 — LOW load (has some queue)
    makePatient("N030", "Rachel Green", "normal", "WAITING", ["bmi"], allRooms, 12, "Routine blood glucose check"),
    makePatient("N031", "David Kim", "normal", "WAITING", ["bmi"], allRooms, 9, "Iron deficiency follow-up"),
    // BMI Room 2 — LOW load (has some queue)
    makePatient("N032", "Sophie Lane", "normal", "WAITING", [], allRooms, 11, "Weight management consult"),
    makePatient("N033", "Jason Wu", "normal", "WAITING", [], allRooms, 7, "Post-diet BMI check"),
  ]

  // Register all patients
  for (const p of demoPatients) {
    appState.patients.set(p.id, p)
  }

  // Assign to rooms
  const assignCurrent = (roomId: string, patient: Patient) => {
    const room = appState.rooms.get(roomId)!
    room.currentPatient = patient
    room.consultStartAt = patient.checkedInAt
    room.status = "active"
    patient.currentRoomId = roomId
  }

  const addToQueue = (roomId: string, patient: Patient, pos: number) => {
    const room = appState.rooms.get(roomId)!
    room.queue.push(patient)
    patient.currentRoomId = roomId
    patient.queuePosition = pos
  }

  assignCurrent("blood_test-1", appState.patients.get("V001")!)
  addToQueue("blood_test-1", appState.patients.get("N002")!, 1)
  addToQueue("blood_test-1", appState.patients.get("N003")!, 2)
  addToQueue("blood_test-1", appState.patients.get("N004")!, 3)
  addToQueue("blood_test-1", appState.patients.get("N005")!, 4)

  assignCurrent("bmi-1", appState.patients.get("N008")!)
  addToQueue("bmi-1", appState.patients.get("N021")!, 1)
  addToQueue("bmi-1", appState.patients.get("N022")!, 2)
  addToQueue("bmi-1", appState.patients.get("N023")!, 3)
  addToQueue("bmi-1", appState.patients.get("N024")!, 4)

  assignCurrent("radiology-1", appState.patients.get("N009")!)
  addToQueue("radiology-1", appState.patients.get("N010")!, 1)

  addToQueue("blood_test-3", appState.patients.get("N030")!, 1)
  addToQueue("blood_test-3", appState.patients.get("N031")!, 2)

  addToQueue("bmi-2", appState.patients.get("N032")!, 1)
  addToQueue("bmi-2", appState.patients.get("N033")!, 2)

  // Lobby (priority order: emergency first, then vip, then normal)
  for (const id of ["E011", "V012", "N006", "N007", "N013", "N014"]) {
    const p = appState.patients.get(id)!
    p.lobbySince = new Date(Date.now() - (demoPatients.find((x) => x.id === id)!.checkedInAt.getTime() - Date.now()) * -1)
    appState.lobby.push(p)
  }

  // Fill idle rooms from lobby using normal assignment logic
  for (const room of appState.rooms.values()) {
    if (room.status !== "idle") continue
    const patient = getFromLobby(appState, room.roomType)
    if (!patient) continue
    removeFromLobby(appState, patient.id)
    room.currentPatient = patient
    room.consultStartAt = new Date()
    room.status = "active"
    patient.status = "IN_CONSULTATION"
    patient.currentRoomId = room.id
  }

  // Add one rebalance log entry
  appState.logs.push({
    id: "LOG001",
    timestamp: new Date(Date.now() - 5 * 60_000),
    trigger: "done",
    patientId: "N005",
    fromRoomId: "blood_test-1",
    toRoomId: "blood_test-3",
    reason: "Laura Davis waited longest and is last in queue — least disruptive to move.",
    aiUsed: true,
  })
}

// ─── Singleton ────────────────────────────────────────────────────────────────

const initialRooms = seedRooms(defaultSettings)

export const state: AppState = {
  patients: new Map(),
  rooms: initialRooms,
  lobby: [],
  settings: defaultSettings,
  logs: [],
  geminiEnabled: true,
}

export function resetState(): void {
  state.patients.clear()
  state.rooms.clear()
  state.lobby.length = 0
  state.logs.length = 0
  state.settings = { ...defaultSettings }
  state.geminiEnabled = true

  for (const [id, room] of seedRooms(defaultSettings)) {
    state.rooms.set(id, room)
  }

  seedDemoData(state)
}
