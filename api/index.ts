import { Hono } from "hono"
import { cors } from "hono/cors"
import { createBunWebSocket } from "hono/bun"
import { addConnection, removeConnection } from "./ws/broadcast"
import roomsRouter from "./routes/rooms"
import patientsRouter from "./routes/patients"
import doneRouter from "./routes/done"
import settingsRouter from "./routes/settings"
import { startScheduler } from "./engine/scheduler"

const app = new Hono()
const { upgradeWebSocket, websocket } = createBunWebSocket()

app.use("*", cors({ origin: "*" }))

app.route("/api", roomsRouter)
app.route("/api", patientsRouter)
app.route("/api", doneRouter)
app.route("/api", settingsRouter)

app.get(
  "/ws",
  upgradeWebSocket(() => ({
    onOpen(_, ws) {
      addConnection(ws.raw as WebSocket)
    },
    onClose(_, ws) {
      removeConnection(ws.raw as WebSocket)
    },
    onError(_, ws) {
      removeConnection(ws.raw as WebSocket)
    },
  })),
)

startScheduler()

const PORT = Number(process.env.PORT ?? 3001)
console.log(`API running on http://localhost:${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch,
  websocket,
}
