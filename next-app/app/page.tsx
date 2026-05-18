"use client"

import type { Patient } from "@/lib/mock-data"
import { useRealtimeState } from "@/hooks/useRealtimeState"
import { DashboardTopbar } from "@/components/dashboard/topbar"
import { WaitingLobby } from "@/components/dashboard/waiting-lobby"
import { RoomsZone } from "@/components/dashboard/rooms-zone"
import { NotificationBar } from "@/components/dashboard/notification-bar"

export default function DashboardPage() {
  const {
    roomGroups,
    lobbyPatients,
    notifications,
    pendingSuggestions,
    assignmentMode,
    isConnected,
    addPatient,
    markDone,
    dismissNotification,
    applyNotification,
    acceptSuggestion,
    declineSuggestion,
    resetData,
  } = useRealtimeState()

  async function handleAddPatient(patient: Patient) {
    await addPatient(patient.name, patient.type, patient.reason)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8FAFC]">
      <DashboardTopbar isConnected={isConnected} onReset={resetData} />
      <WaitingLobby patients={lobbyPatients} onAddPatient={handleAddPatient} />
      <div className="flex flex-1 overflow-hidden">
        <RoomsZone
          groups={roomGroups}
          onDone={markDone}
          assignmentMode={assignmentMode}
          pendingSuggestions={pendingSuggestions}
          onAcceptSuggestion={acceptSuggestion}
          onDeclineSuggestion={declineSuggestion}
        />
        <NotificationBar
          notifications={notifications}
          onDismiss={dismissNotification}
          onApply={applyNotification}
        />
      </div>
    </div>
  )
}
