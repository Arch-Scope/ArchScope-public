'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[320px]">
        <DialogHeader>
          <DialogTitle>Save Design</DialogTitle>
          <DialogDescription>Choose how to save this design.</DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
