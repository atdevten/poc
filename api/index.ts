import { Hono } from "hono"
import { cors } from "hono/cors"
import { DurableObject } from "cloudflare:workers"
import { setDOContext, addConnection, removeConnection } from "./ws/broadcast"
import { setEnv } from "./engine/gemini"
import { handleAlarm } from "./engine/scheduler"
import { state, seedDemoData } from "./store/state"
import roomsRouter from "./routes/rooms"
import patientsRouter from "./routes/patients"
import doneRouter from "./routes/done"
import settingsRouter from "./routes/settings"

export interface Env {
  HOSPITAL: DurableObjectNamespace
  GEMINI_API_KEY: string
}

function createApp() {
  const app = new Hono()
  app.use("*", cors({ origin: "*" }))
  app.route("/api", roomsRouter)
  app.route("/api", patientsRouter)
  app.route("/api", doneRouter)
  app.route("/api", settingsRouter)
  return app
}

export class HospitalDO extends DurableObject<Env> {
  private app: Hono

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    setDOContext(ctx)
    setEnv(env)
    this.app = createApp()
    seedDemoData(state)
    ctx.storage.getAlarm().then((alarm) => {
      if (!alarm) ctx.storage.setAlarm(Date.now() + 60_000)
    })
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === "/ws") {
      const upgradeHeader = request.headers.get("Upgrade")
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 })
      }
      const { 0: client, 1: server } = new WebSocketPair()
      this.ctx.acceptWebSocket(server)
      addConnection(server)
      return new Response(null, { status: 101, webSocket: client })
    }

    return this.app.fetch(request)
  }

  async webSocketClose(ws: WebSocket) {
    removeConnection(ws)
  }

  async webSocketError(ws: WebSocket) {
    removeConnection(ws)
  }

  async alarm() {
    await handleAlarm()
    await this.ctx.storage.setAlarm(Date.now() + 60_000)
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = env.HOSPITAL.idFromName("hospital")
    const stub = env.HOSPITAL.get(id)
    return stub.fetch(request)
  },
}
