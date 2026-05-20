"use client";

import { Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ProcessingCompletionDialogProps {
  open: boolean;
  onClose: () => void;
  onViewReport: () => void;
}

export function ProcessingCompletionDialog({
  open,
  onClose,
  onViewReport,
}: ProcessingCompletionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-brandLight-green flex items-center justify-center">
              <Check className="h-8 w-8 text-brand-green" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Report Ready!</h2>
            <p className="text-slate-600 text-sm">
              Your visit notes and medical report have been generated successfully.
            </p>
            <button
              onClick={onViewReport}
              className="w-full bg-brand-green hover:bg-opacity-90 text-white rounded-xl h-12 font-medium"
            >
              View Report
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
