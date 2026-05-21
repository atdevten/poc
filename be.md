# Backend & Queue Flow — Wellness Center POC

> Backend architecture, data structures, API endpoints, queue engine, and full queue flow from check-in to exit.

---

## 1. Tech Stack

```
Runtime:      Bun
Framework:    Hono
Language:     TypeScript
Storage:      In-memory (POC) — plain JS object
Realtime:     WebSocket (Hono built-in with Bun)
AI:           Google Gemini API (gemini-1.5-flash)
Shared types: pnpm workspace package
```

---

## 2. Project Structure

```
apps/api/
├── index.ts                  ← Hono app entry, WebSocket setup
│
├── routes/
│   ├── rooms.ts              ← GET /rooms, GET /lobby
│   ├── patients.ts           ← POST /patients/add
│   ├── done.ts               ← POST /done/:roomId
│   └── settings.ts           ← GET/POST /settings
│
├── engine/
│   ├── queue.ts              ← queue insert, remove, prioritize
│   ├── rebalance.ts          ← detect imbalance, filter candidates
│   ├── scheduler.ts          ← periodic scan every 60s
│   └── gemini.ts             ← Gemini API client
│
├── store/
│   └── state.ts              ← in-memory state singleton
│
└── ws/
    └── broadcast.ts          ← WebSocket connection manager
```

---

## 3. Data Structures

### 3.1 PatientType

```typescript
type PatientType = "emergency" | "vip" | "normal"
```

### 3.2 PatientStatus

```typescript
type PatientStatus =
  | "LOBBY"            // checked in, not yet in any room
  | "WAITING"          // in a room queue, not yet served
  | "IN_CONSULTATION"  // currently being served
  | "DONE_ROOM"        // finished current room, moving to next
  | "COMPLETED"        // finished all rooms, exited
  | "NO_SHOW"          // did not arrive within timeout
  | "CANCELLED"        // manually cancelled
```

### 3.3 Patient

```typescript
interface Patient {
  id:                string       // "P001"
  name:              string       // "Nguyen Van A"
  type:              PatientType  // emergency | vip | normal
  status:            PatientStatus
  checkedInAt:       Date
  lobbySince:        Date | null  // when entered lobby
  currentRoomId:     string | null
  completedRooms:    string[]     // ["bmi", "blood_test"]
  remainingRooms:    string[]     // ["radiology"]
  rebalancedToday:   boolean
  queuePosition:     number | null
}
```

### 3.4 Room

```typescript
interface Room {
  id:              string       // "blood-1"
  name:            string       // "Blood Test Room 1"
  roomType:        string       // "blood_test"
  avgDurationMin:  number       // 12
  status:          "active" | "idle" | "closed"
  currentPatient:  Patient | null
  consultStartAt:  Date | null  // when current patient entered
  queue:           Patient[]    // ordered: Emergency → VIP → Normal
}
```

### 3.5 RoomType (from Settings)

```typescript
interface RoomType {
  id:          string   // "blood_test"
  name:        string   // "Blood Test"
  icon:        string   // "🩸"
  openTime:    string   // "08:00"
  closeTime:   string   // "16:00"
  order:       number   // position in patient journey (not used for routing order since no fixed order)
}
```

### 3.6 Settings

```typescript
interface Settings {
  rebalanceThresholdMin:  number   // 20
  maxQueuePerRoom:        number   // 5
  mode:                  "auto" | "suggest"
  noShowTimeoutMin:       number   // 15
  emergencySoundAlert:    boolean  // true
  emergencyBannerAlert:   boolean  // true
  allowVipRebalance:      boolean  // false
  allowNormalRebalance:   boolean  // true
  roomTypes:              RoomType[]
}
```

### 3.7 AppState (in-memory singleton)

```typescript
interface AppState {
  patients:  Map<string, Patient>   // patientId → Patient
  rooms:     Map<string, Room>      // roomId → Room
  lobby:     Patient[]              // ordered: Emergency → VIP → Normal
  settings:  Settings
  logs:      RebalanceLog[]
}
```

