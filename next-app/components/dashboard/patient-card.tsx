import { type Patient, type PatientType } from "@/lib/mock-data"

const ROOM_LABEL: Record<string, { icon: string; short: string }> = {
  bmi:        { icon: "🏃", short: "BMI" },
  blood_test: { icon: "🩸", short: "Blood" },
  radiology:  { icon: "🔬", short: "X-Ray" },
}

function waitColor(min: number) {
  if (min < 10) return "#16A34A"
  if (min < 20) return "#D97706"
  return "#EF4444"
}

function fmtEst(min: number): string {
  if (min <= 0) return "< 1m"
  if (min < 60) return `~${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`
}

function TypeBadge({ type }: { type: PatientType }) {
  if (type === "emergency") {
    return (
      <span
        className="inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
        style={{ backgroundColor: "#FECACA", color: "#B91C1C" }}
      >
        🚨 EMERGENCY
      </span>
    )
  }
  if (type === "vip") {
    return (
      <span
        className="inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
        style={{ backgroundColor: "#FDE68A", color: "#92400E" }}
      >
        🥇 VIP
      </span>
    )
  }
  return <span className="text-[16px]">👤</span>
}

interface PatientCardProps {
  patient: Patient
}

export function PatientCard({ patient }: PatientCardProps) {
  const borderColor =
    patient.type === "emergency" ? "#FECACA" : patient.type === "vip" ? "#FDE68A" : "#E2E8F0"
  const bgColor =
    patient.type === "emergency" ? "#FEF2F2" : patient.type === "vip" ? "#FFFBEB" : "#FFFFFF"

  return (
    <div
      className="flex w-40 shrink-0 flex-col gap-2 rounded-xl p-3"
      style={{ minHeight: 140, backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
    >
      <TypeBadge type={patient.type} />

      <div>
        <p className="font-sans text-[14px] font-bold leading-tight text-[#0F172A]">{patient.name}</p>
        <p className="font-mono text-[11px] text-[#94A3B8]">#{patient.id}</p>
      </div>

      <p className="font-mono text-[12px]" style={{ color: waitColor(patient.waitMin) }}>
        ⏱ {patient.waitMin}m wait
      </p>

      <p className="font-mono text-[11px] text-[#64748B]">
        🏁 {fmtEst(patient.estFinishMin)} est.
      </p>

      <div className="flex items-center gap-1">
        {Array.from({ length: patient.totalRooms }).map((_, i) => (
          <span
            key={i}
            className="block h-[7px] w-[7px] rounded-sm"
            style={{ backgroundColor: i < patient.completedRooms ? "#16A34A" : "#E2E8F0" }}
          />
        ))}
        <span className="ml-1 font-mono text-[10px] text-[#94A3B8]">
          {patient.completedRooms}/{patient.totalRooms}
        </span>
      </div>

      {patient.remainingRooms.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {patient.remainingRooms.map((rt) => {
            const label = ROOM_LABEL[rt] ?? { icon: "📋", short: rt }
            return (
              <span
                key={rt}
                className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-mono text-[9px]"
                style={{ backgroundColor: "#F1F5F9", color: "#475569" }}
              >
                {label.icon} {label.short}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
