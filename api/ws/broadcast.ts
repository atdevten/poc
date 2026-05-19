import type { WSEvent, WSEventType } from "../store/state"
import { state } from "../store/state"
import { calculateLoad, calcEstFinishMin } from "../engine/queue"
import type { Patient, Room } from "../store/state"

let doCtx: { getWebSockets(): WebSocket[] } | null = null

export function setDOContext(ctx: { getWebSockets(): WebSocket[] }) {
  doCtx = ctx
}

export function addConnection(ws: WebSocket) {
  ws.send(JSON.stringify({ type: "SNAPSHOT", payload: buildSnapshot(), timestamp: new Date() }))
}

export function removeConnection(_ws: WebSocket) {
  // DO manages WebSocket lifecycle automatically
}

export function broadcast(type: WSEventType, payload: unknown) {
  if (!doCtx) return
  const event: WSEvent = { type, payload, timestamp: new Date() }
  const msg = JSON.stringify(event)
  for (const ws of doCtx.getWebSockets()) {
    try {
      ws.send(msg)
    } catch {
      // DO handles cleanup
    }
  }
}

function buildSnapshot() {
  const roomTypes = state.settings.roomTypes.map((rt) => ({
    ...rt,
    rooms: [...state.rooms.values()]
      .filter((r) => r.roomType === rt.id)
      .map((r) => serializeRoom(r)),
  }))

  return {
    roomTypes,
    lobby: state.lobby.map((p) => serializePatient(p)),
    settings: state.settings,
    logs: state.logs,
  }
}

export function serializePatient(patient: Patient) {
  const waitMin = Math.floor((Date.now() - new Date(patient.checkedInAt).getTime()) / 60000)
  return { ...patient, estFinishMin: calcEstFinishMin(patient, state), waitMin }
}

export function serializeRoom(room: Room) {
  const load = calculateLoad(room)
  const consultMinutes = room.consultStartAt
    ? Math.floor((Date.now() - room.consultStartAt.getTime()) / 60000)
    : null
  return {
    ...room,
    load,
    consultMinutes,
    currentPatient: room.currentPatient ? serializePatient(room.currentPatient) : null,
    queue: room.queue.map(serializePatient),
  }
}
