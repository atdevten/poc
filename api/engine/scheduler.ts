import { state } from "../store/state"
import { calculateLoad, getFromLobby, insertToQueue, removeFromLobby } from "./queue"
import { tryRebalance } from "./rebalance"
import { broadcast, serializePatient, serializeRoom } from "../ws/broadcast"

export function startScheduler() {
  setInterval(() => {
    checkPeriodicRebalance()
  }, 60_000)
}

// Pull lobby patients into rooms that are idle or have empty queues.
// Runs immediately on every lobby change — no 60s wait needed.
export function fillEmptyQueuesFromLobby(): void {
  let lobbyChanged = false

  for (const room of state.rooms.values()) {
    if (room.status === "closed") continue

    const patient = getFromLobby(state, room.roomType)
    if (!patient) continue

    removeFromLobby(state, patient.id)

    if (!room.currentPatient) {
      // Idle room — assign directly
      room.currentPatient = patient
      room.consultStartAt = new Date()
      room.status = "active"
      patient.status = "IN_CONSULTATION"
      patient.currentRoomId = room.id
    } else if (room.queue.length === 0) {
      // Active room with empty queue — add to queue
      insertToQueue(room, patient)
    } else {
      // Room has queue — put patient back and skip
      state.lobby.unshift(patient)
      continue
    }

    lobbyChanged = true
    broadcast("ROOM_UPDATED", { roomId: room.id, room: serializeRoom(room) })
  }

  if (lobbyChanged) {
    broadcast("LOBBY_UPDATED", { patients: state.lobby.map(serializePatient), count: state.lobby.length })
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
