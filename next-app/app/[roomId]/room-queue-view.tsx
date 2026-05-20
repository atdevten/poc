"use client"

import { useRoomQueue } from "@/hooks/useRoomQueue"
import type { PatientType, LoadLevel } from "@/lib/mock-data"

function slugToRoomId(slug: string) {
  return slug.replace(/_([^_]*)$/, "-$1")
}

function fmtEst(min: number): string {
  if (min <= 0) return "< 1m"
  if (min < 60) return `~${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`
}

function typeIcon(type: PatientType) {
  if (type === "emergency") return "🚨"
  if (type === "vip") return "🥇"
  return "👤"
}

const loadColors: Record<LoadLevel, { bg: string; text: string; label: string }> = {
  HIGH:   { bg: "#FEF2F2", text: "#EF4444", label: "HIGH LOAD" },
  MEDIUM: { bg: "#FFFBEB", text: "#D97706", label: "MED LOAD" },
  LOW:    { bg: "#F0FDF4", text: "#16A34A", label: "LOW LOAD" },
  IDLE:   { bg: "#F1F5F9", text: "#94A3B8", label: "IDLE" },
}

export function RoomQueueView({ slug }: { slug: string }) {
  const roomId = slugToRoomId(slug)
  const { room, roomLabel, isConnected } = useRoomQueue(roomId)

  if (!room) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <p className="font-mono text-[14px] text-[#94A3B8]">
            {isConnected ? `Room "${roomId}" not found` : "Connecting…"}
          </p>
          <div
            className="mx-auto mt-3 h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: isConnected ? "#94A3B8" : "#D97706" }}
          />
        </div>
      </div>
    )
  }

  const load = loadColors[room.load]
  const queueCount = room.queue.length

  return (
    <div className="flex h-screen flex-col bg-[#F8FAFC] px-8 py-6" style={{ fontFamily: "var(--font-dm-sans)" }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-mono text-[13px] text-[#94A3B8]">{roomLabel}</p>
          <h1 className="text-[32px] font-semibold tracking-tight text-[#0F172A]">{room.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="rounded-lg px-4 py-2 font-mono text-[13px] font-medium"
            style={{ backgroundColor: load.bg, color: load.text }}
          >
            {load.label}
          </span>
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: isConnected ? "#16A34A" : "#EF4444" }}
            title={isConnected ? "Live" : "Disconnected"}
          />
        </div>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Current patient */}
        <div
          className="flex flex-col"
          style={{
            width: 340,
            border: "1px solid #E2E8F0",
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div className="border-b border-[#E2E8F0] bg-[#F1F5F9] px-6 py-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#94A3B8]">← In Consultation</p>
          </div>

          {room.current ? (
            <div className="flex flex-1 flex-col justify-center px-6 py-8">
              <span className="mb-3 text-[40px]">{typeIcon(room.current.type)}</span>
              <p className="text-[28px] font-semibold text-[#0F172A]">{room.current.name}</p>
              <div className="mt-3 flex flex-col gap-1.5">
                {room.current.minutesAgo !== undefined && (
                  <p className="font-mono text-[14px] text-[#94A3B8]">
                    ⏱ {room.current.minutesAgo}m elapsed
                  </p>
                )}
                {room.current.estFinishMin !== undefined && (
                  <p className="font-mono text-[14px] text-[#3B82F6]">
                    🏁 Est. finish {fmtEst(room.current.estFinishMin)}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6">
              <p className="text-center font-sans text-[15px] italic text-[#94A3B8]">Waiting for next patient</p>
            </div>
          )}
        </div>

        {/* Queue */}
        <div
          className="flex flex-1 flex-col overflow-hidden"
          style={{
            border: "1px solid #E2E8F0",
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
          }}
        >
          <div className="border-b border-[#E2E8F0] bg-[#F1F5F9] px-6 py-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#94A3B8]">
              Queue · <span style={{ color: queueCount > 0 ? "#0F172A" : "#94A3B8" }}>{queueCount}</span>
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {queueCount === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="font-sans text-[15px] italic text-[#94A3B8]">No patients waiting</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {room.queue.map((p, i) => (
                  <div
                    key={`${p.id}-${i}`}
                    className="flex items-center gap-4 rounded-xl px-4 py-4"
                    style={{
                      backgroundColor: i === 0 ? "#F0FDF4" : "#F8FAFC",
                      border: `1px solid ${i === 0 ? "#BBF7D0" : "#E2E8F0"}`,
                    }}
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full font-mono text-[14px] font-semibold"
                      style={{
                        backgroundColor: i === 0 ? "#16A34A" : "#E2E8F0",
                        color: i === 0 ? "#FFFFFF" : "#64748B",
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[20px] flex-shrink-0">{typeIcon(p.type)}</span>
                    <p
                      className="flex-1 text-[17px] font-medium"
                      style={{ color: i === 0 ? "#15803D" : "#0F172A" }}
                    >
                      {p.name}
                    </p>
                    <div className="flex flex-col items-end gap-1">
                      {p.waitMin !== undefined && (
                        <span className="font-mono text-[12px] text-[#94A3B8]">⏱ {p.waitMin}m wait</span>
                      )}
                      {p.estFinishMin !== undefined && (
                        <span className="font-mono text-[12px] text-[#3B82F6]">🏁 {fmtEst(p.estFinishMin)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <p className="font-mono text-[11px] text-[#CBD5E1]">/{slug}</p>
        <p className="font-mono text-[11px] text-[#CBD5E1]">
          {room.loadMin > 0 ? `Est. wait: ${room.loadMin}m` : "No wait"}
        </p>
      </div>
    </div>
  )
}
