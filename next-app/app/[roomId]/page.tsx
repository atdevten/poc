import { RoomQueueView } from "./room-queue-view"

export function generateStaticParams() {
  return [
    { roomId: "bmi_1" },
    { roomId: "bmi_2" },
    { roomId: "blood_test_1" },
    { roomId: "blood_test_2" },
    { roomId: "blood_test_3" },
    { roomId: "radiology_1" },
  ]
}

export default async function RoomQueuePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params
  return <RoomQueueView slug={roomId} />
}
