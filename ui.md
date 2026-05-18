# UI Specification — Wellness Center POC
## Screen 1: Settings | Screen 2: Room Dashboard

> UI spec — layout, components, states, interactions.
> Does not include business logic or API.

---

## Design System

### Colors

```
Primary background    #0F1117   (dark navy)
Surface               #1A1D27   (card background)
Surface elevated      #22263A   (hover/active)
Border                #2E3250   (subtle border)

Accent blue           #3B82F6   (actions, links)
Accent blue hover     #2563EB

Emergency red         #EF4444
Emergency bg          #2D1515
Emergency border      #7F1D1D

VIP gold              #F59E0B
VIP bg                #2D2508
VIP border            #78350F

Normal                #6B7280
Normal bg             #1A1D27
Normal border         #2E3250

Load LOW              #10B981   (green)
Load MEDIUM           #F59E0B   (amber)
Load HIGH             #EF4444   (red)
Load IDLE             #4B5563   (gray)

Text primary          #F9FAFB
Text secondary        #9CA3AF
Text muted            #4B5563
```

### Typography

```
Display font    "DM Mono" (monospace — medical/clinical feel)
Body font       "DM Sans"
Size scale:
  xs    11px
  sm    13px
  base  14px
  md    16px
  lg    18px
  xl    22px
  2xl   28px
```

### Spacing

```
xs     4px
sm     8px
md    12px
lg    16px
xl    24px
2xl   32px
3xl   48px
```

### Border radius

```
sm     4px   (badges, tags)
md     8px   (cards, inputs)
lg    12px   (modals, panels)
full  9999px (pills)
```

---

## SCREEN 1 — Settings

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  TOPBAR                                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐  │
│  │  LEFT PANEL          │  │  RIGHT PANEL                     │  │
│  │  Routing Rules       │  │  Room Journey                    │  │
│  │                      │  │                                  │  │
│  │  ─────────────────   │  │  ─────────────────               │  │
│  │  Priority Rules      │  │  Room Hours                      │  │
│  │                      │  │                                  │  │
│  │  ─────────────────   │  │  ─────────────────               │  │
│  │  No-show Handling    │  │                                  │  │
│  └──────────────────────┘  └──────────────────────────────────┘  │
│                                                                  │
│                              [Cancel]  [Save Settings]           │
└─────────────────────────────────────────────────────────────────┘
```

### Topbar

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚙  SETTINGS              Wellness Center POC    [← Dashboard]  │
└─────────────────────────────────────────────────────────────────┘

Height: 56px
Background: #0F1117
Border-bottom: 1px solid #2E3250
Items:
  Left:  icon + "SETTINGS" label (DM Mono, 13px, #9CA3AF uppercase)
  Center: "Wellness Center POC" (DM Sans, 14px, #F9FAFB)
  Right: "← Dashboard" button (text button, accent blue)
```

### Left Panel — Routing Rules

```
┌──────────────────────────────────────┐
│  ROUTING RULES                       │
│  ────────────────────────────────    │
│                                      │
│  Rebalance threshold                 │
│  ┌────────────────────────────────┐  │
│  │  [  20  ]  minutes             │  │
│  └────────────────────────────────┘  │
│  Trigger rebalance when load         │
│  difference exceeds this value       │
│                                      │
│  Max queue per room                  │
│  ┌────────────────────────────────┐  │
│  │  [   5  ]  patients            │  │
│  └────────────────────────────────┘  │
│                                      │
│  Assignment mode                     │
│  ┌──────────────┐ ┌──────────────┐  │
│  │ ● Auto-apply │ │ ○ Suggest    │  │
│  └──────────────┘ └──────────────┘  │
│  Auto: system moves patient          │
│  immediately. Suggest: coordinator   │
│  must confirm.                       │
│                                      │
│  ────────────────────────────────    │
│  PRIORITY RULES                      │
│                                      │
│  🚨 Emergency                        │
│     Skip to front of all queues      │
│     Sound alert    [●──────] ON      │
│     Banner alert   [●──────] ON      │
│                                      │
│  🥇 VIP                              │
│     Skip Normal patients             │
│     Allow rebalance  [○──────] OFF   │
│                                      │
│  👤 Normal                           │
│     FIFO order                       │
│     Allow rebalance  [●──────] ON    │
│                                      │
│  ────────────────────────────────    │
│  NO-SHOW HANDLING                    │
│                                      │
│  Auto mark NO_SHOW after             │
│  ┌────────────────────────────────┐  │
│  │  [  15  ]  minutes             │  │
│  └────────────────────────────────┘  │
│  Trigger queue logic after NO_SHOW   │
│  [●──────] ON                        │
└──────────────────────────────────────┘
```

