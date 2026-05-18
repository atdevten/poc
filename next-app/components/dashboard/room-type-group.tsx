import { type RoomTypeGroup as RoomTypeGroupData, type Room } from "@/lib/mock-data"
import type { RebalanceSuggestPayload } from "@/lib/api-types"
import { RoomCard } from "./room-card"

interface RoomTypeGroupProps {
  group: RoomTypeGroupData
  onDone: (roomId: string) => Promise<void>
  assignmentMode: "auto" | "suggest"
  pendingSuggestions: RebalanceSuggestPayload[]
  onAcceptSuggestion: (s: RebalanceSuggestPayload) => Promise<void>
  onDeclineSuggestion: (s: RebalanceSuggestPayload) => void
}

export function RoomTypeGroup({ group, onDone, assignmentMode, pendingSuggestions, onAcceptSuggestion, onDeclineSuggestion }: RoomTypeGroupProps) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
        <span className="text-[15px]">{group.emoji}</span>
        <span className="font-mono text-[12px] uppercase tracking-wide text-[#64748B]">
          {group.type}
        </span>
        <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 font-mono text-[11px] text-[#94A3B8]">
          {group.rooms.length} station{group.rooms.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        {group.rooms.map((room: Room) => {
          const suggestion = pendingSuggestions.find((s) => s.fromRoomId === room.id) ?? null
          return (
            <RoomCard
              key={room.id}
              room={room}
              onDone={onDone}
              assignmentMode={assignmentMode}
              pendingSuggestion={suggestion}
              onAcceptSuggestion={onAcceptSuggestion}
              onDeclineSuggestion={onDeclineSuggestion}
            />
          )
        })}
      </div>
    </div>
  )
}
