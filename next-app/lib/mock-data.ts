// ─── Types ────────────────────────────────────────────────────────────────────

export type PatientType = "emergency" | "vip" | "normal"

export type LoadLevel = "HIGH" | "MEDIUM" | "LOW" | "IDLE"

export interface Patient {
  id: string
  name: string
  type: PatientType
  waitMin: number
  completedRooms: number
  totalRooms: number
  estFinishMin: number
  remainingRooms: string[]
  reason?: string
}

export interface RoomPatient {
  id: string
  name: string
  type: PatientType
  minutesAgo?: number
  estFinishMin?: number
  waitMin?: number
  status?: string
  isMissing?: boolean
}

export interface Room {
  id: string
  name: string
  roomType: string
  load: LoadLevel
  loadMin: number
  current: RoomPatient | null
  queue: RoomPatient[]
}

export interface RoomTypeGroup {
  type: string
  emoji: string
  rooms: Room[]
}

export type NotificationType = "ai_suggestion" | "emergency" | "auto_rebalance" | "journey_complete"

export interface RebalancePayload {
  patientId: string
  fromRoomId: string
  toRoomId: string
  reason?: string
  aiUsed?: boolean
}

export interface Notification {
  id: string
  type: NotificationType
  timestamp: string
  message: string
  detail?: string
  aiReason?: string
  timeSavedMin?: number
  countdown?: number
  autoDismiss?: boolean
  rebalancePayload?: RebalancePayload
}

export interface RoomJourneyItem {
  id: string
  emoji: string
  name: string
  avgDurationMin: number
  openTime: string
  closeTime: string
}

// ─── Mock Lobby Patients ──────────────────────────────────────────────────────

export const INITIAL_LOBBY_PATIENTS: Patient[] = [
  { id: "E001", name: "Le Van C", type: "emergency", waitMin: 2, completedRooms: 0, totalRooms: 3, estFinishMin: 32, remainingRooms: ["bmi", "blood_test", "radiology"] },
  { id: "V002", name: "Tran Thi B", type: "vip", waitMin: 5, completedRooms: 1, totalRooms: 3, estFinishMin: 27, remainingRooms: ["blood_test", "radiology"] },
  { id: "N003", name: "Nguyen Van A", type: "normal", waitMin: 8, completedRooms: 0, totalRooms: 3, estFinishMin: 32, remainingRooms: ["bmi", "blood_test", "radiology"] },
  { id: "N004", name: "Pham Van D", type: "normal", waitMin: 12, completedRooms: 2, totalRooms: 3, estFinishMin: 15, remainingRooms: ["radiology"] },
]

// ─── Mock Rooms ───────────────────────────────────────────────────────────────

export const INITIAL_ROOMS: RoomTypeGroup[] = [
  {
    type: "Blood Test",
    emoji: "🩸",
    rooms: [
      {
        id: "bt-1",
        name: "Room 1",
        roomType: "Blood Test",
        load: "HIGH",
        loadMin: 48,
        current: { id: "V002", name: "Tran Thi B", type: "vip", minutesAgo: 15 },
        queue: [
          { id: "N005", name: "Hoang Van E", type: "normal" },
          { id: "N006", name: "Le Van F", type: "normal" },
          { id: "N999", name: "John Smith", type: "normal", status: "MISSING", isMissing: true },
          { id: "N010", name: "Ngo Van K", type: "normal" },
          { id: "N011", name: "Ly Thi L", type: "normal" },
        ],
      },
      {
        id: "bt-2",
        name: "Room 2",
        roomType: "Blood Test",
        load: "MEDIUM",
        loadMin: 20,
        current: { id: "N012", name: "Pham Van M", type: "normal", minutesAgo: 4 },
        queue: [
          { id: "N013", name: "Vo Thi N", type: "normal" },
          { id: "M002", name: "Alice Johnson", type: "normal", status: "MISSING", isMissing: true },
        ],
      },
      {
        id: "bt-3",
        name: "Room 3",
        roomType: "Blood Test",
        load: "LOW",
        loadMin: 10,
        current: null,
        queue: [
          { id: "N030", name: "Rachel Green", type: "normal" },
          { id: "M003", name: "Bob Miller", type: "vip", status: "MISSING", isMissing: true },
        ],
      },
    ],
  },
  {
    type: "BMI Check",
    emoji: "🏃",
    rooms: [
      {
        id: "bmi-1",
        name: "Room 1",
        roomType: "BMI Check",
        load: "LOW",
        loadMin: 12,
        current: { id: "N003", name: "Nguyen Van A", type: "normal", minutesAgo: 3 },
        queue: [
          { id: "N021", name: "Tom Baker", type: "normal" },
          { id: "M004", name: "David Davis", type: "normal", status: "MISSING", isMissing: true },
          { id: "N022", name: "Sara Connor", type: "normal" },
        ],
      },
      {
        id: "bmi-2",
        name: "Room 2",
        roomType: "BMI Check",
        load: "MEDIUM",
        loadMin: 15,
        current: { id: "N032", name: "Sophie Lane", type: "normal", minutesAgo: 7 },
        queue: [
          { id: "M005", name: "Emma Wilson", type: "emergency", status: "MISSING", isMissing: true },
          { id: "N033", name: "Jason Wu", type: "normal" },
        ],
      },
    ],
  },
  {
    type: "Radiology",
    emoji: "🔬",
    rooms: [
      {
        id: "rad-1",
        name: "Room 1",
        roomType: "Radiology",
        load: "MEDIUM",
        loadMin: 25,
        current: { id: "N009", name: "Frank Moore", type: "normal", minutesAgo: 8 },
        queue: [
          { id: "N007", name: "Hoang Van G", type: "normal" },
          { id: "M006", name: "Frank Taylor", type: "normal", status: "MISSING", isMissing: true },
        ],
      },
    ],
  },
]


// ─── Mock Notifications ───────────────────────────────────────────────────────

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "ai_suggestion",
    timestamp: "09:35",
    message: "AI suggests moving Hoang Van E → Blood Test Room 2",
    aiReason: "Hoang Van E has waited longest (22 min)",
    countdown: 8,
    autoDismiss: true,
  },
  {
    id: "n2",
    type: "emergency",
    timestamp: "09:33",
    message: "Emergency added: Le Van C — all rooms notified",
    autoDismiss: false,
  },
  {
    id: "n3",
    type: "auto_rebalance",
    timestamp: "09:30",
    message: "Auto-moved: Ly Thi L → Blood Test Room 3 | Room 1: 60min → 48min",
  },
  {
    id: "n4",
    type: "journey_complete",
    timestamp: "09:10",
    message: "Completed: Nguyen Van A — all 3 rooms done",
  },
]

// ─── Settings defaults ────────────────────────────────────────────────────────

export const DEFAULT_ROOM_JOURNEY: RoomJourneyItem[] = [
  { id: "rj-1", emoji: "🏃", name: "BMI Check", avgDurationMin: 5, openTime: "08:00", closeTime: "17:00" },
  { id: "rj-2", emoji: "🩸", name: "Blood Test", avgDurationMin: 12, openTime: "08:00", closeTime: "16:00" },
  { id: "rj-3", emoji: "🔬", name: "Radiology", avgDurationMin: 15, openTime: "08:00", closeTime: "12:00" },
]