### 3.8 RebalanceLog

```typescript
interface RebalanceLog {
  id:            string
  timestamp:     Date
  trigger:       "done" | "emergency" | "periodic" | "manual"
  patientId:     string
  fromRoomId:    string
  toRoomId:      string
  reason:        string   // Gemini explanation or "fallback: longest wait"
  aiUsed:        boolean
}
```

### 3.9 WebSocket Event

```typescript
type WSEventType =
  | "ROOM_UPDATED"       // room state changed
  | "LOBBY_UPDATED"      // lobby list changed
  | "REBALANCE_SUGGEST"  // AI suggestion (mode=suggest)
  | "REBALANCE_APPLIED"  // rebalance completed
  | "EMERGENCY_ADDED"    // new emergency patient
  | "PATIENT_COMPLETED"  // patient finished all rooms
  | "NOTIFICATION"       // generic notification

interface WSEvent {
  type:      WSEventType
  payload:   unknown
  timestamp: Date
}
```

---

## 4. API Endpoints

### 4.1 GET /api/rooms

```
Response: full state of all rooms grouped by room type

{
  roomTypes: [
    {
      id:   "blood_test",
      name: "Blood Test",
      icon: "🩸",
      rooms: [
        {
          id:             "blood-1",
          name:           "Blood Test Room 1",
          status:         "active",
          load:           48,           ← calculated: queue.length × avgDuration
          currentPatient: { ...Patient },
          consultMinutes: 15,           ← how long current patient has been IN
          queue:          [ ...Patient ]
        }
      ]
    }
  ]
}
```

### 4.2 GET /api/lobby

```
Response: ordered lobby list

{
  patients: [ ...Patient ],  ← Emergency first, VIP second, Normal FIFO
  count: 4
}
```

### 4.3 POST /api/patients/add

```
Request:
{
  name:   "Le Van C",
  type:   "emergency",   ← emergency | vip | normal
  reason: "Chest pain"   ← optional
}

Response:
{
  patient: { ...Patient },
  assignedRoomId: "bmi-1" | null   ← null if lobby, room if immediately assigned
}

Side effects:
  → Patient added to lobby (or room if immediately assignable)
  → If emergency: broadcast EMERGENCY_ADDED to all WS clients
  → Trigger rebalance check
```

### 4.4 POST /api/done/:roomId

```
Request: (no body needed)

Response:
{
  completedPatient: { ...Patient },
  nextPatient:      { ...Patient } | null,
  rebalanceSuggest: {              ← only if mode=suggest
    candidateId: string,
    reason:      string,
    fromRoom:    string,
    toRoom:      string
  } | null
}

Side effects:
  → Runs full Done logic (see Section 6)
  → Broadcasts room updates via WebSocket
```

### 4.5 POST /api/rebalance/apply

```
Request:
{
  patientId: "N005",
  fromRoomId: "blood-1",
  toRoomId:   "blood-3"
}

Response:
{
  success: true,
  log: { ...RebalanceLog }
}

Used when: coordinator clicks [Apply] on AI suggestion card
```

### 4.6 GET /api/settings

```
Response: { ...Settings }
```

### 4.7 POST /api/settings

```
Request: { ...Partial<Settings> }

Response: { ...Settings }

Side effects:
  → Validates all fields
  → Updates in-memory settings
  → Broadcasts SETTINGS_UPDATED to all WS clients
```

### 4.8 WebSocket /ws

```
Client connects → receives full current state snapshot
Client listens for WSEvent objects

Server sends events on:
  → Any state change (room, lobby, rebalance, notification)

Client never sends to server via WS
  (all mutations go through REST endpoints)
```

---

## 5. Queue Engine

> File: engine/queue.ts

### 5.1 Insert patient into queue

```
insertToQueue(room: Room, patient: Patient): void

Logic:
  if patient.type == "emergency":
    find index of first non-emergency patient
    insert BEFORE that index

  if patient.type == "vip":
    find index of first normal patient
    insert BEFORE that index

  if patient.type == "normal":
    push to end of queue

  recalculate all queuePosition values (1-indexed)
  recalculate room.load
```

