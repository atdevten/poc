"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { type Room, type PatientType, type LoadLevel } from "@/lib/mock-data"
import type { RebalanceSuggestPayload } from "@/lib/api-types"

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

const loadConfigs: Record<LoadLevel, { dot: string; bg: string; text: string; border: string; label: string }> = {
  HIGH: { dot: "#EF4444", bg: "#FEF2F2", text: "#EF4444", border: "#FECACA", label: "HIGH" },
  MEDIUM: { dot: "#D97706", bg: "#FFFBEB", text: "#D97706", border: "#FDE68A", label: "MED" },
  LOW: { dot: "#16A34A", bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0", label: "LOW" },
  IDLE: { dot: "#94A3B8", bg: "#F1F5F9", text: "#94A3B8", border: "#CBD5E1", label: "IDLE" },
}

function LoadBadge({ load }: { load: LoadLevel }) {
  const c = loadConfigs[load]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[11px]"
      style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
      {c.label}
    </span>
  )
}

interface RoomCardProps {
  room: Room
  onDone: (roomId: string) => Promise<void>
  assignmentMode: "auto" | "suggest"
  pendingSuggestion: RebalanceSuggestPayload | null
  onAcceptSuggestion: (s: RebalanceSuggestPayload) => Promise<void>
  onDeclineSuggestion: (s: RebalanceSuggestPayload) => void
}

export function RoomCard({ room, onDone, assignmentMode, pendingSuggestion, onAcceptSuggestion, onDeclineSuggestion }: RoomCardProps) {
  const [processing, setProcessing] = useState(false)
  const [accepting, setAccepting] = useState(false)

  const isIdle = room.load === "IDLE"

  async function handleDone() {
    setProcessing(true)
    try {
      await onDone(room.id)
    } finally {
      setProcessing(false)
    }
  }

  if (isIdle) {
    return (
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: 220,
          minHeight: 280,
          backgroundColor: "#F8FAFC",
          border: "1px dashed #CBD5E1",
          borderRadius: 12,
          opacity: 0.65,
        }}
      >
        <div
          className="flex items-center justify-between px-[14px] py-[10px]"
          style={{ backgroundColor: "#F8FAFC" }}
        >
          <span className="font-mono text-[12px] text-[#94A3B8]">{room.name}</span>
          <LoadBadge load="IDLE" />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-6">
          <p className="font-sans text-[12px] italic text-[#94A3B8]">Waiting for next patient</p>
        </div>
      </div>
    )
  }

  const isHigh = room.load === "HIGH"
  const loadText = loadConfigs[room.load].text

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        width: 220,
        minHeight: 280,
        backgroundColor: "#FFFFFF",
        border: `1px solid ${isHigh ? "#FECACA" : "#E2E8F0"}`,
        boxShadow: isHigh ? "0 0 0 1px #FECACA" : undefined,
        borderRadius: 12,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-[14px] py-[10px]"
        style={{ backgroundColor: "#F1F5F9" }}
      >
        <span className="font-sans text-[13px] font-medium text-[#0F172A]">{room.name}</span>
        <LoadBadge load={room.load} />
      </div>

      {/* Load time */}
      <div
        className="px-[14px] py-[5px]"
        style={{ backgroundColor: isHigh ? "#FEF2F2" : undefined }}
      >
        <span className="font-mono text-[11px]" style={{ color: loadText }}>
          {room.loadMin}m estimated wait
        </span>
      </div>

      {/* In consultation */}
      <div className="flex-1 border-t border-[#E2E8F0] px-[14px] py-[10px]">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">← In</p>
        {room.current ? (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-[13px]">{typeIcon(room.current.type)}</span>
            <div>
              <p className="font-sans text-[13px] font-semibold text-[#0F172A]">{room.current.name}</p>
              <div className="flex items-center gap-2">
                {room.current.minutesAgo !== undefined && (
                  <span className="font-mono text-[11px] text-[#94A3B8]">{room.current.minutesAgo}m in</span>
                )}
                {room.current.estFinishMin !== undefined && (
                  <span className="font-mono text-[11px] text-[#3B82F6]">🏁 {fmtEst(room.current.estFinishMin)}</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="font-sans text-[12px] italic text-[#94A3B8]">Waiting for next patient</p>
        )}
      </div>

      {/* Queue */}
      <div className="border-t border-[#E2E8F0] px-[14px] py-[10px]">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[#94A3B8]">
          Queue · {room.queue.length}
        </p>
        {room.queue.length === 0 ? (
          <p className="font-sans text-[12px] italic text-[#94A3B8]">No patients waiting</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {room.queue.slice(0, 5).map((p, i) => {
              const isSuggested = pendingSuggestion?.patientId === p.id
              return (
                <div key={`${p.id}-${i}`} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-4 font-mono text-[11px] text-[#94A3B8]">{i + 1}.</span>
                    <span className="text-[12px]">{typeIcon(p.type)}</span>
                    <span className={cn("font-sans text-[12px]", isSuggested ? "font-medium text-[#D97706]" : "text-[#64748B]")}>
                      {p.name}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-[#94A3B8] flex gap-2">
                      {isSuggested
                        ? <span className="rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[#D97706]">⚡ AI</span>
                        : (
                          <>
                            {p.waitMin !== undefined && <span>⏱ {p.waitMin}m</span>}
                            {p.estFinishMin !== undefined && <span>🏁 {fmtEst(p.estFinishMin)}</span>}
                          </>
                        )
                      }
                    </span>
                  </div>
                  {isSuggested && pendingSuggestion && assignmentMode === "suggest" && (
                    <div
                      className="ml-5 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-2"
                    >
                      <p className="mb-1.5 font-sans text-[11px] text-[#92400E]">
                        Please proceed to <span className="font-semibold">{pendingSuggestion.toRoomName}</span>?
                      </p>
                      {pendingSuggestion.reason && (
                        <p className="mb-2 font-sans text-[11px] italic text-[#B45309]">
                          {pendingSuggestion.reason}
                        </p>
                      )}
                      <div className="flex gap-1.5">
                        <button
                          disabled={accepting}
                          onClick={async () => {
                            setAccepting(true)
                            try { await onAcceptSuggestion(pendingSuggestion) }
                            finally { setAccepting(false) }
                          }}
                          className="flex-1 rounded py-1 font-sans text-[11px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: "#16A34A" }}
                        >
                          {accepting ? "…" : "✓ Accept"}
                        </button>
                        <button
                          disabled={accepting}
                          onClick={() => onDeclineSuggestion(pendingSuggestion)}
                          className="rounded px-2 py-1 font-sans text-[11px] text-[#94A3B8] transition-colors hover:text-[#EF4444] disabled:opacity-50"
                          style={{ border: "1px solid #E2E8F0" }}
                        >
                          ✗
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {room.queue.length > 5 && (
              <p className="font-mono text-[11px] text-[#94A3B8]">+{room.queue.length - 5} more</p>
            )}
          </div>
        )}
      </div>

      {/* Done button */}
      <div className="border-t border-[#E2E8F0] px-[14px] py-[10px]">
        <button
          onClick={handleDone}
          disabled={processing || !room.current}
          className={cn(
            "w-full rounded-md py-[9px] font-mono text-[12px] font-medium transition-all duration-150",
            processing || !room.current
              ? "cursor-not-allowed border border-[#CBD5E1] bg-[#F1F5F9] text-[#94A3B8]"
              : "border border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A] hover:border-[#16A34A] hover:bg-[#16A34A] hover:text-white",
          )}
        >
          {processing ? "Processing..." : "✓  Done"}
        </button>
      </div>
    </div>
  )
}
