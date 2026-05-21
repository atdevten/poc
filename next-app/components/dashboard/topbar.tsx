"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Settings, RotateCcw, Timer } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002"
const COUNTDOWN_SEC = 15 * 60

function formatDateTime(date: Date) {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${day}/${month}/${year}  ${hours}:${minutes}`
}

function formatCountdown(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0")
  const s = (sec % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

interface DashboardTopbarProps {
  isConnected?: boolean
  onReset?: () => Promise<void>
}

export function DashboardTopbar({ isConnected = false, onReset }: DashboardTopbarProps) {
  const [now, setNow] = useState<Date | null>(null)
  const [resetting, setResetting] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC)
  const [geminiActive, setGeminiActive] = useState(true)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Reset countdown when WS connects
  useEffect(() => {
    if (!isConnected) return
    setCountdown(COUNTDOWN_SEC)
    setGeminiActive(true)
    fetch(`${API_URL}/api/gemini/enabled`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    })
  }, [isConnected])

  // Countdown tick — only runs while connected
  useEffect(() => {
    if (!isConnected) return
    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 0) return 0
        if (prev === 1) {
          fetch(`${API_URL}/api/gemini/enabled`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: false }),
          })
          setGeminiActive(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isConnected])

  async function handleReset() {
    if (!onReset) return
    setResetting(true)
    try { await onReset() } finally { setResetting(false) }
  }

  async function handleRefreshCountdown() {
    setCountdown(COUNTDOWN_SEC)
    if (!geminiActive) {
      await fetch(`${API_URL}/api/gemini/enabled`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      })
      setGeminiActive(true)
    }
  }

  const isWarning = countdown <= 120 && countdown > 0
  const isExpired = countdown === 0

  const timerColor = isExpired
    ? "border-[#EF4444] text-[#EF4444]"
    : isWarning
    ? "border-[#F59E0B] text-[#F59E0B]"
    : "border-[#E2E8F0] text-[#64748B]"

  return (
    <header
      className="flex h-14 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-6"
      style={{ minHeight: 56 }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[18px]">🏥</span>
        <span className="font-mono text-[13px] uppercase tracking-widest text-[#0F172A]">
          Wellness Center
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-[13px] text-[#64748B]">
          {now ? formatDateTime(now) : ""}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={isConnected ? "animate-pulse h-2 w-2 rounded-full bg-[#10B981]" : "h-2 w-2 rounded-full bg-[#94A3B8]"}
          />
          <span className={`font-mono text-[12px] ${isConnected ? "text-[#10B981]" : "text-[#94A3B8]"}`}>
            {isConnected ? "Live" : "Connecting…"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Countdown / Gemini refresh button */}
        <button
          onClick={handleRefreshCountdown}
          disabled={!isConnected}
          title={isExpired ? "Gemini paused — click to resume" : "Click to reset AI timer"}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[13px] transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 ${timerColor}`}
        >
          <Timer size={13} className={isWarning && !isExpired ? "animate-pulse" : ""} />
          {isExpired ? "AI paused" : formatCountdown(countdown)}
        </button>

        <button
          onClick={handleReset}
          disabled={resetting || !isConnected}
          title="Reset demo data"
          className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-1.5 font-sans text-[13px] text-[#64748B] transition-colors hover:border-[#EF4444] hover:text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw size={13} className={resetting ? "animate-spin" : ""} />
          {resetting ? "Resetting…" : "Reset"}
        </button>

        <Link
          href="/settings"
          className="flex items-center gap-1.5 font-sans text-[13px] text-[#3B82F6] transition-colors hover:text-[#60A5FA]"
        >
          <Settings size={13} />
          Settings
        </Link>
      </div>
    </header>
  )
}