### 5.2 Remove patient from queue

```
removeFromQueue(room: Room, patientId: string): Patient | null

Logic:
  find patient in room.queue by id
  splice from array
  recalculate all queuePosition values
  recalculate room.load
  return removed patient (or null if not found)
```

### 5.3 Calculate load

```
calculateLoad(room: Room): number

Logic:
  load = room.queue.length × room.avgDurationMin

  Note: does NOT include currentPatient's remaining time
  (too complex to estimate for POC — kept simple)
```

### 5.4 Get priority patient from queue

```
getNextFromQueue(room: Room): Patient | null

Logic:
  return room.queue[0] (already sorted by priority)
  return null if queue is empty
```

### 5.5 Insert patient into lobby

```
insertToLobby(state: AppState, patient: Patient): void

Logic:
  same priority ordering as queue:
    Emergency → VIP → Normal (FIFO within tier)
  update patient.status = "LOBBY"
  update patient.lobbySince = now
```

### 5.6 Get eligible patient from lobby for a room type

```
getFromLobby(state: AppState, roomType: string): Patient | null

Logic:
  candidates = state.lobby.filter(p =>
    p.remainingRooms.includes(roomType)
  )

  Since all patients do all rooms:
    candidates = all lobby patients
    (every patient remaining rooms includes all room types)

  return candidates[0]  ← already priority-sorted
  return null if no candidates
```

---

## 6. Done Logic — Full Flow

> File: routes/done.ts + engine/rebalance.ts

```
POST /done/:roomId called
          │
          ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — Mark current patient done
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  patient = room.currentPatient
  patient.completedRooms.add(roomType)
  patient.remainingRooms.remove(roomType)
  patient.status = "DONE_ROOM"
  room.currentPatient = null
  room.consultStartAt = null
  room.status = "idle"

  if patient.remainingRooms.isEmpty():
    patient.status = "COMPLETED"
    remove from all state
    broadcast PATIENT_COMPLETED
    → send to lobby? NO — patient exits the system
  else:
    patient.status = "LOBBY"
    insert patient back into lobby
    broadcast LOBBY_UPDATED
          │
          ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — Find next patient for room
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  next = getNextFromQueue(room)
  // Emergency → VIP → Normal

  if next found:
    → go to STEP 5 (assign)
          │
          ▼  (queue empty)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3A — Check lobby
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  next = getFromLobby(state, room.roomType)

  if next found:
    remove from lobby
    → go to STEP 5 (assign)
          │
          ▼  (lobby empty or no eligible)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3B — Check rebalance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  sameTypeRooms = all active rooms with roomType == room.roomType
                  EXCEPT current room

  if sameTypeRooms.isEmpty():
    → STEP 4 (idle)

  overloadedRoom = sameTypeRooms
    .filter(r => calculateLoad(r) - calculateLoad(room) > threshold)
    .sortBy(load, desc)
    [0]   ← highest load room

  if no overloadedRoom:
    → STEP 4 (idle)

  candidates = filterCandidates(overloadedRoom)
  // see Section 7

  if candidates.isEmpty():
    → STEP 4 (idle)

  if candidates.length == 1:
    selected = candidates[0]
    reason = "Only eligible candidate"
    aiUsed = false
    → go to STEP 5

  if candidates.length >= 2:
    → call Gemini (see Section 8)
    selected = gemini.selectedId
    reason = gemini.reason
    aiUsed = true

    if Gemini fails:
      selected = candidates.sortBy(waitTime, desc)[0]
      reason = "fallback: longest wait"
      aiUsed = false

  if settings.mode == "suggest":
    → broadcast REBALANCE_SUGGEST to coordinator
    → return response with rebalanceSuggest payload
    → STOP here, wait for coordinator to POST /rebalance/apply

  if settings.mode == "auto":
    → proceed to apply rebalance
          │
          ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — Room idle
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  room.status = "idle"
  broadcast ROOM_UPDATED
  return
          │
          ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — Assign next patient
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  room.currentPatient = next
  room.consultStartAt = now
  room.status = "active"
  next.status = "IN_CONSULTATION"
  next.currentRoomId = room.id
  next.rebalancedToday = true  ← if came from rebalance
          │
          ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — Broadcast & log
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  broadcast ROOM_UPDATED (current room)
  broadcast ROOM_UPDATED (source room if rebalance)
  broadcast LOBBY_UPDATED (if lobby changed)
  broadcast REBALANCE_APPLIED (if rebalance happened)

  if rebalance:
    save RebalanceLog {
      patientId, fromRoomId, toRoomId, reason, aiUsed
    }

  push NOTIFICATION to all clients
```

