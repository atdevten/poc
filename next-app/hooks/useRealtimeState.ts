"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { Patient, RoomTypeGroup, Room, RoomPatient, Notification, LoadLevel, NotificationType } from "@/lib/mock-data"
import type { BEPatient, BERoom, BERoomType, BESettings, WSEvent, RebalanceSuggestPayload } from "@/lib/api-types"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002"
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3002"

// ─── Transformers ─────────────────────────────────────────────────────────────

function bePatientToFE(p: BEPatient): Patient {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    waitMin: p.waitMin ?? 0,
    completedRooms: p.completedRooms.length,
    totalRooms: p.completedRooms.length + p.remainingRooms.length,
    estFinishMin: p.estFinishMin ?? 0,
    remainingRooms: p.remainingRooms,
  }
}

function beRoomToFE(r: BERoom): Room {
  const loadMin = r.load
  const loadLevel: LoadLevel =
    !r.currentPatient && loadMin === 0 ? "IDLE"
      : loadMin >= 40 ? "HIGH"
        : loadMin >= 20 ? "MEDIUM"
          : "LOW"

  const current: RoomPatient | null = r.currentPatient
    ? { id: r.currentPatient.id, name: r.currentPatient.name, type: r.currentPatient.type, minutesAgo: r.consultMinutes ?? 0, estFinishMin: r.currentPatient.estFinishMin }
    : null

  return {
    id: r.id,
    name: r.name,
    roomType: r.roomType,
    load: loadLevel,
    loadMin,
    current,
    queue: r.queue.map((p) => ({ id: p.id, name: p.name, type: p.type, estFinishMin: p.estFinishMin, waitMin: p.waitMin })),
  }
}

function beRoomTypeToFE(rt: BERoomType): RoomTypeGroup {
  return {
    type: rt.name,
    emoji: rt.icon,
    rooms: rt.rooms.map(beRoomToFE),
  }
}

function nowTs() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

