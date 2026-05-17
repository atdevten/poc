"use client"

import { Toggle } from "@/components/ui/toggle"

export interface RoutingRulesState {
  rebalanceThreshold: number
  maxQueuePerRoom: number
  assignmentMode: "auto" | "suggest"
  emergencySoundAlert: boolean
  emergencyBannerAlert: boolean
  vipAllowRebalance: boolean
  normalAllowRebalance: boolean
  noShowMinutes: number
}

interface RoutingRulesPanelProps {
  value: RoutingRulesState
  onChange: (v: RoutingRulesState) => void
}

const inputClass =
  "w-20 rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] px-3 py-2 font-mono text-[15px] text-[#0F172A] focus:border-[#3B82F6] focus:outline-none transition-colors"

export function RoutingRulesPanel({ value: state, onChange }: RoutingRulesPanelProps) {
  function update<K extends keyof RoutingRulesState>(key: K, val: RoutingRulesState[K]) {
    onChange({ ...state, [key]: val })
  }

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      {/* Routing config */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-sans text-[14px] text-[#0F172A]">Rebalance threshold</p>
            <p className="mt-0.5 font-sans text-[12px] text-[#94A3B8]">
              Trigger when load difference exceeds this value
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input
              type="number"
              value={state.rebalanceThreshold}
              onChange={(e) => update("rebalanceThreshold", Number(e.target.value))}
              className={inputClass}
              min={1}
            />
            <span className="font-sans text-[13px] text-[#64748B]">min</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="font-sans text-[14px] text-[#0F172A]">Max queue per room</p>
          <div className="flex shrink-0 items-center gap-2">
            <input
              type="number"
              value={state.maxQueuePerRoom}
              onChange={(e) => update("maxQueuePerRoom", Number(e.target.value))}
              className={inputClass}
              min={1}
            />
            <span className="font-sans text-[13px] text-[#64748B]">patients</span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-sans text-[14px] text-[#0F172A]">Assignment mode</p>
            <p className="mt-0.5 font-sans text-[12px] text-[#94A3B8]">
              Auto moves patient immediately; Suggest requires confirmation
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => update("assignmentMode", "auto")}
              className="rounded-full px-3.5 py-1.5 font-sans text-[13px] transition-all"
              style={{
                backgroundColor: state.assignmentMode === "auto" ? "#F1F5F9" : "transparent",
                border: `1px solid ${state.assignmentMode === "auto" ? "#3B82F6" : "#E2E8F0"}`,
                color: state.assignmentMode === "auto" ? "#3B82F6" : "#94A3B8",
              }}
            >
              Auto-apply
            </button>
            <button
              onClick={() => update("assignmentMode", "suggest")}
              className="rounded-full px-3.5 py-1.5 font-sans text-[13px] transition-all"
              style={{
                backgroundColor: state.assignmentMode === "suggest" ? "#F1F5F9" : "transparent",
                border: `1px solid ${state.assignmentMode === "suggest" ? "#3B82F6" : "#E2E8F0"}`,
                color: state.assignmentMode === "suggest" ? "#3B82F6" : "#94A3B8",
              }}
            >
              Suggest
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E2E8F0]" />

      {/* Priority Rules */}
      <section>
        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-[#94A3B8]">
          Priority Rules
        </h2>

        <div className="flex flex-col gap-2.5">
          {/* Emergency */}
          <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[13px]">🚨</span>
              <span className="font-sans text-[13px] font-semibold text-[#B91C1C]">Emergency</span>
              <span className="font-sans text-[12px] text-[#94A3B8]">· Skip to front of all queues</span>
            </div>
            <div className="mt-2.5 flex flex-col gap-2 pl-1">
              <div className="flex items-center justify-between">
                <span className="font-sans text-[13px] text-[#0F172A]">Sound alert</span>
                <Toggle checked={state.emergencySoundAlert} onChange={(v) => update("emergencySoundAlert", v)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-sans text-[13px] text-[#0F172A]">Banner alert</span>
                <Toggle checked={state.emergencyBannerAlert} onChange={(v) => update("emergencyBannerAlert", v)} />
              </div>
            </div>
          </div>

          {/* VIP */}
          <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[13px]">🥇</span>
              <span className="font-sans text-[13px] font-semibold text-[#92400E]">VIP</span>
              <span className="font-sans text-[12px] text-[#94A3B8]">· Skip Normal patients</span>
            </div>
            <div className="mt-2.5 pl-1">
              <div className="flex items-center justify-between">
                <span className="font-sans text-[13px] text-[#0F172A]">Allow rebalance</span>
                <Toggle checked={state.vipAllowRebalance} onChange={(v) => update("vipAllowRebalance", v)} />
              </div>
            </div>
          </div>

          {/* Normal */}
          <div className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[13px]">👤</span>
              <span className="font-sans text-[13px] font-semibold text-[#0F172A]">Normal</span>
              <span className="font-sans text-[12px] text-[#94A3B8]">· FIFO order</span>
            </div>
            <div className="mt-2.5 pl-1">
              <div className="flex items-center justify-between">
                <span className="font-sans text-[13px] text-[#0F172A]">Allow rebalance</span>
                <Toggle checked={state.normalAllowRebalance} onChange={(v) => update("normalAllowRebalance", v)} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-[#E2E8F0]" />

      {/* No-show Handling */}
      <section>
        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-[#94A3B8]">
          No-show Handling
        </h2>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <p className="font-sans text-[14px] text-[#0F172A]">Auto mark NO_SHOW after</p>
            <div className="flex shrink-0 items-center gap-2">
              <input
                type="number"
                value={state.noShowMinutes}
                onChange={(e) => update("noShowMinutes", Number(e.target.value))}
                className={inputClass}
                min={1}
              />
              <span className="font-sans text-[13px] text-[#64748B]">min</span>
            </div>
          </div>

        </div>
      </section>
    </div>
  )
}
