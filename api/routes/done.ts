import { Hono } from "hono"
import { state } from "../store/state"
import { getNextFromQueue, getFromLobby, insertToLobby, removeFromLobby } from "../engine/queue"
import { tryRebalance } from "../engine/rebalance"
import { checkPeriodicRebalance, fillEmptyQueuesFromLobby } from "../engine/scheduler"
import { broadcast, serializeRoom, serializePatient } from "../ws/broadcast"

const app = new Hono()

app.post("/done/:roomId", async (c) => {
  const roomId = c.req.param("roomId")
  const room = state.rooms.get(roomId)

  if (!room) return c.json({ error: "Room not found" }, 404)
  if (!room.currentPatient) return c.json({ error: "No current patient" }, 400)

  // STEP 1 — Mark current patient done
  const patient = room.currentPatient
  patient.completedRooms.push(room.roomType)
  patient.remainingRooms = patient.remainingRooms.filter((rt) => rt !== room.roomType)
  patient.status = "DONE_ROOM"
  room.currentPatient = null
  room.consultStartAt = null
  room.status = "idle"

  const completedPatient = { ...patient }

  if (patient.remainingRooms.length === 0) {
    patient.status = "COMPLETED"
    state.patients.delete(patient.id)
    broadcast("PATIENT_COMPLETED", { patientId: patient.id, patientName: patient.name })
    broadcast("NOTIFICATION", { kind: "success", message: `${patient.name} completed all rooms`, detail: null })
  } else {
    insertToLobby(state, patient)
    fillEmptyQueuesFromLobby()
    broadcast("LOBBY_UPDATED", { patients: state.lobby.map(serializePatient), count: state.lobby.length })
  }

  // STEP 2 — Next from room queue
  let next = getNextFromQueue(room)
  if (next) {
    room.queue.shift()
    assignPatient(room, next)
    broadcast("ROOM_UPDATED", { roomId: room.id, room: serializeRoom(room) })
    // Queue is now shorter — fill it from lobby immediately
    fillEmptyQueuesFromLobby()
    void setImmediate(() => checkPeriodicRebalance(room.id))
    return c.json({ completedPatient, nextPatient: next, rebalanceSuggest: null })
  }

  // STEP 3A — Check lobby
  const lobbyPatient = getFromLobby(state, room.roomType)
  if (lobbyPatient) {
    removeFromLobby(state, lobbyPatient.id)
    assignPatient(room, lobbyPatient)
    broadcast("LOBBY_UPDATED", { patients: state.lobby.map(serializePatient), count: state.lobby.length })
    broadcast("ROOM_UPDATED", { roomId: room.id, room: serializeRoom(room) })
    // Trigger rebalance for all OTHER rooms in background
    void setImmediate(() => checkPeriodicRebalance(room.id))
    return c.json({ completedPatient, nextPatient: lobbyPatient, rebalanceSuggest: null })
  }

  // STEP 3B — Try rebalance
  const result = await tryRebalance(state, room, "done")

  if (result.applied) {
    // Rebalance moved patient directly into the room queue — pull next
    next = getNextFromQueue(room)
    if (next) {
      room.queue.shift()
      assignPatient(room, next)
    }
    broadcast("ROOM_UPDATED", { roomId: room.id, room: serializeRoom(room) })
    return c.json({ completedPatient, nextPatient: next ?? null, rebalanceSuggest: null })
  }

  // STEP 4 — Idle
  room.status = "idle"
  broadcast("ROOM_UPDATED", { roomId: room.id, room: serializeRoom(room) })
  // Trigger rebalance for all OTHER rooms in background (this room already handled in STEP 3B)
  void setImmediate(() => checkPeriodicRebalance(room.id))
  return c.json({
    completedPatient,
    nextPatient: null,
    rebalanceSuggest: result.suggest ?? null,
  })
})

function assignPatient(room: (typeof state.rooms extends Map<string, infer R> ? R : never), patient: import("../store/state").Patient) {
  room.currentPatient = patient
  room.consultStartAt = new Date()
  room.status = "active"
  patient.status = "IN_CONSULTATION"
  patient.currentRoomId = room.id
}

export default app