let notifSeq = 0
function makeId() { return `notif-${++notifSeq}` }

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRealtimeState() {
  const [roomGroups, setRoomGroups] = useState<RoomTypeGroup[]>([])
  const [lobbyPatients, setLobbyPatients] = useState<Patient[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [pendingSuggestions, setPendingSuggestions] = useState<RebalanceSuggestPayload[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [assignmentMode, setAssignmentMode] = useState<"auto" | "suggest">("suggest")

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addNotif = useCallback((notif: Omit<Notification, "id">) => {
    setNotifications((prev) => [{ ...notif, id: makeId() }, ...prev].slice(0, 50))
  }, [])

  const handleWSEvent = useCallback((event: WSEvent) => {
    const ts = nowTs()

    switch (event.type) {
      case "SNAPSHOT": {
        const payload = event.payload as { roomTypes: BERoomType[]; lobby: BEPatient[]; settings?: { mode?: "auto" | "suggest"; assignmentMode?: "auto" | "suggest" } }
        setRoomGroups(payload.roomTypes.map(beRoomTypeToFE))
        setLobbyPatients(payload.lobby.map(bePatientToFE))
        const m = payload.settings?.mode || payload.settings?.assignmentMode
        if (m) setAssignmentMode(m)
        break
      }
      case "ROOM_UPDATED": {
        const { roomId, room } = event.payload as { roomId: string; room: BERoom }
        setRoomGroups((prev) =>
          prev.map((group) => ({
            ...group,
            rooms: group.rooms.map((r) => (r.id === roomId ? beRoomToFE(room) : r)),
          })),
        )
        break
      }
      case "LOBBY_UPDATED": {
        const { patients } = event.payload as { patients: BEPatient[]; count: number }
        setLobbyPatients(patients.map(bePatientToFE))
        break
      }
      case "EMERGENCY_ADDED": {
        const { patient } = event.payload as { patient: BEPatient }
        addNotif({
          type: "emergency",
          timestamp: ts,
          message: `🚨 Khẩn cấp: ${patient.name} vừa được thêm`,
          autoDismiss: false,
        })
        break
      }
      case "PATIENT_COMPLETED": {
        const { patientName } = event.payload as { patientId: string; patientName: string }
        addNotif({
          type: "journey_complete",
          timestamp: ts,
          message: `✅ ${patientName} completed all the rooms`,
          autoDismiss: true,
        })
        break
      }
      case "REBALANCE_SUGGEST": {
        const p = event.payload as RebalanceSuggestPayload
        setPendingSuggestions((prev) => {
          const filtered = prev.filter((s) => s.fromRoomId !== p.fromRoomId)
          return [...filtered, p]
        })
        addNotif({
          type: "ai_suggestion",
          timestamp: ts,
          message: `AI suggests moving ${p.patientName}: ${p.fromRoomName} → ${p.toRoomName}`,
          aiReason: p.reason,
          countdown: p.expiresIn,
          autoDismiss: true,
          rebalancePayload: {
            patientId: p.patientId,
            fromRoomId: p.fromRoomId,
            toRoomId: p.toRoomId,
          }
        })
        break
      }
      case "REBALANCE_APPLIED": {
        const { log } = event.payload as { log: { fromRoomId: string; patientId: string } }
        setPendingSuggestions((prev) =>
          prev.filter((s) => !(s.fromRoomId === log.fromRoomId && s.patientId === log.patientId)),
        )
        setNotifications((prev) =>
          prev.filter(
            (n) =>
              !(
                n.rebalancePayload &&
                n.rebalancePayload.fromRoomId === log.fromRoomId &&
                n.rebalancePayload.patientId === log.patientId
              ),
          ),
        )
        break
      }
      case "NOTIFICATION": {
        const { kind, message, detail } = event.payload as { kind: string; message: string; detail: string | null }
        const typeMap: Record<string, NotificationType> = {
          emergency: "emergency",
          success: "journey_complete",
          warning: "auto_rebalance",
          info: "auto_rebalance",
        }
        addNotif({
          type: typeMap[kind] ?? "auto_rebalance",
          timestamp: ts,
          message,
          detail: detail ?? undefined,
          autoDismiss: kind !== "emergency",
        })
        break
      }
      case "SETTINGS_UPDATED": {
        const payload = event.payload as { settings?: { mode?: "auto" | "suggest"; assignmentMode?: "auto" | "suggest" } }
        const m = payload.settings?.mode || payload.settings?.assignmentMode
        if (m) setAssignmentMode(m)
        break
      }
    }
  }, [addNotif])

  useEffect(() => {
    let destroyed = false

    function connect() {
      if (destroyed) return
      const ws = new WebSocket(`${WS_URL}/ws`)
      wsRef.current = ws

      ws.onopen = () => { if (!destroyed) setIsConnected(true) }
      ws.onclose = () => {
        if (destroyed) return
        setIsConnected(false)
        reconnectTimer.current = setTimeout(connect, 3000)
      }
      ws.onerror = () => ws.close()
      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data as string) as WSEvent
          handleWSEvent(event)
        } catch { /* ignore malformed */ }
      }
    }

    connect()

    return () => {
      destroyed = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [handleWSEvent])

  // ─── API actions ─────────────────────────────────────────────────────────────

  const addPatient = useCallback(async (name: string, type: string, reason?: string) => {
    await fetch(`${API_URL}/api/patients/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, reason }),
    })
  }, [])

  const markDone = useCallback(async (roomId: string) => {
    await fetch(`${API_URL}/api/done/${roomId}`, { method: "POST" })
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const applyNotification = useCallback(async (id: string) => {
    const notif = notifications.find((n) => n.id === id)
    if (notif?.rebalancePayload) {
      const { patientId, fromRoomId, toRoomId } = notif.rebalancePayload
      await fetch(`${API_URL}/api/rebalance/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, fromRoomId, toRoomId }),
      })
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [notifications])

  const resetData = useCallback(async () => {
    await fetch(`${API_URL}/api/reset`, { method: "POST" })
    setPendingSuggestions([])
    setNotifications([])
  }, [])

  const fetchSettings = useCallback(async (): Promise<BESettings> => {
    const res = await fetch(`${API_URL}/api/settings`)
    return res.json() as Promise<BESettings>
  }, [])

  const saveSettings = useCallback(async (settings: Partial<BESettings>) => {
    const res = await fetch(`${API_URL}/api/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
    const saved = await res.json() as BESettings
    if (saved.assignmentMode) setAssignmentMode(saved.assignmentMode as "auto" | "suggest")
    return saved
  }, [])

  const acceptSuggestion = useCallback(async (suggestion: RebalanceSuggestPayload) => {
    await fetch(`${API_URL}/api/rebalance/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: suggestion.patientId,
        fromRoomId: suggestion.fromRoomId,
        toRoomId: suggestion.toRoomId,
      }),
    })
    setPendingSuggestions((prev) =>
      prev.filter((s) => !(s.fromRoomId === suggestion.fromRoomId && s.patientId === suggestion.patientId)),
    )
  }, [])

  const declineSuggestion = useCallback((suggestion: RebalanceSuggestPayload) => {
    setPendingSuggestions((prev) =>
      prev.filter((s) => !(s.fromRoomId === suggestion.fromRoomId && s.patientId === suggestion.patientId)),
    )
    setNotifications((prev) =>
      prev.filter(
        (n) =>
          !(
            n.rebalancePayload &&
            n.rebalancePayload.fromRoomId === suggestion.fromRoomId &&
            n.rebalancePayload.patientId === suggestion.patientId
          ),
      ),
    )
  }, [])

  return {
    roomGroups,
    lobbyPatients,
    notifications,
    pendingSuggestions,
    assignmentMode,
    isConnected,
    addPatient,
    markDone,
    dismissNotification,
    applyNotification,
    acceptSuggestion,
    declineSuggestion,
    fetchSettings,
    saveSettings,
    resetData,
  }
}
