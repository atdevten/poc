"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { Room } from "@/lib/mock-data"
import type { BERoom, BERoomType, BEPatient, WSEvent } from "@/lib/api-types"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3002"

const LOCAL_MISSING_PATIENTS: Record<string, { id: string; name: string; type: "normal" | "vip" | "emergency" }> = {
  // Blood Test Room 1
  "blood_test-1": { id: "M001", name: "John Smith", type: "normal" },
  "blood_test_1": { id: "M001", name: "John Smith", type: "normal" },
  "blood-test-1": { id: "M001", name: "John Smith", type: "normal" },
  "bt-1":         { id: "M001", name: "John Smith", type: "normal" },
  "bt_1":         { id: "M001", name: "John Smith", type: "normal" },

  // Blood Test Room 2
  "blood_test-2": { id: "M002", name: "Alice Johnson", type: "normal" },
  "blood_test_2": { id: "M002", name: "Alice Johnson", type: "normal" },
  "blood-test-2": { id: "M002", name: "Alice Johnson", type: "normal" },
  "bt-2":         { id: "M002", name: "Alice Johnson", type: "normal" },
  "bt_2":         { id: "M002", name: "Alice Johnson", type: "normal" },

  // Blood Test Room 3
  "blood_test-3": { id: "M003", name: "Bob Miller", type: "vip" },
  "blood_test_3": { id: "M003", name: "Bob Miller", type: "vip" },
  "blood-test-3": { id: "M003", name: "Bob Miller", type: "vip" },
  "bt-3":         { id: "M003", name: "Bob Miller", type: "vip" },
  "bt_3":         { id: "M003", name: "Bob Miller", type: "vip" },

  // BMI Room 1
  "bmi-1":        { id: "M004", name: "David Davis", type: "normal" },
  "bmi_1":        { id: "M004", name: "David Davis", type: "normal" },

  // BMI Room 2
  "bmi-2":        { id: "M005", name: "Emma Wilson", type: "emergency" },
  "bmi_2":        { id: "M005", name: "Emma Wilson", type: "emergency" },

  // Radiology Room 1
  "radiology-1":  { id: "M006", name: "Frank Taylor", type: "normal" },
  "radiology_1":  { id: "M006", name: "Frank Taylor", type: "normal" },
}

export function getLocalMissingPatient(roomId: string): { id: string; name: string; type: "normal" | "vip" | "emergency" } | null {
  const lower = roomId.toLowerCase()
  
  // 1. Direct normalized lookup
  const cleanId = lower.replace(/[-_]/g, "")
  for (const [key, value] of Object.entries(LOCAL_MISSING_PATIENTS)) {
    const cleanKey = key.toLowerCase().replace(/[-_]/g, "")
    if (cleanKey === cleanId) {
      return value
    }
  }

  // 2. Intelligent fallback based on keywords and numbers in the ID
  const isBlood = lower.includes("blood") || lower.includes("bt")
  const isBmi = lower.includes("bmi")
  const isRadiology = lower.includes("radiology") || lower.includes("rad")
  
  const numMatch = lower.match(/\d+/)
  const num = numMatch ? parseInt(numMatch[0], 10) : 1

  if (isBlood) {
    if (num === 2) return { id: "M002", name: "Alice Johnson", type: "normal" }
    if (num === 3) return { id: "M003", name: "Bob Miller", type: "vip" }
    return { id: "M001", name: "John Smith", type: "normal" }
  }
  
  if (isBmi) {
    if (num === 2) return { id: "M005", name: "Emma Wilson", type: "emergency" }
    return { id: "M004", name: "David Davis", type: "normal" }
  }

  if (isRadiology) {
    return { id: "M006", name: "Frank Taylor", type: "normal" }
  }

  return null
}

function beRoomToFE(r: BERoom): Room {
  const loadMin = r.load
  const load =
    !r.currentPatient && loadMin === 0 ? "IDLE"
      : loadMin >= 40 ? "HIGH"
        : loadMin >= 20 ? "MEDIUM"
          : "LOW"

  const queue = r.queue.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    estFinishMin: p.estFinishMin as number | undefined,
    waitMin: p.waitMin as number | undefined,
    status: p.status,
    isMissing: p.status === "MISSING",
  }))

  const missing = getLocalMissingPatient(r.id)
  if (missing && !queue.some((p) => p.id === missing.id)) {
    queue.push({
      id: missing.id,
      name: missing.name,
      type: missing.type,
      status: "MISSING",
      isMissing: true,
      estFinishMin: undefined,
      waitMin: undefined,
    })
  }

  return {
    id: r.id,
    name: r.name,
    roomType: r.roomType,
    load,
    loadMin,
    current: r.currentPatient
      ? { id: r.currentPatient.id, name: r.currentPatient.name, type: r.currentPatient.type, minutesAgo: r.consultMinutes ?? 0, estFinishMin: r.currentPatient.estFinishMin }
      : null,
    queue,
  }
}

export function slugToRoomId(slug: string) {
  return slug.replace(/_([^_]*)$/, "-$1")
}

export function useRoomQueue(roomId: string) {
  const [room, setRoom] = useState<Room | null>(null)
  const [roomLabel, setRoomLabel] = useState<string>("")
  const [isConnected, setIsConnected] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleWSEvent = useCallback((event: WSEvent) => {
    switch (event.type) {
      case "SNAPSHOT": {
        const payload = event.payload as { roomTypes: BERoomType[]; lobby: BEPatient[] }
        for (const rt of payload.roomTypes) {
          const found = rt.rooms.find((r) => r.id === roomId)
          if (found) {
            setRoom(beRoomToFE(found))
            setRoomLabel(`${rt.icon} ${rt.name}`)
            break
          }
        }
        break
      }
      case "ROOM_UPDATED": {
        const { roomId: updatedId, room: updatedRoom } = event.payload as { roomId: string; room: BERoom }
        if (updatedId === roomId) {
          setRoom(beRoomToFE(updatedRoom))
        }
        break
      }
    }
  }, [roomId])

  useEffect(() => {
    let destroyed = false

    function connect() {
      if (destroyed) return
      const ws = new WebSocket(`${WS_URL}/ws`)
      wsRef.current = ws

      ws.onopen = () => {
        if (destroyed) { ws.close(); return }
        setIsConnected(true)
      }
      ws.onclose = () => {
        if (destroyed) return
        setIsConnected(false)
        reconnectTimer.current = setTimeout(connect, 3000)
      }
      ws.onerror = () => ws.close()
      ws.onmessage = (e) => {
        if (destroyed) return
        try {
          handleWSEvent(JSON.parse(e.data as string) as WSEvent)
        } catch { /* ignore */ }
      }
    }

    connect()

    return () => {
      destroyed = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      const ws = wsRef.current
      if (ws) {
        ws.onopen = null; ws.onclose = null; ws.onerror = null; ws.onmessage = null
        if (ws.readyState === WebSocket.OPEN) ws.close()
      }
    }
  }, [handleWSEvent])

  return { room, roomLabel, isConnected }
}
