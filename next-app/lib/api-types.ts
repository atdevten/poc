import type { PatientType } from "./mock-data"

export interface BEPatient {
  id: string
  name: string
  type: PatientType
  status: string
  checkedInAt: string
  lobbySince: string | null
  currentRoomId: string | null
  completedRooms: string[]
  remainingRooms: string[]
  rebalancedToday: boolean
  queuePosition: number | null
  estFinishMin: number
}

export interface BERoom {
  id: string
  name: string
  roomType: string
  avgDurationMin: number
  status: "active" | "idle" | "closed"
  load: number
  consultMinutes: number | null
  currentPatient: BEPatient | null
  queue: BEPatient[]
}

export interface BERoomType {
  id: string
  name: string
  icon: string
  openTime: string
  closeTime: string
  order: number
  avgDurationMin: number
  rooms: BERoom[]
}

export interface BESettings {
  rebalanceThresholdMin: number
  maxQueuePerRoom: number
  mode: "auto" | "suggest"
  noShowTimeoutMin: number
  emergencySoundAlert: boolean
  emergencyBannerAlert: boolean
  allowVipRebalance: boolean
  allowNormalRebalance: boolean
  roomTypes: Omit<BERoomType, "rooms">[]
}

export interface BERebalanceLog {
  id: string
  timestamp: string
  trigger: string
  patientId: string
  fromRoomId: string
  toRoomId: string
  reason: string
  aiUsed: boolean
}

export interface WSEvent {
  type: string
  payload: unknown
  timestamp: string
}

export interface RebalanceSuggestPayload {
  patientId: string
  patientName: string
  fromRoomId: string
  fromRoomName: string
  toRoomId: string
  toRoomName: string
  reason: string
  aiUsed: boolean
  expiresIn: number
}
