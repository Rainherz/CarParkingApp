import React from "react";
import PlateDetector from "../PlateDetector";
import TicketPreview from "../TicketPreview";

export default function OperatorModals({
  showPlateDetector,
  setShowPlateDetector,
  showTicketPreview,
  setShowTicketPreview,
  vehicleForTicket,
  onTicketGenerated,
  handlePlateDetectorSuccess,
  currentUser,
}: {
  showPlateDetector: boolean;
  setShowPlateDetector: (v: boolean) => void;
  showTicketPreview: boolean;
  setShowTicketPreview: (v: boolean) => void;
  vehicleForTicket: any;
  onTicketGenerated: (success: boolean) => void;
  handlePlateDetectorSuccess: (plate: string) => void;
  currentUser?: { id: number; username: string; name: string; role: string };
}) {
  return (
    <>
      <PlateDetector
        visible={showPlateDetector}
        onClose={() => setShowPlateDetector(false)}
        onSuccess={handlePlateDetectorSuccess}
        currentUser={currentUser}
      />
      <TicketPreview
        visible={showTicketPreview}
        vehicleData={vehicleForTicket}
        onClose={() => setShowTicketPreview(false)}
        onTicketGenerated={onTicketGenerated}
      />
    </>
  );
}