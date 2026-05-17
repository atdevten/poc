"use client"

interface BottomActionBarProps {
  onCancel: () => void
  onSave: () => void
}

export function BottomActionBar({ onCancel, onSave }: BottomActionBarProps) {
  return (
    <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC] px-6 py-3">
      <button
        onClick={onCancel}
        className="rounded-lg border border-[#E2E8F0] px-5 py-2 font-sans text-[13px] text-[#64748B] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A]"
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        className="rounded-lg bg-[#3B82F6] px-5 py-2 font-sans text-[13px] font-medium text-white transition-colors hover:bg-[#2563EB]"
      >
        Save Settings
      </button>
    </div>
  )
}
