"use client"

import { useState, useEffect } from "react"
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
  aiPrompt: string
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

  // AI Decision Rules parsing and serialization
  interface RuleItem {
    id: string
    text: string
    enabled: boolean
  }

  function parsePrompt(promptStr: string): RuleItem[] {
    if (!promptStr) return []
    return promptStr.split("\n").map((line, idx) => {
      const trimmed = line.trim()
      let text = trimmed
      let enabled = true

      if (trimmed.startsWith("- [x]")) {
        enabled = true
        text = trimmed.replace("- [x]", "").trim()
      } else if (trimmed.startsWith("- [ ]")) {
        enabled = false
        text = trimmed.replace("- [ ]", "").trim()
      } else if (trimmed.startsWith("-")) {
        enabled = true
        text = trimmed.replace("-", "").trim()
      }

      return {
        id: `rule-${idx}`,
        text,
        enabled
      }
    })
  }

  function serializePrompt(rules: RuleItem[]): string {
    return rules
      .map(r => `- [${r.enabled ? "x" : " "}] ${r.text}`)
      .join("\n")
  }

  const [rules, setRules] = useState<RuleItem[]>([])

  useEffect(() => {
    setRules(parsePrompt(state.aiPrompt))
  }, [state.aiPrompt])

  function handleToggle(id: string) {
    const updated = rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    setRules(updated)
    update("aiPrompt", serializePrompt(updated))
  }

  function handleTextChange(id: string, newText: string) {
    const updated = rules.map(r => r.id === id ? { ...r, text: newText } : r)
    setRules(updated)
    update("aiPrompt", serializePrompt(updated))
  }

  function handleAddRule() {
    const newRule: RuleItem = {
      id: `rule-${Date.now()}`,
      text: "New decision rule",
      enabled: true
    }
    const updated = [...rules, newRule]
    setRules(updated)
    update("aiPrompt", serializePrompt(updated))
  }

  function handleRemoveRule(id: string) {
    const updated = rules.filter(r => r.id !== id)
    setRules(updated)
    update("aiPrompt", serializePrompt(updated))
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

      {/* AI Prompt */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-[#94A3B8]">
              AI Decision Rules
            </h2>
            <p className="mt-1 font-sans text-[12px] text-[#94A3B8]">
              These rules guide Gemini when auto-selecting patients to move.
            </p>
          </div>
          <button
            onClick={handleAddRule}
            className="rounded bg-[#3B82F6] px-3 py-1.5 font-sans text-[12px] font-medium text-white transition-all hover:bg-[#2563EB]"
          >
            + Add Rule
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {rules.length === 0 ? (
            <p className="font-sans text-[12px] italic text-[#94A3B8] p-4 text-center border border-dashed border-[#E2E8F0] rounded-lg">
              No rules defined. AI will use its default criteria.
            </p>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-start gap-3 rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-sm hover:border-[#CBD5E1] transition-all"
              >
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => handleToggle(rule.id)}
                  className="mt-1.5 h-4.5 w-4.5 rounded border-[#CBD5E1] text-[#3B82F6] focus:ring-[#3B82F6] cursor-pointer"
                />
                <textarea
                  value={rule.text}
                  onChange={(e) => handleTextChange(rule.id, e.target.value)}
                  rows={2}
                  className="flex-1 resize-none bg-transparent font-sans text-[13px] text-[#0F172A] focus:outline-none placeholder-[#94A3B8] leading-relaxed"
                  placeholder="Enter decision rule..."
                  style={{ textDecoration: rule.enabled ? "none" : "line-through", opacity: rule.enabled ? 1 : 0.5 }}
                />
                <button
                  onClick={() => handleRemoveRule(rule.id)}
                  className="mt-0.5 rounded p-1 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#EF4444] transition-all"
                  title="Remove rule"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            ))
          )}
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
