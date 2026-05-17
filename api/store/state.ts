import { getFromLobby, removeFromLobby } from "../engine/queue"

// ─── Types ────────────────────────────────────────────────────────────────────

export type PatientType = "emergency" | "vip" | "normal"

export type PatientStatus =
  | "LOBBY"
  | "WAITING"
  | "IN_CONSULTATION"
  | "DONE_ROOM"
  | "COMPLETED"
  | "NO_SHOW"
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
  rebalancedToday: boolean
  queuePosition: number | null
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
  noShowTimeoutMin: number
  emergencySoundAlert: boolean
  emergencyBannerAlert: boolean
  allowVipRebalance: boolean
  allowNormalRebalance: boolean
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
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const defaultSettings: Settings = {
  rebalanceThresholdMin: 20,
  maxQueuePerRoom: 5,
  mode: "suggest",
  noShowTimeoutMin: 15,
  emergencySoundAlert: true,
  emergencyBannerAlert: true,
  allowVipRebalance: false,
  allowNormalRebalance: true,
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
    rebalancedToday: false,
    queuePosition: null,
  }
}

function seedDemoData(appState: AppState): void {
  const allRooms = defaultSettings.roomTypes.map((rt) => rt.id)

  const demoPatients: Patient[] = [
    // Blood Test Room 1 — HIGH load
    makePatient("V001", "Diana Carter",  "vip",    "IN_CONSULTATION", ["bmi"],           allRooms, 15),
    makePatient("N002", "James Miller", "normal", "WAITING",         ["bmi"],           allRooms, 22),
    makePatient("N003", "Kevin Brown",  "normal", "WAITING",         ["bmi"],           allRooms, 18),
    makePatient("N004", "Brian Wilson", "normal", "WAITING",         ["bmi"],           allRooms, 14),
    makePatient("N005", "Laura Davis",  "normal", "WAITING",         ["bmi"],           allRooms, 10),
    // Blood Test Room 2 — MEDIUM load
    makePatient("N006", "Mark Taylor",  "normal", "IN_CONSULTATION", ["bmi"],           allRooms,  4),
    makePatient("N007", "Nancy White",  "normal", "WAITING",         ["bmi"],           allRooms,  8),
    // Blood Test Room 3 — idle (no one)
    // BMI Room 1 — LOW load
    makePatient("N008", "Alice Johnson","normal", "IN_CONSULTATION", [],                allRooms,  3),
    // Radiology Room 1 — MEDIUM load
    makePatient("N009", "Frank Moore",  "normal", "IN_CONSULTATION", ["bmi", "blood_test"], allRooms, 8),
    makePatient("N010", "George Harris","normal", "WAITING",         ["bmi", "blood_test"], allRooms, 12),
    // Lobby patients
    makePatient("E011", "Chris Evans",  "emergency", "LOBBY",        [],                allRooms,  2),
    makePatient("V012", "Diana Prince", "vip",    "LOBBY",           ["bmi"],           allRooms,  5),
    makePatient("N013", "Paul Martin",  "normal", "LOBBY",           [],                allRooms, 11),
    makePatient("N014", "Carol Smith",  "normal", "LOBBY",           ["bmi", "blood_test"], allRooms, 20),
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

  assignCurrent("blood_test-2", appState.patients.get("N006")!)
  addToQueue("blood_test-2", appState.patients.get("N007")!, 1)

  assignCurrent("bmi-1", appState.patients.get("N008")!)

  assignCurrent("radiology-1", appState.patients.get("N009")!)
  addToQueue("radiology-1", appState.patients.get("N010")!, 1)

  // Lobby (priority order: emergency first, then vip, then normal)
  for (const id of ["E011", "V012", "N013", "N014"]) {
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
}

seedDemoData(state)

export function resetState(): void {
  state.patients.clear()
  state.rooms.clear()
  state.lobby.length = 0
  state.logs.length = 0
  state.settings = { ...defaultSettings }

  for (const [id, room] of seedRooms(defaultSettings)) {
    state.rooms.set(id, room)
  }

  seedDemoData(state)
}
