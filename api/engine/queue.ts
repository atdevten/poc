import type { AppState, Patient, Room } from "../store/state"

export function calculateLoad(room: Room): number {
  return room.queue.length * room.avgDurationMin
}

export function calcEstFinishMin(patient: Patient, appState: AppState): number {
  const { settings, rooms } = appState
  const avgByType = new Map(settings.roomTypes.map((rt) => [rt.id, rt.avgDurationMin]))
  const currentRoom = patient.currentRoomId ? rooms.get(patient.currentRoomId) : null
  const currentRoomType = currentRoom?.roomType ?? null

  let total = 0

  if (patient.status === "IN_CONSULTATION" && currentRoom) {
    const elapsed = currentRoom.consultStartAt
      ? Math.floor((Date.now() - currentRoom.consultStartAt.getTime()) / 60000)
      : 0
    total += Math.max(0, currentRoom.avgDurationMin - elapsed)
    for (const rt of patient.remainingRooms) {
      total += avgByType.get(rt) ?? 10
    }
  } else if (patient.status === "WAITING" && currentRoom) {
    const pos = patient.queuePosition ?? 1
    total += pos * currentRoom.avgDurationMin
    for (const rt of patient.remainingRooms) {
      if (rt !== currentRoomType) total += avgByType.get(rt) ?? 10
    }
  } else {
    for (const rt of patient.remainingRooms) {
      total += avgByType.get(rt) ?? 10
    }
  }

  return Math.max(0, total)
}

function recalculatePositions(room: Room) {
  room.queue.forEach((p, i) => { p.queuePosition = i + 1 })
  const load = calculateLoad(room)
  return load
}

export function insertToQueue(room: Room, patient: Patient): void {
  if (patient.type === "emergency") {
    const idx = room.queue.findIndex((p) => p.type !== "emergency")
    if (idx === -1) room.queue.push(patient)
    else room.queue.splice(idx, 0, patient)
  } else if (patient.type === "vip") {
    const idx = room.queue.findIndex((p) => p.type === "normal")
    if (idx === -1) room.queue.push(patient)
    else room.queue.splice(idx, 0, patient)
  } else {
    room.queue.push(patient)
  }
  recalculatePositions(room)
  patient.status = "WAITING"
  patient.currentRoomId = room.id
}

export function removeFromQueue(room: Room, patientId: string): Patient | null {
  const idx = room.queue.findIndex((p) => p.id === patientId)
  if (idx === -1) return null
  const [patient] = room.queue.splice(idx, 1)
  recalculatePositions(room)
  return patient
}

export function getNextFromQueue(room: Room): Patient | null {
  return room.queue[0] ?? null
}

export function insertToLobby(appState: AppState, patient: Patient): void {
  patient.status = "LOBBY"
  patient.lobbySince = new Date()
  patient.currentRoomId = null
  patient.queuePosition = null

  if (patient.type === "emergency") {
    const idx = appState.lobby.findIndex((p) => p.type !== "emergency")
    if (idx === -1) appState.lobby.push(patient)
    else appState.lobby.splice(idx, 0, patient)
  } else if (patient.type === "vip") {
    const idx = appState.lobby.findIndex((p) => p.type === "normal")
    if (idx === -1) appState.lobby.push(patient)
    else appState.lobby.splice(idx, 0, patient)
  } else {
    appState.lobby.push(patient)
  }
}

export function removeFromLobby(appState: AppState, patientId: string): Patient | null {
  const idx = appState.lobby.findIndex((p) => p.id === patientId)
  if (idx === -1) return null
  const [patient] = appState.lobby.splice(idx, 1)
  return patient
}

export function getFromLobby(appState: AppState, roomType: string): Patient | null {
  const candidate = appState.lobby.find((p) => p.remainingRooms.includes(roomType))
  return candidate ?? null
}
