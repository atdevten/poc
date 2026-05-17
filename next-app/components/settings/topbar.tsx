"use client"

import Link from "next/link"
import { Settings } from "lucide-react"

export function SettingsTopbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-6">
      <div className="flex items-center gap-2">
        <Settings size={15} className="text-[#94A3B8]" />
        <span className="font-mono text-[13px] uppercase tracking-widest text-[#64748B]">
          Settings
        </span>
      </div>

      <span className="font-sans text-[14px] font-medium text-[#0F172A]">Wellness Center POC</span>

      <Link
        href="/"
        className="font-sans text-[14px] text-[#3B82F6] transition-colors hover:text-[#60A5FA]"
      >
        ← Dashboard
      </Link>
    </header>
  )
}