---

## 7. Filter Candidates for Rebalance

> File: engine/rebalance.ts — filterCandidates()

```
filterCandidates(room: Room): Patient[]

Input:  overloaded source room
Output: eligible patients to potentially move

Filter rules (ALL must pass):

  ✅ status == "WAITING"
     (not IN_CONSULTATION — never interrupt)

  ✅ type == "normal"
     (never move Emergency or VIP)

  ✅ rebalancedToday == false
     (never move someone who was already moved today)
     (resets on server restart — in-memory POC, single-day operation)

  ✅ queuePosition != 1
     (don't move the next-in-line — they're about to be called)

  ✅ patient.remainingRooms.includes(destination.roomType)
     (patient still needs this room type — always true since all patients do all rooms)

Sort result by:
  Primary:   waitTime DESC (longest wait first)
  Secondary: queuePosition DESC (furthest from front = least disruptive)
```

---

## 8. Gemini Integration

> File: engine/gemini.ts

### 8.1 When Gemini is called

```
ONLY when:
  1. Rebalance is triggered (delta > threshold)
  2. Eligible candidates count >= 2
  3. Gemini API key is configured

NOT called when:
  - Emergency patient (immediate action, no ranking needed)
  - Only 1 candidate (no ranking needed)
  - Gemini is disabled in env
```

### 8.2 Prompt structure

```
System prompt (fixed):
  "You are a queue coordinator AI for a medical wellness center.
   You help decide which patient should be moved to balance room loads.
   Always respond with valid JSON only. No explanation outside JSON."

User prompt (dynamic):
  "Current situation:
   Source room: {room.name}, load = {sourceLoad} min
   Destination room: {destRoom.name}, load = {destLoad} min
   Load delta: {delta} min (threshold: {threshold} min)

   Eligible candidates to move (all Normal patients):
   {candidates as JSON array with id, name, waitMin, queuePosition}

   Rules:
   - Pick at least 2 patients
   - Prefer longer wait time (fairness)
   - Prefer higher queue position number (less disruptive to move)
   - Balance both factors — do not pick longest wait blindly if they are next in line
   - Respond in Vietnamese for the reason field

   Respond with:
   {
     \"selected_id\": \"...\",
     \"reason\": \"1 sentence in Vietnamese\"
   }"
```

### 8.3 Response handling

```
Success:
  Parse JSON from Gemini response
  Validate selected_id exists in candidates list
  Use selected patient + reason

Failure cases:
  - Network error       → use fallback
  - Timeout (> 3s)     → use fallback
  - Invalid JSON        → use fallback
  - selected_id invalid → use fallback

Fallback:
  selected = candidates[0]  ← sorted by waitTime DESC already
  reason   = "Auto-selected longest-waiting patient"
  aiUsed   = false
```

### 8.4 Gemini call — blocking with timeout

```
Both modes call Gemini synchronously with 3s timeout before responding.

Flow:
  1. Done endpoint processes Steps 1–3 synchronously
  2. If Gemini needed:
     call Gemini with 3s timeout
     if resolved: use selected_id + reason
     if timeout/error: use fallback (longest wait)
  3. if mode=suggest: return rebalanceSuggest in HTTP response + broadcast REBALANCE_SUGGEST
     if mode=auto:    apply rebalance immediately, return result in HTTP response + broadcast REBALANCE_APPLIED
```

---

