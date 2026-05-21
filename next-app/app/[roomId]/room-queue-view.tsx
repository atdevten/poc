"use client"

import { useRoomQueue } from "@/hooks/useRoomQueue"
import type { PatientType, LoadLevel, RoomPatient } from "@/lib/mock-data"

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
  HIGH: { bg: "#FEF2F2", text: "#EF4444", label: "HIGH LOAD" },
  MEDIUM: { bg: "#FFFBEB", text: "#D97706", label: "MED LOAD" },
  LOW: { bg: "#F0FDF4", text: "#16A34A", label: "LOW LOAD" },
  IDLE: { bg: "#F1F5F9", text: "#94A3B8", label: "IDLE" },
}

function MissingBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: "#FFF7ED", color: "#EA580C", border: "1px solid #FDBA74" }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: "#EA580C" }}
      />
      no response
    </span>
  )
}

function QueueRow({ patient, position }: { patient: RoomPatient; position: number }) {
  const isNext = position === 1
  const isMissing = patient.isMissing === true

  const rowBg = isMissing
    ? "#FFFBEB"
    : isNext
      ? "#F0FDF4"
      : "#FAFAFA"
  const rowBorder = isMissing
    ? "1px solid #FDBA74"
    : isNext
      ? "1px solid #BBF7D0"
      : "1px solid #E2E8F0"
  const namColor = isMissing
    ? "#92400E"
    : isNext
      ? "#15803D"
      : "#0F172A"

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{ backgroundColor: rowBg, border: rowBorder }}
    >
      {/* Position badge */}
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-semibold"
        style={{
          backgroundColor: isMissing ? "#FDBA74" : isNext ? "#16A34A" : "#E2E8F0",
          color: isMissing ? "#7C2D12" : isNext ? "#FFFFFF" : "#64748B",
        }}
      >
        {isMissing ? "⚠️" : position}
      </span>

      {/* Name */}
      <p
        className="flex-1 font-sans text-[15px] font-medium"
        style={{ color: namColor }}
      >
        {patient.name}
      </p>

      {/* Right side — badge */}
      {isMissing && (
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <MissingBadge />
        </div>
      )}
    </div>
  )
}

export function RoomQueueView({ slug }: { slug: string }) {
  const roomId = slugToRoomId(slug)
  const { room, roomLabel, isConnected } = useRoomQueue(roomId)

  if (!room) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#7ec6c9]">
        <div className="text-center">
          <p className="font-mono text-[14px] text-white/80">
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
  const activeQueue = room.queue.filter((p) => !p.isMissing)
  const missingQueue = room.queue.filter((p) => p.isMissing)

  return (
    <div
      className="flex h-screen flex-col gap-5 bg-[#7ec6c9] px-8 py-6"
      style={{ fontFamily: "var(--font-dm-sans)" }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center justify-between">
        <div>
          <p className="font-mono text-[13px] text-white/70">{roomLabel}</p>
          <h1 className="text-[32px] font-semibold tracking-tight text-white">{room.name}</h1>
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

      {/* ── In Consultation — top hero card ─────────────────────── */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{ border: "1px solid #E2E8F0", borderRadius: 16, backgroundColor: "#FFFFFF" }}
      >
        {/* Card header */}
        <div
          className="flex items-center gap-2 border-b border-[#E2E8F0] px-6 py-3"
          style={{ backgroundColor: "#F1F5F9" }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: room.current ? "#16A34A" : "#94A3B8" }}
          />
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#94A3B8]">
            In Consultation
          </p>
        </div>

        {room.current ? (
          <div className="flex items-center gap-5 px-6 py-5">
            {/* Name + elapsed */}
            <div className="flex flex-1 items-baseline gap-3">
              <p className="text-[26px] font-semibold leading-tight text-[#0F172A]">
                {room.current.name}
              </p>
              {room.current.minutesAgo !== undefined && (
                <span className="font-mono text-[16px] text-[#94A3B8]">
                  {room.current.minutesAgo}m elapsed
                </span>
              )}
            </div>

            {/* "Now" pill */}
            <span
              className="flex-shrink-0 rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide"
              style={{ backgroundColor: "#F0FDF4", color: "#16A34A", border: "1px solid #BBF7D0" }}
            >
              Now
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center px-6 py-8">
            <p className="font-sans text-[15px] italic text-[#94A3B8]">Waiting for next patient</p>
          </div>
        )}
      </div>

      {/* ── Queue lists (Active & Missing) ──────────────────────── */}
      <div className="flex flex-1 gap-5 overflow-hidden">
        {/* Active Queue Card */}
        <div
          className="flex flex-[2] flex-col overflow-hidden"
          style={{ border: "1px solid #E2E8F0", borderRadius: 16, backgroundColor: "#FFFFFF" }}
        >
          {/* Queue header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-[#F1F5F9] px-6 py-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#94A3B8]">
              Queue ·{" "}
              <span style={{ color: activeQueue.length > 0 ? "#0F172A" : "#94A3B8" }}>{activeQueue.length}</span>
            </p>
          </div>

          {/* Scrollable queue rows */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {activeQueue.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="font-sans text-[15px] italic text-[#94A3B8]">No patients waiting</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {activeQueue.map((p, i) => (
                  <QueueRow key={`${p.id}-${i}`} patient={p} position={i + 1} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Missing Patients Card */}
        <div
          className="flex flex-1 flex-col overflow-hidden"
          style={{ border: "1px solid #E2E8F0", borderRadius: 16, backgroundColor: "#FFFFFF" }}
        >
          {/* Missing header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-[#F1F5F9] px-6 py-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#94A3B8]">
              Patient not present ·{" "}
              <span style={{ color: missingQueue.length > 0 ? "#EA580C" : "#94A3B8" }}>{missingQueue.length}</span>
            </p>
            {missingQueue.length > 0 && (
              <span
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold"
                style={{ backgroundColor: "#FFF7ED", color: "#EA580C", border: "1px solid #FDBA74" }}
              >
                ⚠ {missingQueue.length} no response
              </span>
            )}
          </div>

          {/* Scrollable missing rows */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {missingQueue.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="font-sans text-[15px] italic text-[#94A3B8]">No missing patients</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {missingQueue.map((p, i) => (
                  <QueueRow key={`${p.id}-${i}`} patient={p} position={0} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center justify-between">
        <p className="font-mono text-[11px] text-white/60">/{slug}</p>
        <p className="font-mono text-[11px] text-white/60">
          {room.loadMin > 0 ? `Est. wait: ${room.loadMin}m` : "No wait"}
        </p>
      </div>
    </div>
  )
}
