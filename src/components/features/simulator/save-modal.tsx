'use client';

import { Button } from '@/components/ui/button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onSaveAsNew: () => void;
  hasExisting: boolean;
}

export default function SaveModal({
  isOpen,
  onClose,
  onUpdate,
  onSaveAsNew,
  hasExisting,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">

      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[320px] p-4 space-y-3">

        <h2 className="text-sm font-semibold text-gray-800">
          Save Design
        </h2>

        <div className="flex flex-col gap-2 mt-2">

          {hasExisting && (
            <Button
              onClick={onUpdate}
              className="bg-green-500/20 text-green-800 border border-green-200 
              hover:bg-green-500/30 hover:border-green-400"
            >
              Update Existing
            </Button>
          )}

          <Button
            onClick={onSaveAsNew}
            className="bg-blue-500/20 text-blue-800 border border-blue-200 
            hover:bg-blue-500/30 hover:border-blue-400"
          >
            Save As New
          </Button>

          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>

        </div>
      </div>
    </div>
  );
}