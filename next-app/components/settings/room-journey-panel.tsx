"use client"

import { useState } from "react"
import { ChevronUp, ChevronDown, Pencil, Plus } from "lucide-react"
import { type RoomJourneyItem } from "@/lib/mock-data"

interface RoomJourneyPanelProps {
  value: RoomJourneyItem[]
  onChange: (v: RoomJourneyItem[]) => void
}

export function RoomJourneyPanel({ value: rooms, onChange: setRooms }: RoomJourneyPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  function moveUp(index: number) {
    if (index === 0) return
    const next = [...rooms]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setRooms(next)
  }

  function moveDown(index: number) {
    if (index === rooms.length - 1) return
    const next = [...rooms]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    setRooms(next)
  }

  function startEdit(room: RoomJourneyItem) {
    setEditingId(room.id)
    setEditName(room.name)
  }

  function commitEdit(id: string) {
    if (editName.trim()) {
      setRooms(rooms.map((r) => (r.id === id ? { ...r, name: editName.trim() } : r)))
    }
    setEditingId(null)
  }

  function addRoom() {
    const newRoom: RoomJourneyItem = {
      id: `rj-${Date.now()}`,
      emoji: "🏥",
      name: "New Room",
      avgDurationMin: 10,
      openTime: "08:00",
      closeTime: "17:00",
    }
    setRooms([...rooms, newRoom])
  }

  function updateHours(id: string, field: "openTime" | "closeTime", value: string) {
    setRooms(rooms.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      {/* Room Journey */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-[#64748B]">
            Room Journey
          </h2>
          <span className="font-sans text-[12px] text-[#94A3B8]">Use arrows to reorder</span>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {rooms.map((room, index) => (
            <div
              key={room.id}
              className="flex h-12 items-center gap-3 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 transition-colors hover:border-[#3B82F6]/30"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#F1F5F9] font-mono text-[11px] text-[#64748B]">
                {index + 1}
              </span>
              <span className="text-[15px]">{room.emoji}</span>

              {editingId === room.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => commitEdit(room.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(room.id)
                    if (e.key === "Escape") setEditingId(null)
                  }}
                  className="flex-1 rounded border border-[#3B82F6] bg-[#F1F5F9] px-2 py-0.5 font-sans text-[13px] text-[#0F172A] outline-none"
                />
              ) : (
                <span className="flex-1 font-sans text-[13px] text-[#0F172A]">{room.name}</span>
              )}

              <button
                onClick={() => startEdit(room)}
                className="rounded p-1 text-[#94A3B8] transition-colors hover:text-[#64748B]"
                title="Rename"
              >
                <Pencil size={13} />
              </button>

              <div className="flex flex-col">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="rounded p-0.5 text-[#94A3B8] transition-colors hover:text-[#64748B] disabled:opacity-25"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === rooms.length - 1}
                  className="rounded p-0.5 text-[#94A3B8] transition-colors hover:text-[#64748B] disabled:opacity-25"
                >
                  <ChevronDown size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addRoom}
          className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#CBD5E1] font-sans text-[13px] text-[#94A3B8] transition-colors hover:border-[#3B82F6] hover:text-[#3B82F6]"
        >
          <Plus size={14} />
          Add Room Type
        </button>
      </section>

      <div className="border-t border-[#E2E8F0]" />

      {/* Room Hours */}
      {/* <section>
        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-[#94A3B8]">
          Room Hours
        </h2>

        <div className="flex flex-col gap-3">
          {rooms.map((room) => (
            <div key={room.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[14px]">{room.emoji}</span>
                <span className="font-sans text-[13px] text-[#0F172A]">{room.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={room.openTime}
                  onChange={(e) => updateHours(room.id, "openTime", e.target.value)}
                  className="rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] px-3 py-1.5 font-mono text-[13px] text-[#0F172A] focus:border-[#3B82F6] focus:outline-none"
                />
                <span className="text-[#CBD5E1]">–</span>
                <input
                  type="time"
                  value={room.closeTime}
                  onChange={(e) => updateHours(room.id, "closeTime", e.target.value)}
                  className="rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] px-3 py-1.5 font-mono text-[13px] text-[#0F172A] focus:border-[#3B82F6] focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </section> */}
    </div>
  )
}