**Input fields:**
```
Background:   #22263A
Border:       1px solid #2E3250
Border-focus: 1px solid #3B82F6
Border-radius: 8px
Padding:      10px 14px
Text:         #F9FAFB, DM Mono, 16px
Width:        80px (number inputs)
```

**Toggle switch:**
```
Track ON:    #3B82F6 (blue)
Track OFF:   #2E3250 (gray)
Knob:        #FFFFFF
Size:        36px × 20px
```

**Radio buttons (Assignment mode):**
```
Selected:   border #3B82F6, fill #3B82F6
Unselected: border #2E3250
Label:      DM Sans 14px #F9FAFB
Full width pill button, selected has bg #22263A
```

### Right Panel — Room Journey

```
┌──────────────────────────────────────┐
│  ROOM JOURNEY                        │
│  Drag to reorder                     │
│  ────────────────────────────────    │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ⠿  ①  🏃  BMI Check      [✎] │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ⠿  ②  🩸  Blood Test     [✎] │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ⠿  ③  🔬  Radiology      [✎] │  │
│  └────────────────────────────────┘  │
│                                      │
│  [+ Add Room Type]                   │
│                                      │
│  ────────────────────────────────    │
│  ROOM HOURS                          │
│                                      │
│  BMI Check                           │
│  ┌──────────────┐  ┌──────────────┐  │
│  │  08 : 00     │  │  17 : 00     │  │
│  └──────────────┘  └──────────────┘  │
│                                      │
│  Blood Test                          │
│  ┌──────────────┐  ┌──────────────┐  │
│  │  08 : 00     │  │  16 : 00     │  │
│  └──────────────┘  └──────────────┘  │
│                                      │
│  Radiology                           │
│  ┌──────────────┐  ┌──────────────┐  │
│  │  08 : 00     │  │  12 : 00     │  │
│  └──────────────┘  └──────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

**Room Journey card:**
```
Background:    #1A1D27
Border:        1px solid #2E3250
Border-radius: 8px
Padding:       12px 16px
Height:        48px
Layout:        flex row, items center

