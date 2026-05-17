"use client"

import { useEffect, useRef, useState } from "react"
import { type Notification } from "@/lib/mock-data"

interface NotificationBarProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
  onApply: (id: string) => void
}

interface NotifItemProps {
  notif: Notification
  onDismiss: (id: string) => void
  onApply: (id: string) => void
}

function AISuggestionItem({ notif, onDismiss, onApply }: NotifItemProps) {
  const [count, setCount] = useState(notif.countdown ?? 8)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (notif.autoDismiss) {
      ref.current = setInterval(() => {
        setCount((c) => {
          if (c <= 1) {
            clearInterval(ref.current!)
            onDismiss(notif.id)
            return 0
          }
          return c - 1
        })
      }, 1000)
    }
    return () => {
      if (ref.current) clearInterval(ref.current)
    }
  }, [notif.id, notif.autoDismiss, onDismiss])

  const countColor = count > 5 ? "#10B981" : count > 2 ? "#F59E0B" : "#EF4444"

  return (
    <div className="px-4 py-3" style={{ backgroundColor: "#EFF6FF", borderLeft: "3px solid #3B82F6" }}>
      <div className="flex items-baseline gap-1.5">
        <span className="shrink-0 text-[#3B82F6]">⚡</span>
        <span className="font-mono text-[11px] text-[#94A3B8]">{notif.timestamp}</span>
      </div>
      <p className="mt-1 font-sans text-[13px] leading-snug text-[#0F172A]">{notif.message}</p>
      {notif.aiReason && (
        <p className="mt-1 font-sans text-[12px] italic leading-snug text-[#64748B]">{notif.aiReason}</p>
      )}
      <div className="mt-2.5 flex items-center gap-1.5">
        <button
          onClick={() => onApply(notif.id)}
          className="rounded px-2.5 py-1 font-sans text-[11px] font-medium text-[#16A34A] transition-all hover:bg-[#16A34A] hover:text-white"
          style={{ backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0" }}
        >
          ✓ Apply
        </button>
        <button
          onClick={() => onDismiss(notif.id)}
          className="rounded px-2 py-1 font-sans text-[12px] text-[#94A3B8] transition-all hover:border-[#EF4444] hover:text-[#EF4444]"
          style={{ border: "1px solid #E2E8F0" }}
        >
          ✗
        </button>
        <span className="ml-auto font-mono text-[11px]" style={{ color: countColor }}>
          ⏱ {count}s
        </span>
      </div>
    </div>
  )
}

function NotificationItem({ notif, onDismiss, onApply }: NotifItemProps) {
  if (notif.type === "ai_suggestion") {
    return <AISuggestionItem notif={notif} onDismiss={onDismiss} onApply={onApply} />
  }

  if (notif.type === "emergency") {
    return (
      <div
        className="flex items-center gap-3 px-4 py-2.5"
        style={{ backgroundColor: "#FEF2F2", borderLeft: "3px solid #EF4444" }}
      >
        <span className="shrink-0">🚨</span>
        <span className="font-mono text-[11px] text-[#94A3B8]">{notif.timestamp}</span>
        <span className="font-sans text-[13px] text-[#B91C1C]">{notif.message}</span>
      </div>
    )
  }

  if (notif.type === "auto_rebalance") {
    return (
      <div
        className="flex items-center gap-3 px-4 py-2.5"
        style={{ backgroundColor: "#FFFFFF", borderLeft: "3px solid #D97706" }}
      >
        <span className="shrink-0 text-[#D97706]">↔</span>
        <span className="font-mono text-[11px] text-[#94A3B8]">{notif.timestamp}</span>
        <span className="font-sans text-[13px] text-[#64748B]">{notif.message}</span>
      </div>
    )
  }

  if (notif.type === "journey_complete") {
    return (
      <div
        className="flex items-center gap-3 px-4 py-2.5"
        style={{ backgroundColor: "#F0FDF4", borderLeft: "3px solid #16A34A" }}
      >
        <span className="shrink-0">✅</span>
        <span className="font-mono text-[11px] text-[#94A3B8]">{notif.timestamp}</span>
        <span className="font-sans text-[13px] text-[#166534]">{notif.message}</span>
      </div>
    )
  }

  return null
}

export function NotificationBar({ notifications, onDismiss, onApply }: NotificationBarProps) {
  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-l border-[#E2E8F0] bg-[#F8FAFC]">
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] px-4 py-3">
        <span className="font-mono text-[11px] uppercase tracking-widest text-[#64748B]">
          Notifications
        </span>
        {notifications.length > 0 && (
          <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 font-mono text-[11px] text-[#94A3B8]">
            {notifications.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-4 font-sans text-[12px] italic text-[#94A3B8]">No notifications</p>
        ) : (
          <div className="flex flex-col gap-px">
            {notifications.map((notif) => (
              <NotificationItem key={notif.id} notif={notif} onDismiss={onDismiss} onApply={onApply} />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
