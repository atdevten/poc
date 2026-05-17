"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Settings, RotateCcw } from "lucide-react"

function formatDateTime(date: Date) {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${day}/${month}/${year}  ${hours}:${minutes}`
}

interface DashboardTopbarProps {
  isConnected?: boolean
  onReset?: () => Promise<void>
}

export function DashboardTopbar({ isConnected = false, onReset }: DashboardTopbarProps) {
  const [now, setNow] = useState<Date | null>(null)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  async function handleReset() {
    if (!onReset) return
    setResetting(true)
    try { await onReset() } finally { setResetting(false) }
  }

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
