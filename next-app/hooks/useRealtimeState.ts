"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { Patient, RoomTypeGroup, Room, RoomPatient, Notification, LoadLevel, NotificationType } from "@/lib/mock-data"
import type { BEPatient, BERoom, BERoomType, BESettings, WSEvent, RebalanceSuggestPayload } from "@/lib/api-types"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002"
const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3002"

// ─── Transformers ─────────────────────────────────────────────────────────────

function bePatientToFE(p: BEPatient): Patient {
  const now = Date.now()
  const waitMin = p.lobbySince ? Math.floor((now - new Date(p.lobbySince).getTime()) / 60000) : 0
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    waitMin,
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
    queue: r.queue.map((p) => ({ id: p.id, name: p.name, type: p.type, estFinishMin: p.estFinishMin })),
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

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addNotif = useCallback((notif: Omit<Notification, "id">) => {
    setNotifications((prev) => [{ ...notif, id: makeId() }, ...prev].slice(0, 50))
  }, [])

  const handleWSEvent = useCallback((event: WSEvent) => {
    const ts = nowTs()

    switch (event.type) {
      case "SNAPSHOT": {
        const payload = event.payload as { roomTypes: BERoomType[]; lobby: BEPatient[] }
        setRoomGroups(payload.roomTypes.map(beRoomTypeToFE))
        setLobbyPatients(payload.lobby.map(bePatientToFE))
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
          message: `✅ ${patientName} hoàn thành tất cả phòng`,
          autoDismiss: true,
        })
        break
      }
      case "REBALANCE_SUGGEST": {
        const p = event.payload as RebalanceSuggestPayload
        setPendingSuggestions((prev) => {
          // Replace existing suggestion for same fromRoom (only one at a time per room)
          const filtered = prev.filter((s) => s.fromRoomId !== p.fromRoomId)
          return [...filtered, p]
        })
        break
      }
      case "REBALANCE_APPLIED": {
        const { log } = event.payload as { log: { fromRoomId: string; patientId: string } }
        setPendingSuggestions((prev) =>
          prev.filter((s) => !(s.fromRoomId === log.fromRoomId && s.patientId === log.patientId)),
        )
        addNotif({ type: "auto_rebalance", timestamp: ts, message: "Rebalance đã áp dụng", autoDismiss: true })
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
    return res.json() as Promise<BESettings>
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
  }, [])

  return {
    roomGroups,
    lobbyPatients,
    notifications,
    pendingSuggestions,
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
