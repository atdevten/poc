# Wellness Center — Business Flow

---

## Overview

The system has three actors: the **Patient**, the **Staff / System**, and the **AI (Gemini)**. The AI is only involved in one moment — when the system detects a queue imbalance and needs to decide which patient to move.

---

## 1. Patient Journey

```
ARRIVE AT CLINIC
      │
      ▼
CHECK IN
  Patient provides name, reason for visit
  Selects priority: Normal / VIP / Emergency
      │
      ▼
ASSIGNED TO QUEUE
  ┌─────────────────────────────────────────┐
  │  Rooms available?                        │
  │                                         │
  │  YES → placed directly in room queue    │
  │  NO  → placed in Lobby to wait          │
  └─────────────────────────────────────────┘
      │
      ▼
WAIT TO BE CALLED
  Patient waits — no action needed
  System watches for an available slot
      │
      ├── If in Lobby > 15 min with no slot → NO-SHOW, removed
      │
      ▼
CALLED INTO ROOM
  Patient enters: BMI Check, Blood Test, or Radiology
      │
      ▼
CONSULTATION DONE
  Staff marks the room as complete
      │
      ▼
  ┌─────────────────────────────────────────┐
  │  More rooms to visit?                    │
  │                                         │
  │  YES → patient returns to Lobby          │
  │        waits for next room assignment   │
  │                                         │
  │  NO  → visit complete, patient exits    │
  └─────────────────────────────────────────┘
```

> At any point during waiting, the patient **may be transferred** to a less busy room.  
> This is invisible to them — they simply receive a notification on their phone.

---

## 2. Where AI Is Applied

The AI is involved in **one specific moment** only:

```
QUEUE IMBALANCE DETECTED
      │
      │  Triggered by:
      │  · Staff marks a room Done
      │  · Emergency patient checks in
      │  · Automatic scan every 60 seconds
      │  · Manual trigger
      │
      ▼
SYSTEM CHECKS LOAD GAP
  Compare queue load between rooms of the same type
  (e.g. Blood Test Room 1 vs Blood Test Room 3)
      │
      ├── Gap too small → do nothing
      │
      ▼
FILTER ELIGIBLE PATIENTS
  Only Normal priority patients
  Only those currently waiting (not being seen)
  Not the next-in-line (too disruptive)
  Not already moved today
      │
      ├── 0 candidates → do nothing
      ├── 1 candidate  → pick directly, no AI needed
      │
      ▼
 ╔══════════════════════════════════════════╗
 ║           AI CALLED (Gemini)             ║
 ╚══════════════════════════════════════════╝
      │
      ▼
AI RETURNS A DECISION
      │
      ▼
APPLY OR SUGGEST
  · Suggest mode → staff sees a card, clicks Accept or Decline
  · Auto mode    → patient is moved immediately
```

---

## 3. AI Input / Output

### Input — what Gemini receives

| Field | Description |
|---|---|
| Candidate list | Each eligible patient: name, how long they have waited, their position in the queue |
| Busy room | Name, current load (minutes of work queued) |
| Free room | Name, current load |
| Load gap | Difference between the two rooms |
| Threshold | Minimum gap required to justify a move |

**Example prompt sent to Gemini:**

```
Busy room:  Blood Test Room 1 — load 48 min
Free room:  Blood Test Room 3 — load 12 min
Gap:        36 min  (threshold: 20 min)

Candidates to consider:
  · Hoang Van E — waited 31 min — queue position 2
  · Le Van F    — waited 24 min — queue position 3
  · Ngo Van K   — waited 19 min — queue position 4

Who should be moved? Pick the fairest choice.
Explain in one sentence.
```

---

### Output — what Gemini returns

| Field | Description |
|---|---|
| Selected patient ID | Which patient to move |
| Reason | One plain-language sentence explaining the decision |
| aiUsed | true — confirms AI made the call |

**Example response from Gemini:**

```
Selected:  Hoang Van E
Reason:    "Hoang Van E has waited the longest and is not
            next in line — moving him causes the least
            disruption and is the fairest choice."
```

---

### Fallback — when AI is unavailable

If Gemini times out or returns an error, the system falls back automatically:

| Field | Value |
|---|---|
| Selected patient | Longest-waiting candidate |
| Reason | "Auto-selected longest-waiting patient" |
| aiUsed | false |

> The system never stops working because of an AI failure.

---

## 4. End-to-End Summary

| Phase | Patient does | Staff / System does | AI does |
|---|---|---|---|
| Arrival | Check in, select priority | Register, assign to queue | — |
| Waiting | Wait | Monitor queues, fill empty rooms | — |
| Consultation | Receive care | Mark room Done, call next patient | — |
| **Rebalancing** | **Receive notification, Accept or Decline** | **Detect imbalance, apply or suggest move** | **Rank candidates, explain decision** |
| Exit | Leave clinic | Remove from system | — |