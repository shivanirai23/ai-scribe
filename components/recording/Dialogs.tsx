"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";

interface QRCodeDialogProps {
  open: boolean;
  onClose: () => void;
  visitId: string | null;
}

export function QRCodeDialog({ open, onClose, visitId }: QRCodeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md p-6"
        hiddenTitle="QR code"
        hiddenDescription="Scan this code to connect the iOS app"
      >
        <div className="flex flex-col items-center gap-4">
          <h3 className="text-lg font-semibold text-slate-700">Scan to connect iOS app</h3>
          <div className="w-48 h-48 border border-slate-200 rounded-xl flex items-center justify-center bg-white">
            {/* Placeholder QR code grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: 49 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-sm ${
                    [0, 1, 2, 3, 4, 5, 6, 7, 13, 14, 20, 21, 27, 28, 34, 35, 41, 42, 43, 44, 45, 46, 47, 48, 15, 17, 19, 23, 25, 29, 31, 33].includes(i)
                      ? "bg-slate-800"
                      : "bg-white"
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center max-w-xs">
            Scan this QR code with the HIKIGAI AIScribe iOS app to sync your recording session
          </p>
          {visitId && (
            <p className="text-xs text-slate-400">Visit ID: {visitId}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ModeWarningDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ModeWarningDialog({ open, onClose }: ModeWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-md p-6"
        showClose={false}
        hiddenTitle="Cannot switch mode"
        hiddenDescription="Explains why mode switching is disabled during an active conversational visit"
      >
        <h2 className="text-slate-700 text-lg font-medium">Cannot Switch to Normal Mode</h2>
        <div className="py-4">
          <p className="text-slate-600 text-sm">
            You have started the conversational mode questionnaire. You can only switch back to
            Normal Mode after ending this visit.
          </p>
          <p className="text-slate-600 text-sm mt-3">
            To switch modes, please click the &quot;End Visit&quot; button in the header and start a new visit.
          </p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-brand-blue hover:bg-brand-pink text-white rounded-md px-4 py-2 text-sm transition-colors"
          >
            Got it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
