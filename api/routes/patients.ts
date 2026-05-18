import { Hono } from "hono"
import { state } from "../store/state"
import type { Patient } from "../store/state"
import { calculateLoad, insertToLobby, insertToQueue } from "../engine/queue"
import { broadcast, serializeRoom, serializePatient } from "../ws/broadcast"

const app = new Hono()

app.post("/patients/add", async (c) => {
  const body = await c.req.json<{ name: string; type: string; medicalReason?: string }>()

  if (!body.name || !["emergency", "vip", "normal"].includes(body.type)) {
    return c.json({ error: "Invalid request" }, 400)
  }

  const allRoomTypes = state.settings.roomTypes.map((rt) => rt.id)
  const patient: Patient = {
    id: `P${Date.now()}`,
    name: body.name,
    type: body.type as Patient["type"],
    status: "LOBBY",
    checkedInAt: new Date(),
    lobbySince: new Date(),
    currentRoomId: null,
    completedRooms: [],
    remainingRooms: [...allRoomTypes],
    rebalancedToday: false,
    queuePosition: null,
    medicalReason: body.medicalReason ?? "Not specified",
  }

  state.patients.set(patient.id, patient)

  if (patient.type === "emergency") {
    broadcast("EMERGENCY_ADDED", { patient })
    broadcast("NOTIFICATION", {
      kind: "emergency",
      message: `Emergency: ${patient.name} just added`,
      detail: patient.medicalReason,
    })
  }

  // Route to first room in journey order
  const firstRoomType = patient.remainingRooms[0]
  const eligibleRooms = [...state.rooms.values()].filter(
    (r) =>
      r.roomType === firstRoomType &&
      r.status !== "closed" &&
      r.queue.length < state.settings.maxQueuePerRoom,
  )

  if (eligibleRooms.length > 0) {
    const bestRoom = eligibleRooms.sort((a, b) => calculateLoad(a) - calculateLoad(b))[0]

    if (bestRoom.status === "idle" && !bestRoom.currentPatient) {
      bestRoom.currentPatient = patient
      bestRoom.consultStartAt = new Date()
      bestRoom.status = "active"
      patient.status = "IN_CONSULTATION"
      patient.currentRoomId = bestRoom.id
    } else {
      insertToQueue(bestRoom, patient)
    }

    broadcast("ROOM_UPDATED", { roomId: bestRoom.id, room: serializeRoom(bestRoom) })
    return c.json({ patient, assignedRoomId: bestRoom.id })
  }

  // All rooms of first type full — put in lobby
  insertToLobby(state, patient)
  broadcast("LOBBY_UPDATED", { patients: state.lobby.map(serializePatient), count: state.lobby.length })
  return c.json({ patient, assignedRoomId: null })
})

export default app
