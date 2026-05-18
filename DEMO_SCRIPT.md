# Demo Script — Wellness Center Queue POC

**Audience:** Stakeholders / Clinic Managers
**Duration:** ~15 minutes
**Setup:** API + Frontend running, reset state before demo

---

## Opening (1 min)

> "Today staff manually monitor each room's queue and decide patient transfers based on experience alone. This POC automates that using AI — reducing wait times and staff workload."

---

## Scene 1 — System Overview (2 min)

**Do:**

1. Open dashboard → walk through layout: Lobby, 3 room types (BMI / Blood Test / Radiology), Notifications panel
2. Click **Reset** to start from a clean state

**Say:**

> "The dashboard updates in realtime via WebSocket. Each room shows a load indicator — green / yellow / red. The right panel is a live notification feed."

---

## Scene 2 — Patient Check-in (3 min)

**Do:**

1. Add 3 Normal patients (any name, reason: "routine check-up")
2. Add 1 VIP patient
3. Point out: VIP automatically moves ahead in the queue

**Say:**

> "Patients check in → the system assigns them to the right room automatically, prioritising by type: Emergency → VIP → Normal. No staff action needed."

---

## Scene 3 — Emergency Case (2 min)

**Do:**

1. Add 1 Emergency patient (reason: "Acute chest pain")
2. Point to the red notification appearing instantly
3. Show the patient jumping to the front of the room queue

**Say:**

> "An emergency is injected to the front of the queue immediately — no wait, no staff intervention. The alert appears in realtime across all screens."

---

## Scene 4 — AI Rebalancing: Suggest Mode (4 min)

**Setup:** Go to Settings → select **Suggest** mode

> Note: After Reset, seed data already places Blood Test Room 1 at HIGH load (4 patients queued). No need to add patients manually.

**Do:**

1. Point out Blood Test Room 1 — HIGH load, 4 patients queued
2. Click **✓ Done** on Blood Test Room 2
3. Notification appears: *"AI suggests moving [name]: Room 1 → Room 2"*
4. Point out: patient name, AI reason, **⏱ Save ~Xm**
5. Click **✓ Accept** → patient transfers, queues balance out

**Say:**

> "When one room is overloaded and another is free, the AI analyses who has waited longest, queue position, and medical urgency — then suggests a transfer. Staff see the reason and decide to Accept or skip. The estimated time saved is shown upfront."

---

## Scene 5 — AI Rebalancing: Auto Mode (2 min)

**Setup:** Go to Settings → switch to **Auto** mode

**Do:**

1. Click **✓ Done** on a HIGH load room
2. Watch: patient transfers automatically, green notification appears, no confirmation needed

**Say:**

> "Auto mode: the AI decides and acts immediately — ideal for peak hours when staff have no time to confirm each case."

---

## Scene 6 — Settings (1 min)

**Do:** Open Settings, briefly show:

- **Rebalance threshold** — minimum load gap to trigger a move
- **Max queue per room** — hard cap per room
- **Max rebalance per patient** — prevents moving one patient too many times
- **Assignment mode** — Auto vs Suggest
- **AI Decision Rules** — customisable checklist driving the AI

**Say:**

> "Clinic managers can tune these rules without touching code. For example: weight wait time vs medical urgency — just toggle the rules on or off."

---

## Closing (1 min)

**Say:**

> "This POC demonstrates three things:
>
> 1. **Realtime** — every change syncs instantly across all screens
> 2. **Explainable AI** — not a black box; staff understand why a patient was moved
> 3. **Configurable** — the clinic adjusts rules per shift or per day
>
> Next step: integrate with the live HIS/EMR and pilot in one clinic."

---

## Anticipated Q&A

| Question | Short answer |
| --- | --- |
| What if Gemini fails? | Automatic fallback: picks the longest-waiting patient — no downtime |
| Is data persisted? | POC uses in-memory storage; production will connect to a real DB |
| Do staff need training? | Suggest mode: Accept or Dismiss only. Auto mode: zero interaction |
| Can it support multiple branches? | Architecture allows it; needs a multi-tenant layer added |
