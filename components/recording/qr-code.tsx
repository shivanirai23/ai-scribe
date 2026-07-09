"use client";

import { QRCodeSVG } from "qrcode.react";

interface QRCodeCardProps {
  patientId: string;
  visitId: string;
}

export function QRCodeCard({ patientId, visitId }: QRCodeCardProps) {
  const qrData = JSON.stringify({
    patientId,
    visitId,
  });

  return (
    <div className="w-full">
      <h2 className="text-brand-blue text-lg font-semibold">Companion App QR Code</h2>
      <p className="text-slate-600 text-sm mt-2">
        Scan this QR code with the companion app to connect your device for microphone access
      </p>

      <div className="flex justify-center my-6">
        <div className="bg-white p-4 rounded-lg">
          <QRCodeSVG value={qrData} size={200} level="H" />
        </div>
      </div>

      <p className="text-sm text-slate-500 text-center">
        This QR code contains your session information for the companion app
      </p>
    </div>
  );
}