## 9. Periodic Scheduler

> File: engine/scheduler.ts

```
Runs every 60 seconds via setInterval

Scan logic:
  For each room type:
    rooms = all active rooms of this type
    if rooms.length < 2: skip (no rebalance possible)

    maxLoad = max(rooms.map(calculateLoad))
    minLoad = min(rooms.map(calculateLoad))
    delta = maxLoad - minLoad

    if delta > threshold:
      overloadedRoom = room with maxLoad
      idleRoom       = room with minLoad

      candidates = filterCandidates(overloadedRoom)
      if candidates.length == 0: skip

      → trigger rebalance flow (same as Step 3B in Done logic)
      → log trigger = "periodic"

Also checks:
  For each patient in LOBBY status:
    if patient.lobbySince + noShowTimeoutMin < now:
      patient.status = "NO_SHOW"
      remove from state.lobby
      broadcast LOBBY_UPDATED
      (WAITING patients are already committed to a room queue — no no-show applied)
```

---

## 10. WebSocket Broadcast

> File: ws/broadcast.ts

### 10.1 Connection management

```
connections: Set<WebSocket>

onConnect(ws):
  connections.add(ws)
  send full state snapshot to this client only:
    { rooms, lobby, settings, logs }

onDisconnect(ws):
  connections.delete(ws)
```

### 10.2 Broadcast function

```
broadcast(event: WSEvent): void
  for each ws in connections:
    if ws.readyState == OPEN:
      ws.send(JSON.stringify(event))
```

### 10.3 Event payloads

```
ROOM_UPDATED:
  { roomId, room: Room }

LOBBY_UPDATED:
  { lobby: Patient[], count: number }

REBALANCE_SUGGEST:
  {
    patientId:   string,
    patientName: string,
    fromRoomId:  string,
    toRoomId:    string,
    reason:      string,   ← Gemini Vietnamese explanation
    aiUsed:      boolean,
    expiresIn:   number    ← countdown seconds (from settings or default 10)
  }

REBALANCE_APPLIED:
  { log: RebalanceLog }

EMERGENCY_ADDED:
  { patient: Patient }

PATIENT_COMPLETED:
  { patientId: string, patientName: string }

NOTIFICATION:
  {
    kind:    "info" | "warning" | "success" | "emergency",
    message: string,
    detail:  string | null
  }
```

---

## 11. Add Patient Flow

```
POST /api/patients/add called
          │
          ▼
Create Patient object:
  id              = generated UUID short
  name            = from request
  type            = from request
  status          = "LOBBY"
  checkedInAt     = now
  lobbySince      = now
  completedRooms  = []
  remainingRooms  = all room types from settings
                    (since all patients do all rooms)
  rebalancedToday = false
          │
          ▼
if type == "emergency":
  broadcast EMERGENCY_ADDED immediately (before any routing)
  play sound alert (client-side)
  flash banner (client-side)
          │
          ▼
Check: is there any active room (any room type) with queue < maxQueuePerRoom?
          │
      YES │                   NO
          ▼                   ▼
  Find best room:         Insert into lobby
    lowest load room          broadcast LOBBY_UPDATED
    across all active         return { patient, assignedRoomId: null }
    rooms with space
          │
          ▼
  insertToQueue(bestRoom, patient)
  patient.status = "WAITING"
  broadcast ROOM_UPDATED
  return { patient, assignedRoomId: bestRoom.id }
```

---

## 12. State Snapshot — example

