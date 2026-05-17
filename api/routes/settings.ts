import { Hono } from "hono"
import { state, resetState } from "../store/state"
import { broadcast, serializeRoom } from "../ws/broadcast"
import { applyRebalance } from "../engine/rebalance"

const app = new Hono()

app.get("/settings", (c) => {
  return c.json(state.settings)
})

app.post("/settings", async (c) => {
  const body = await c.req.json()
  state.settings = { ...state.settings, ...body }
  broadcast("SETTINGS_UPDATED", { settings: state.settings })
  return c.json(state.settings)
})

app.post("/rebalance/apply", async (c) => {
  const body = await c.req.json<{ patientId: string; fromRoomId: string; toRoomId: string }>()

  const { patientId, fromRoomId, toRoomId } = body
  if (!patientId || !fromRoomId || !toRoomId) {
    return c.json({ error: "Missing fields" }, 400)
  }

  const result = applyRebalance(state, patientId, fromRoomId, toRoomId, "Manual apply by coordinator", false, "manual")
  if (!result.applied) {
    return c.json({ error: "Could not apply rebalance" }, 400)
  }

  return c.json({ success: true, log: result.log })
})

app.post("/reset", (c) => {
  resetState()
  // Push full snapshot to all connected clients
  const roomTypes = state.settings.roomTypes.map((rt) => ({
    ...rt,
    rooms: [...state.rooms.values()]
      .filter((r) => r.roomType === rt.id)
      .map((r) => serializeRoom(r)),
  }))
  broadcast("SNAPSHOT", { roomTypes, lobby: state.lobby, settings: state.settings, logs: state.logs })
  return c.json({ ok: true })
})

export default app
