import { state } from "../store/state"
import { calculateLoad, removeFromLobby } from "./queue"
import { tryRebalance } from "./rebalance"
import { broadcast, serializePatient } from "../ws/broadcast"

export function startScheduler() {
  setInterval(() => {
    checkNoShows()
    checkPeriodicRebalance()
  }, 60_000)
}

function checkNoShows() {
  const now = Date.now()
  const timeoutMs = state.settings.noShowTimeoutMin * 60_000
  const toRemove = state.lobby.filter(
    (p) => p.status === "LOBBY" && p.lobbySince && now - p.lobbySince.getTime() > timeoutMs,
  )
  for (const patient of toRemove) {
    removeFromLobby(state, patient.id)
    patient.status = "NO_SHOW"
    broadcast("LOBBY_UPDATED", { patients: state.lobby.map(serializePatient), count: state.lobby.length })
    broadcast("NOTIFICATION", {
      kind: "warning",
      message: `No-show: ${patient.name} removed from lobby`,
      detail: null,
    })
  }
}

export async function checkPeriodicRebalance(excludeRoomId?: string) {
  const roomTypeIds = [...new Set([...state.rooms.values()].map((r) => r.roomType))]

  for (const roomTypeId of roomTypeIds) {
    const rooms = [...state.rooms.values()].filter(
      (r) => r.roomType === roomTypeId && r.status !== "closed" && r.id !== excludeRoomId,
    )
    if (rooms.length < 2) continue

    const loads = rooms.map((r) => calculateLoad(r))
    const maxLoad = Math.max(...loads)
    const minLoad = Math.min(...loads)
    if (maxLoad - minLoad <= state.settings.rebalanceThresholdMin) continue

    const destRoom = rooms.find((r) => calculateLoad(r) === minLoad)!
    await tryRebalance(state, destRoom, "periodic")
  }
}
