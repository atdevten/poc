"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { type PatientType, type Patient } from "@/lib/mock-data"

interface AddPatientModalProps {
  type: PatientType
  onAdd: (patient: Patient) => void
  onClose: () => void
}

const typeConfig: Record<PatientType, { label: string; emoji: string; headerBg: string; buttonBg: string }> = {
  emergency: { label: "Emergency", emoji: "🚨", headerBg: "#FEF2F2", buttonBg: "#EF4444" },
  vip:       { label: "VIP",       emoji: "🥇", headerBg: "#FFFBEB", buttonBg: "#D97706" },
  normal:    { label: "Normal",    emoji: "👤", headerBg: "#FFFFFF", buttonBg: "#3B82F6" },
}

const inputClass =
  "w-full rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] px-4 py-2.5 font-sans text-[14px] text-[#0F172A] placeholder-[#94A3B8] focus:border-[#3B82F6] focus:outline-none transition-colors"

export function AddPatientModal({ type, onAdd, onClose }: AddPatientModalProps) {
  const cfg = typeConfig[type]
  const [name, setName] = useState("")
  const [idPhone, setIdPhone] = useState("")
  const [reason, setReason] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !idPhone.trim()) return
    onAdd({
      id: idPhone.trim(),
      name: name.trim(),
      type,
      waitMin: 0,
      completedRooms: 0,
      totalRooms: 3,
      estFinishMin: 0,
      remainingRooms: [],
      reason: reason.trim() || undefined,
    })
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 50 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-[440px] overflow-hidden rounded-xl border border-[#E2E8F0]"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ backgroundColor: cfg.headerBg, borderBottom: "1px solid #E2E8F0" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[18px]">{cfg.emoji}</span>
            <span className="font-sans text-[15px] font-semibold text-[#0F172A]">
              Add {cfg.label} Patient
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#64748B] transition-colors hover:text-[#0F172A]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div>
            <label className="mb-1.5 block font-sans text-[12px] text-[#64748B]">
              Full Name <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter patient full name"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block font-sans text-[12px] text-[#64748B]">
              Patient ID / Phone <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              value={idPhone}
              onChange={(e) => setIdPhone(e.target.value)}
              placeholder="e.g. N005 or 0901234567"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block font-sans text-[12px] text-[#64748B]">
              Reason <span className="text-[#94A3B8]">(optional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief reason for visit"
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#E2E8F0] py-2.5 font-sans text-[13px] text-[#64748B] transition-colors hover:border-[#94A3B8] hover:text-[#0F172A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg py-2.5 font-sans text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: cfg.buttonBg }}
            >
              Add Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
