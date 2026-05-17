import { Hono } from "hono"
import { state } from "../store/state"
import { serializeRoom, serializePatient } from "../ws/broadcast"

const app = new Hono()

app.get("/rooms", (c) => {
  const roomTypes = state.settings.roomTypes.map((rt) => ({
    ...rt,
    rooms: [...state.rooms.values()]
      .filter((r) => r.roomType === rt.id)
      .map((r) => serializeRoom(r)),
  }))
  return c.json({ roomTypes })
})

app.get("/lobby", (c) => {
  return c.json({ patients: state.lobby.map(serializePatient), count: state.lobby.length })
})

export default app
