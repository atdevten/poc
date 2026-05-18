import type { AppState, Patient, RebalanceLog, Room } from "../store/state"
import { state } from "../store/state"
import { calculateLoad, insertToQueue, removeFromQueue, getNextFromQueue } from "./queue"
import { selectCandidate } from "./gemini"
import { broadcast, serializeRoom } from "../ws/broadcast"

export interface RebalanceResult {
  applied: boolean
  log?: RebalanceLog
  suggest?: {
    patientId: string
    patientName: string
    fromRoomId: string
    toRoomId: string
    reason: string
    aiUsed: boolean
  }
}

export function filterCandidates(room: Room): Patient[] {
  return room.queue
    .filter(
      (p) =>
        p.status === "WAITING" &&
        p.type === "normal" &&
        p.rebalanceCount < state.settings.maxRebalancePerPatient &&
        p.queuePosition !== 1,
    )
    .sort((a, b) => {
      const now = Date.now()
      const aWait = a.lobbySince ? now - a.lobbySince.getTime() : 0
      const bWait = b.lobbySince ? now - b.lobbySince.getTime() : 0
      if (bWait !== aWait) return bWait - aWait
      return (b.queuePosition ?? 0) - (a.queuePosition ?? 0)
    })
}

export async function tryRebalance(
  appState: AppState,
  destRoom: Room,
  trigger: RebalanceLog["trigger"],
): Promise<RebalanceResult> {
  const { settings } = appState
  const sameTypeRooms = [...appState.rooms.values()].filter(
    (r) => r.roomType === destRoom.roomType && r.id !== destRoom.id && r.status !== "closed",
  )

  if (sameTypeRooms.length === 0) return { applied: false }

  const destLoad = calculateLoad(destRoom)
  const overloadedRoom = sameTypeRooms
    .filter((r) => calculateLoad(r) - destLoad > settings.rebalanceThresholdMin)
    .sort((a, b) => calculateLoad(b) - calculateLoad(a))[0]

  if (!overloadedRoom) return { applied: false }

  const candidates = filterCandidates(overloadedRoom)
  if (candidates.length === 0) return { applied: false }

  const { selectedId, reason, aiUsed } = await selectCandidate(
    candidates,
    overloadedRoom,
    destRoom,
    settings.rebalanceThresholdMin,
  )

  const patient = candidates.find((c) => c.id === selectedId)!

  console.log(
    `[rebalance] trigger=${trigger} mode=${settings.mode} ai=${aiUsed}`,
    `| patient=${patient.name} (${patient.id})`,
    `| ${overloadedRoom.name} → ${destRoom.name}`,
    `| reason: ${reason}`,
  )

  const oldWait = (patient.queuePosition ?? 1) * overloadedRoom.avgDurationMin
  const newWait = destRoom.currentPatient
    ? (destRoom.queue.length + 1) * destRoom.avgDurationMin
    : 0
  const timeSavedMin = Math.max(0, oldWait - newWait)

  if (timeSavedMin === 0) return { applied: false }

  if (settings.mode === "suggest") {
    broadcast("REBALANCE_SUGGEST", {
      patientId: patient.id,
      patientName: patient.name,
      fromRoomId: overloadedRoom.id,
      fromRoomName: overloadedRoom.name,
      toRoomId: destRoom.id,
      toRoomName: destRoom.name,
      reason,
      aiUsed,
      timeSavedMin,
      expiresIn: 30,
    })
    return {
      applied: false,
      suggest: {
        patientId: patient.id,
        patientName: patient.name,
        fromRoomId: overloadedRoom.id,
        toRoomId: destRoom.id,
        reason,
        aiUsed,
      },
    }
  }

  // mode=auto: apply immediately
  return applyRebalance(appState, patient.id, overloadedRoom.id, destRoom.id, reason, aiUsed, trigger)
}

export function applyRebalance(
  appState: AppState,
  patientId: string,
  fromRoomId: string,
  toRoomId: string,
  reason: string,
  aiUsed: boolean,
  trigger: RebalanceLog["trigger"],
): RebalanceResult {
  const fromRoom = appState.rooms.get(fromRoomId)
  const toRoom = appState.rooms.get(toRoomId)
  const patient = appState.patients.get(patientId)

  if (!fromRoom || !toRoom || !patient) return { applied: false }

  const oldPos = patient.queuePosition ?? 1
  const oldWait = oldPos * fromRoom.avgDurationMin

  const newQueueLen = toRoom.queue.length
  const assignedImmediately = !toRoom.currentPatient
  const newWait = assignedImmediately ? 0 : (newQueueLen + 1) * toRoom.avgDurationMin
  const waitDifference = oldWait - newWait
  const reducedMin = Math.max(0, waitDifference)

  removeFromQueue(fromRoom, patientId)
  insertToQueue(toRoom, patient)
  patient.rebalanceCount++

  // If the destination room is idle, assign immediately instead of leaving in queue
  if (!toRoom.currentPatient) {
    const next = getNextFromQueue(toRoom)
    if (next) {
      toRoom.queue.shift()
      toRoom.currentPatient = next
      toRoom.consultStartAt = new Date()
      toRoom.status = "active"
      next.status = "IN_CONSULTATION"
      next.currentRoomId = toRoom.id
    }
  }

  const log: RebalanceLog = {
    id: `LOG${Date.now()}`,
    timestamp: new Date(),
    trigger,
    patientId,
    fromRoomId,
    toRoomId,
    reason,
    aiUsed,
  }
  state.logs.unshift(log)

  broadcast("ROOM_UPDATED", { roomId: fromRoomId, room: serializeRoom(fromRoom) })
  broadcast("ROOM_UPDATED", { roomId: toRoomId, room: serializeRoom(toRoom) })
  broadcast("REBALANCE_APPLIED", { log })
  broadcast("NOTIFICATION", {
    kind: "info",
    message: `↔ Moved ${patient.name}: ${fromRoom.name} → ${toRoom.name} | saved ${reducedMin}m`,
    detail: reason,
  })

  return { applied: true, log }
}
