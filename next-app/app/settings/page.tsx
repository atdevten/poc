"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { SettingsTopbar } from "@/components/settings/topbar"
import { RoutingRulesPanel, type RoutingRulesState } from "@/components/settings/routing-rules-panel"
import { RoomJourneyPanel } from "@/components/settings/room-journey-panel"
import { BottomActionBar } from "@/components/settings/bottom-action-bar"
import { useRealtimeState } from "@/hooks/useRealtimeState"
import { DEFAULT_ROOM_JOURNEY, type RoomJourneyItem } from "@/lib/mock-data"
import type { BESettings } from "@/lib/api-types"

const DEFAULT_ROUTING: RoutingRulesState = {
  rebalanceThreshold: 20,
  maxQueuePerRoom: 5,
  assignmentMode: "auto",
  emergencySoundAlert: true,
  emergencyBannerAlert: true,
  vipAllowRebalance: false,
  normalAllowRebalance: true,
  noShowMinutes: 15,
}

function beToRouting(s: BESettings): RoutingRulesState {
  return {
    rebalanceThreshold: s.rebalanceThresholdMin,
    maxQueuePerRoom: s.maxQueuePerRoom,
    assignmentMode: s.mode,
    emergencySoundAlert: s.emergencySoundAlert,
    emergencyBannerAlert: s.emergencyBannerAlert,
    vipAllowRebalance: s.allowVipRebalance,
    normalAllowRebalance: s.allowNormalRebalance,
    noShowMinutes: s.noShowTimeoutMin,
  }
}

function beToJourney(s: BESettings): RoomJourneyItem[] {
  return s.roomTypes.map((rt) => ({
    id: rt.id,
    emoji: rt.icon,
    name: rt.name,
    avgDurationMin: rt.avgDurationMin,
    openTime: rt.openTime,
    closeTime: rt.closeTime,
  }))
}

function toBESettings(routing: RoutingRulesState, journey: RoomJourneyItem[]): Partial<BESettings> {
  return {
    rebalanceThresholdMin: routing.rebalanceThreshold,
    maxQueuePerRoom: routing.maxQueuePerRoom,
    mode: routing.assignmentMode,
    emergencySoundAlert: routing.emergencySoundAlert,
    emergencyBannerAlert: routing.emergencyBannerAlert,
    allowVipRebalance: routing.vipAllowRebalance,
    allowNormalRebalance: routing.normalAllowRebalance,
    noShowTimeoutMin: routing.noShowMinutes,
    roomTypes: journey.map((r, i) => ({
      id: r.id,
      name: r.name,
      icon: r.emoji,
      avgDurationMin: r.avgDurationMin,
      openTime: r.openTime,
      closeTime: r.closeTime,
      order: i + 1,
    })),
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const { fetchSettings, saveSettings } = useRealtimeState()
  const [routing, setRouting] = useState<RoutingRulesState>(DEFAULT_ROUTING)
  const [journey, setJourney] = useState<RoomJourneyItem[]>(DEFAULT_ROOM_JOURNEY)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setRouting(beToRouting(s))
        setJourney(beToJourney(s))
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [fetchSettings])

  async function handleSave() {
    setSaving(true)
    try {
      await saveSettings(toBESettings(routing, journey))
      router.push("/")
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <span className="font-mono text-[13px] text-[#94A3B8]">Loading settings…</span>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-[#F8FAFC]">
      <SettingsTopbar />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-1/2 flex-col overflow-hidden border-r border-[#E2E8F0]">
          <div className="border-b border-[#E2E8F0] px-6 py-3">
            <h1 className="font-mono text-[11px] uppercase tracking-widest text-[#64748B]">
              Routing Rules
            </h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            <RoutingRulesPanel value={routing} onChange={setRouting} />
          </div>
        </div>

        <div className="flex w-1/2 flex-col overflow-hidden">
          <div className="border-b border-[#E2E8F0] px-6 py-3">
            <h1 className="font-mono text-[11px] uppercase tracking-widest text-[#64748B]">
              Room Journey
            </h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            <RoomJourneyPanel value={journey} onChange={setJourney} />
          </div>
        </div>
      </div>

      <BottomActionBar onCancel={() => router.push("/")} onSave={handleSave} />
    </div>
  )
}