Elements:
  ⠿  drag handle icon  (#4B5563)
  ①  index badge       (DM Mono, 11px, bg #22263A, border #2E3250)
  🏃  emoji icon
  Room name            (DM Sans, 14px, #F9FAFB)
  [✎] edit button      (icon only, #4B5563, hover #9CA3AF)

Drag active state:
  Background: #22263A
  Border:     1px solid #3B82F6
  Shadow:     0 8px 24px rgba(0,0,0,0.4)
```

**[+ Add Room Type] button:**
```
Style:         dashed border button
Border:        1.5px dashed #2E3250
Border-radius: 8px
Color:         #9CA3AF
Hover:         border #3B82F6, color #3B82F6
Width:         100%
Height:        40px
```

### Bottom Action Bar

```
┌─────────────────────────────────────────────────────────────────┐
│                               [Cancel]    [Save Settings]        │
└─────────────────────────────────────────────────────────────────┘

Position: sticky bottom
Background: #0F1117
Border-top: 1px solid #2E3250
Padding: 12px 24px

Cancel button:
  Background: transparent
  Border: 1px solid #2E3250
  Color: #9CA3AF
  Hover: border #4B5563, color #F9FAFB

Save Settings button:
  Background: #3B82F6
  Color: #FFFFFF
  Hover: #2563EB
  Border-radius: 8px
  Padding: 10px 24px
  Font: DM Sans, 14px, medium
```

### Validation states

```
Error state (invalid input):
  Border: 1px solid #EF4444
  Below input: error message text (#EF4444, 12px)
  Example: "Threshold must be greater than 0"

Warning (room has active patients, being deleted):
  Modal confirmation:
  ┌──────────────────────────────────────┐
  │  ⚠  Remove Radiology?               │
  │                                      │
  │  3 patients are currently waiting    │
  │  in Radiology. Removing this room    │
  │  will move them back to the lobby.   │
  │                                      │
  │  [Cancel]          [Remove anyway]   │
  └──────────────────────────────────────┘
```

---

## SCREEN 2 — Room Dashboard

### Layout overview

```
┌─────────────────────────────────────────────────────────────────┐
│  TOPBAR                                                          │
├─────────────────────────────────────────────────────────────────┤
│  ZONE 1 — WAITING LOBBY                                          │
│  ─────────────────────────────────────────────────────────────  │
│  [card] [card] [card] [card] ...scroll horizontal               │
├─────────────────────────────────────────────────────────────────┤
│  ZONE 2 — ROOMS                                                  │
│                                                                  │
│  ┌── BMI ──────────┐  ┌── Blood Test ──────────────┐  ┌── ...  │
│  │ [room] [room]   │  │ [room] [room] [room]        │  │        │
│  └─────────────────┘  └────────────────────────────┘  └── ...  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ZONE 3 — NOTIFICATION BAR                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Topbar

```
┌─────────────────────────────────────────────────────────────────┐
│  🏥 WELLNESS CENTER      15/05/2026  09:35      [⚙ Settings]    │
│                          ● Live                                  │
└─────────────────────────────────────────────────────────────────┘

Height: 56px
Left:   logo icon + "WELLNESS CENTER" (DM Mono, 13px uppercase)
Center: date + time (DM Mono, 13px, #9CA3AF)
        ● Live indicator (green dot, pulsing animation)
Right:  [⚙ Settings] text button (accent blue)
```

### Zone 1 — Waiting Lobby

```
┌─────────────────────────────────────────────────────────────────┐
│  WAITING LOBBY   4 patients                  [+ Add Patient ▼]  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────  │
│  │ 🚨 EMERGENCY │  │ 🥇 VIP       │  │ 👤           │  │ 👤     │
│  │ Le Van C     │  │ Tran Thi B   │  │ Nguyen Van A │  │ Pham D │
│  │ #E001        │  │ #V002        │  │ #N003        │  │ #N004  │
│  │ ⏱ 2 min     │  │ ⏱ 5 min     │  │ ⏱ 8 min     │  │ ⏱ 12m │
│  │ ▣ ▣ ▣  0/3  │  │ ▣ ▣ ▣  1/3  │  │ ▣ ▣ ▣  0/3  │  │ 2/3   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────  │
└─────────────────────────────────────────────────────────────────┘

Zone header:
  Label: "WAITING LOBBY" (DM Mono, 11px, #9CA3AF uppercase)
  Count badge: "4 patients" (pill, bg #22263A, text #9CA3AF)
  Right: [+ Add Patient ▼] button

Scroll: horizontal scroll on patient cards
        Show right-fade gradient when cards overflow
```

**Patient card in Lobby:**

```
Emergency card:
┌──────────────────────┐
│ 🚨 EMERGENCY         │  ← type badge (bg #7F1D1D, text #FCA5A5)
│                      │
│ Le Van C             │  ← name (DM Sans 14px bold, #F9FAFB)
│ #E001                │  ← id (DM Mono 11px, #4B5563)
│                      │
│ ⏱ 2 min             │  ← wait time (DM Mono 12px, #9CA3AF)
│                      │
│ ▣▣▣  0 / 3 rooms    │  ← progress dots + text (12px, #4B5563)
└──────────────────────┘
Background:    #2D1515
Border:        1px solid #7F1D1D
Border-radius: 8px
Width:         160px
Height:        auto, min 130px
Padding:       12px

VIP card:
  Background: #2D2508
  Border:     1px solid #78350F
  Badge bg:   #78350F, text #FDE68A

Normal card:
  Background: #1A1D27
  Border:     1px solid #2E3250
  Badge:      not shown (just 👤 icon)

Progress dots:
  ▣ = completed room   (color: #10B981)
  ▢ = remaining room   (color: #2E3250)
  Size: 8px × 8px, gap 4px

Wait time color:
  < 10min:  #10B981  (green — acceptable)
  10-20min: #F59E0B  (amber — getting long)
  > 20min:  #EF4444  (red — too long)
```

**[+ Add Patient] dropdown:**

```
┌─────────────────────┐
│ 🚨 Emergency        │  ← text #EF4444
│ 🥇 VIP              │  ← text #F59E0B
│ 👤 Normal           │  ← text #F9FAFB
└─────────────────────┘

Background:    #22263A
Border:        1px solid #2E3250
Border-radius: 8px
Shadow:        0 8px 24px rgba(0,0,0,0.4)
Item height:   40px
Item hover:    background #2E3250
```

**Add Patient Modal:**

```
┌──────────────────────────────────────────┐
│  🚨 Add Emergency Patient          [✕]  │
│  ──────────────────────────────────────  │
│                                          │
│  Full name *                             │
│  ┌──────────────────────────────────┐    │
│  │  Nguyen Van A                    │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Patient ID / Phone *                    │
│  ┌──────────────────────────────────┐    │
│  │  #N001 / 0901234567              │    │
│  └──────────────────────────────────┘    │
│                                          │
│  Reason (optional)                       │
│  ┌──────────────────────────────────┐    │
│  │  Chest pain                      │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ──────────────────────────────────────  │
│  [Cancel]                [Add Patient]   │
└──────────────────────────────────────────┘

Modal overlay: rgba(0,0,0,0.6) backdrop
Modal bg:      #1A1D27
Border:        1px solid #2E3250
Border-radius: 12px
Width:         440px
Padding:       24px

Header border-bottom: 1px solid #2E3250
Emergency modal header bg: #2D1515

Add Patient button color by type:
  Emergency: #EF4444
  VIP:       #F59E0B
  Normal:    #3B82F6
```

---

### Zone 2 — Rooms

```
ROOM TYPE GROUP — Blood Test:
┌────────────────────────────────────────────────────────────┐
│  🩸 BLOOD TEST                              3 stations      │
│  ──────────────────────────────────────────────────────    │
│  ┌──────────────────┐ ┌──────────────────┐ ┌────────────┐  │
│  │ Room 1  🔴 HIGH  │ │ Room 2  🟡 MED   │ │ Room 3  ⬜ │  │
│  │ Load: 48 min     │ │ Load: 20 min     │ │ IDLE       │  │
│  │ ──────────────── │ │ ──────────────── │ │            │  │
│  │ ←IN              │ │ ←IN              │ │            │  │
│  │ 🥇 Tran Thi B    │ │ 👤 Pham Van M    │ │            │  │
│  │ 15 min ago       │ │ 4 min ago        │ │ Waiting    │  │
│  │                  │ │                  │ │ for next   │  │
│  │ QUEUE (4)        │ │ QUEUE (1)        │ │ patient    │  │
│  │ 1. 👤 Hoang E    │ │ 1. 👤 Vo Thi N   │ │            │  │
│  │ 2. 👤 Le Van F   │ │                  │ │            │  │
│  │ 3. 👤 Ngo Van K  │ │                  │ │            │  │
│  │ 4. 👤 Ly Thi L   │ │                  │ │            │  │
│  │                  │ │                  │ │            │  │
│  │   [✓  Done]      │ │   [✓  Done]      │ │            │  │
│  └──────────────────┘ └──────────────────┘ └────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**Room Type group header:**
```
Label:   emoji + name (DM Mono 12px uppercase, #9CA3AF)
Counter: "3 stations" (pill, small)
Padding: 16px 0 8px 0
Border-bottom: 1px solid #2E3250 (separates from cards)
```

**Room card:**
```
Background:    #1A1D27
Border:        1px solid #2E3250
Border-radius: 10px
Width:         220px
Min-height:    280px
Padding:       0  (sections have their own padding)

── Card Header ──────────────────────────────
  Background:    #22263A
  Border-bottom: 1px solid #2E3250
  Padding:       10px 14px
  Border-radius: 10px 10px 0 0

  Layout: flex, space-between
  Left:  "Room 1" (DM Mono 12px, #9CA3AF)
  Right: load badge

Load badge:
  HIGH:   bg #2D1515, text #EF4444, border #7F1D1D  "● HIGH"
  MEDIUM: bg #2D2508, text #F59E0B, border #78350F  "● MED"
  LOW:    bg #052E16, text #10B981, border #14532D  "● LOW"
  IDLE:   bg #1F2937, text #4B5563, border #374151  "⬜ IDLE"

── Load time ────────────────────────────────
  Padding: 6px 14px
  "Load: 48 min" (DM Mono 11px, color matches badge)

── IN CONSULTATION section ──────────────────
  Padding: 10px 14px
  Border-top: 1px solid #2E3250

  Label: "← IN" (DM Mono 10px, #4B5563 uppercase)

  Patient row:
    Badge icon (🥇 or 👤)
    Name (DM Sans 13px bold, #F9FAFB)
    Time: "15 min ago" (DM Mono 11px, #4B5563)

  If no current patient (IDLE):
    "Waiting for next patient"
    Color: #4B5563
    Font-style: italic

── QUEUE section ────────────────────────────
  Padding: 10px 14px
  Border-top: 1px solid #2E3250

  Label: "QUEUE (4)" (DM Mono 10px, #4B5563 uppercase)

  Patient row:
    Height: 28px
    Index:  "1." (DM Mono 11px, #4B5563)
    Badge:  type icon (12px)
    Name:   (DM Sans 13px, #9CA3AF)

  Max visible rows: 5
  If more than 5: show "+N more" (muted)

  Empty queue:
    "No patients waiting" (italic, #4B5563)

── Done button ──────────────────────────────
  Position: bottom of card
  Padding: 10px 14px
  Border-top: 1px solid #2E3250

  Button (full width):
    Background:    #052E16
    Border:        1px solid #14532D
    Color:         #10B981
    Border-radius: 6px
    Height:        36px
    Label:         "✓  Done"
    Font:          DM Mono 13px

  Button — hover:
    Background: #10B981
    Color:      #FFFFFF

  Button — disabled (processing):
    Background: #1F2937
    Color:      #4B5563
    Label:      "Processing..."
    Cursor:     not-allowed

  Button — hidden when IDLE:
    Room has no current patient → button not shown
```

**Room card — HIGH load visual treatment:**
```
When load = HIGH:
  Card border: 1px solid #7F1D1D  (red tint)
  Subtle red glow: box-shadow 0 0 0 1px #2D1515
  Load section background: #2D1515
```

**Room card — IDLE state:**
```
Background:  #0F1117  (darker, recessed feel)
Border:      1px dashed #2E3250
Opacity:     0.7
Content:     centered "⬜ IDLE\nWaiting for next patient"
Done button: hidden
```

---

### Zone 3 — Notification Bar

```
┌─────────────────────────────────────────────────────────────────┐
│  NOTIFICATIONS                                                   │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ⚡ [09:34]  AI suggests moving Hoang Van E → Blood Test Room 2  │
│             "Hoang Van E waited longest (22 min), position      │
│              3/4 — least disruptive to move."                   │
│                         [✓ Apply]  [✗ Dismiss]   ⏱ 8s          │
│                                                                  │
│  🚨 [09:33]  Emergency added: Le Van C — all rooms notified     │
│                                                                  │
│  ↔  [09:30]  Auto-moved: Ly Thi L → Blood Test Room 3          │
│              Room 1: 60min → 48min                              │
│                                                                  │
│  ✅ [09:10]  Completed: Nguyen Van A — all 3 rooms done         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Zone header:
  "NOTIFICATIONS" (DM Mono 11px, #9CA3AF uppercase)
  Max height: 220px
  Overflow: scroll (newest on top)
  Border-top: 1px solid #2E3250
```

**Notification row types:**

```
── AI SUGGESTION ────────────────────────────────────────────────

┌───────────────────────────────────────────────────────────────┐
│  ⚡  [09:34]  AI suggests moving Hoang Van E                  │
│              → Blood Test Room 2                              │
│                                                               │
│              "Hoang E waited longest (22 min), position      │
│               3/4 — least disruptive to move."               │
│                                                               │
│              [✓ Apply]   [✗ Dismiss]    ⏱ 8s               │
└───────────────────────────────────────────────────────────────┘

Background:     #1A2744  (blue tint)
Border-left:    3px solid #3B82F6
Border-radius:  0 8px 8px 0
Padding:        12px 16px

Icon ⚡:        #3B82F6
Timestamp:      DM Mono 11px #4B5563
Patient name:   DM Sans 13px bold #F9FAFB
AI reason:      DM Sans 13px italic #9CA3AF
                (Gemini's Vietnamese explanation)

Apply button:
  Background: #052E16, border #14532D, color #10B981
  Hover:      background #10B981, color #FFFFFF

Dismiss button:
  Background: transparent, border #2E3250, color #4B5563
  Hover:      border #EF4444, color #EF4444

Countdown:
  "⏱ 8s" → counts down to 0
  Color changes: green → amber → red as time runs out
  At 0: auto-apply (if mode=Auto) or auto-dismiss (if mode=Suggest)

── EMERGENCY ALERT ──────────────────────────────────────────────

┌───────────────────────────────────────────────────────────────┐
│  🚨  [09:33]  Emergency added: Le Van C                       │
│               All rooms notified                              │
└───────────────────────────────────────────────────────────────┘

Background:     #2D1515
Border-left:    3px solid #EF4444
Color:          #FCA5A5
Persists:       does not auto-dismiss

── AUTO REBALANCE ───────────────────────────────────────────────

┌───────────────────────────────────────────────────────────────┐
│  ↔  [09:30]  Auto-moved: Ly Thi L → Blood Test Room 3        │
│              Room 1 load: 60min → 48min                       │
└───────────────────────────────────────────────────────────────┘

Background:     #1A1D27
Border-left:    3px solid #F59E0B
Color:          #9CA3AF
Auto-dismiss:   after 30s

── JOURNEY COMPLETE ─────────────────────────────────────────────

┌───────────────────────────────────────────────────────────────┐
│  ✅  [09:10]  Completed: Nguyen Van A — all 3 rooms done      │
└───────────────────────────────────────────────────────────────┘

Background:     #052E16
Border-left:    3px solid #10B981
Color:          #6EE7B7
Auto-dismiss:   after 15s
```

---

### Emergency flash — full dashboard alert

```
When Emergency patient is added:

  Overlay flash animation:
    Red border pulses on entire viewport (2 cycles)
    Duration: 1.5s
    border: 2px solid #EF4444 on body
    animation: pulse 0.75s ease-in-out × 2

  Notification bar:
    Emergency row appears at top with slide-in animation

  All room cards:
    Brief red border flash (0.5s) to indicate "all rooms notified"
```

---

### Responsive breakpoints

```
≥ 1440px:  All room types visible, side by side
1280–1439: Room type groups wrap to 2 rows if needed
1024–1279: Lobby scrolls horizontally, rooms stack vertically
< 1024px:  Not supported for POC (coordinator uses desktop/tablet)
```

---

### Micro-interactions

```
Done button clicked:
  1. Button → "Processing..." (disabled state)
  2. Room card briefly fades (opacity 0.6)
  3. IN CONSULTATION section updates with new patient (slide-in)
  4. QUEUE list updates (removed patient slides out)
  5. Load badge recalculates and updates color
  6. Button re-enables

Patient moved (rebalance):
  Source room: patient card slides out with translateX(-20px) + fade
  Destination room: patient card slides in from right
  Notification bar: new row slides in from bottom

Emergency added:
  Lobby: Emergency card slides in at position 0 (pushes others right)
  Flash animation on viewport border
  All room card borders flash red briefly

New patient in lobby:
  Card slides in from right end of lobby
  Lobby count badge increments with pop animation
```

---

*Version: v1.0 — UI Specification only*
*Screen 1: Settings | Screen 2: Room Dashboard*
*Stack: Next.js (React) + Tailwind CSS*