import { type RoomTypeGroup } from "@/lib/mock-data"
import type { RebalanceSuggestPayload } from "@/lib/api-types"
import { RoomTypeGroup as RoomTypeGroupComponent } from "./room-type-group"

interface RoomsZoneProps {
  groups: RoomTypeGroup[]
  onDone: (roomId: string) => Promise<void>
  pendingSuggestions: RebalanceSuggestPayload[]
  onAcceptSuggestion: (s: RebalanceSuggestPayload) => Promise<void>
  onDeclineSuggestion: (s: RebalanceSuggestPayload) => void
}

export function RoomsZone({ groups, onDone, pendingSuggestions, onAcceptSuggestion, onDeclineSuggestion }: RoomsZoneProps) {
  return (
    <section className="flex-1 overflow-y-auto px-6 py-5">
      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <RoomTypeGroupComponent
            key={group.type}
            group={group}
            onDone={onDone}
            pendingSuggestions={pendingSuggestions}
            onAcceptSuggestion={onAcceptSuggestion}
            onDeclineSuggestion={onDeclineSuggestion}
          />
        ))}
      </div>
    </section>
  )
}