```json
{
  "lobby": [
    {
      "id": "E001",
      "name": "Le Van C",
      "type": "emergency",
      "status": "LOBBY",
      "completedRooms": [],
      "remainingRooms": ["bmi", "blood_test", "radiology"],
      "lobbySince": "2026-05-15T09:33:00Z"
    }
  ],
  "rooms": {
    "blood-1": {
      "id": "blood-1",
      "name": "Blood Test Room 1",
      "roomType": "blood_test",
      "avgDurationMin": 12,
      "status": "active",
      "load": 48,
      "currentPatient": {
        "id": "V002",
        "name": "Tran Thi B",
        "type": "vip"
      },
      "consultStartAt": "2026-05-15T09:20:00Z",
      "queue": [
        { "id": "N005", "name": "Hoang Van E", "type": "normal", "queuePosition": 1 },
        { "id": "N006", "name": "Le Van F",    "type": "normal", "queuePosition": 2 },
        { "id": "N007", "name": "Ngo Van K",   "type": "normal", "queuePosition": 3 },
        { "id": "N008", "name": "Ly Thi L",    "type": "normal", "queuePosition": 4 }
      ]
    },
    "blood-2": {
      "id": "blood-2",
      "name": "Blood Test Room 2",
      "roomType": "blood_test",
      "avgDurationMin": 12,
      "status": "active",
      "load": 12,
      "currentPatient": {
        "id": "N009",
        "name": "Pham Van M",
        "type": "normal"
      },
      "queue": [
        { "id": "N013", "name": "Vo Thi N", "type": "normal", "queuePosition": 1 }
      ]
    },
    "blood-3": {
      "id": "blood-3",
      "name": "Blood Test Room 3",
      "roomType": "blood_test",
      "avgDurationMin": 12,
      "status": "idle",
      "load": 0,
      "currentPatient": null,
      "queue": []
    }
  },
  "logs": [
    {
      "id": "LOG001",
      "timestamp": "2026-05-15T09:30:00Z",
      "trigger": "done",
      "patientId": "N008",
      "fromRoomId": "blood-1",
      "toRoomId": "blood-3",
      "reason": "Ly Thi L waited longest and is last in queue — least disruptive to move.",
      "aiUsed": true
    }
  ]
}
```

---

## 13. Error Handling

| Scenario | Handling |
|---|---|
| Done called on room with no current patient | Return 400 — no-op |
| Done called on IDLE room | Return 400 — no-op |
| Patient not found | Return 404 |
| Gemini timeout (> 3s) | Use fallback, log `aiUsed: false` |
| Gemini returns invalid JSON | Use fallback |
| All rooms of a type are full | Patient stays in lobby, coordinator notified |
| Room closed (outside hours) | Skip room in routing, coordinator notified |
| WebSocket client disconnects | Remove from connections, no error |
| Settings save with active patients | Apply to new patients only, warn coordinator |

---

## 14. Summary — Request lifecycle

```
[Next.js] Staff clicks Done on Blood Test Room 1
    │
    │  POST /api/done/blood-1
    ▼
[Hono] routes/done.ts
    │  validates room exists and has current patient
    ▼
[Hono] engine/queue.ts
    │  Step 1: mark patient DONE, return to lobby
    │  Step 2: check room queue → empty
    │  Step 3A: check lobby → empty
    │  Step 3B: find overloaded same-type room → blood-1 has 4 waiting
    │           filter candidates → [Hoang E, Le F, Ngo K]
    │           candidates.length >= 2 → call Gemini
    ▼
[Hono] engine/gemini.ts
    │  build prompt with candidates + load context
    │  POST to Gemini API (3s timeout)
    │  parse response → { selected_id: "N005", reason: "..." }
    ▼
[Hono] engine/rebalance.ts
    │  if mode=auto: apply immediately
    │  if mode=suggest: broadcast REBALANCE_SUGGEST, wait for coordinator
    ▼
[Hono] ws/broadcast.ts
    │  broadcast ROOM_UPDATED (blood-1, blood-3)
    │  broadcast LOBBY_UPDATED
    │  broadcast REBALANCE_APPLIED or REBALANCE_SUGGEST
    ▼
[Next.js] WebSocket listener receives events
    │  React state updates
    │  Dashboard re-renders:
    │    - blood-1 queue loses 1 person
    │    - blood-3 shows new patient
    │    - Notification bar shows Gemini reason
    ▼
[Next.js] Patient's screen updates
    "You have been moved to Blood Test Room 3"
```

---

*Version: v1.0 — Backend & Queue Flow*
*Stack: Bun + Hono + TypeScript + Gemini API*