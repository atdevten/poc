"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { type Patient, type PatientType } from "@/lib/mock-data"
import { PatientCard } from "./patient-card"
import { AddPatientModal } from "./add-patient-modal"

interface WaitingLobbyProps {
  patients: Patient[]
  onAddPatient: (patient: Patient) => void
}

export function WaitingLobby({ patients, onAddPatient }: WaitingLobbyProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [modalType, setModalType] = useState<PatientType | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function openModal(type: PatientType) {
    setDropdownOpen(false)
    setModalType(type)
  }

  function handleAdd(patient: Patient) {
    onAddPatient(patient)
    setModalType(null)
  }

  return (
    <section className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#64748B]">
            Waiting Lobby
          </span>
          <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 font-mono text-[11px] text-[#64748B]">
            {patients.length}
          </span>
        </div>

        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-1.5 font-sans text-[13px] font-medium text-white transition-colors hover:bg-[#2563EB]"
          >
            + Add Patient
            <ChevronDown
              size={12}
              className={`transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] shadow-xl">
              <button
                onClick={() => openModal("emergency")}
                className="flex w-full items-center gap-2 px-4 py-2.5 font-sans text-[13px] text-[#EF4444] transition-colors hover:bg-[#F1F5F9]"
              >
                🚨 Emergency
              </button>
              <button
                onClick={() => openModal("vip")}
                className="flex w-full items-center gap-2 px-4 py-2.5 font-sans text-[13px] text-[#D97706] transition-colors hover:bg-[#F1F5F9]"
              >
                🥇 VIP
              </button>
              <button
                onClick={() => openModal("normal")}
                className="flex w-full items-center gap-2 px-4 py-2.5 font-sans text-[13px] text-[#0F172A] transition-colors hover:bg-[#F1F5F9]"
              >
                👤 Normal
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {patients.map((p) => (
            <PatientCard key={p.id} patient={p} />
          ))}
          {patients.length === 0 && (
            <p className="py-4 font-sans text-[13px] italic text-[#94A3B8]">No patients in lobby</p>
          )}
        </div>
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-16"
          style={{ background: "linear-gradient(to right, transparent, #F8FAFC)" }}
        />
      </div>

      {modalType && (
        <AddPatientModal type={modalType} onAdd={handleAdd} onClose={() => setModalType(null)} />
      )}
    </section>
  )
}
