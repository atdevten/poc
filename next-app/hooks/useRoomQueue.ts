"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { Room } from "@/lib/mock-data"
import type { BERoom, BERoomType, BEPatient, WSEvent } from "@/lib/api-types"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3002"

function beRoomToFE(r: BERoom): Room {
  const loadMin = r.load
  const load =
    !r.currentPatient && loadMin === 0 ? "IDLE"
      : loadMin >= 40 ? "HIGH"
        : loadMin >= 20 ? "MEDIUM"
          : "LOW"

  return {
    id: r.id,
    name: r.name,
    roomType: r.roomType,
    load,
    loadMin,
    current: r.currentPatient
      ? { id: r.currentPatient.id, name: r.currentPatient.name, type: r.currentPatient.type, minutesAgo: r.consultMinutes ?? 0, estFinishMin: r.currentPatient.estFinishMin }
      : null,
    queue: r.queue.map((p) => ({ id: p.id, name: p.name, type: p.type, estFinishMin: p.estFinishMin, waitMin: p.waitMin })),
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
