'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { PRESETS } from '@/data';
import { Button } from '@/components/ui/button';

interface Props {
  loadPreset: (id: string | null) => void;
  onSave: () => void;
  onReset: () => void;
  selectedDesignName: string | null;
}

export default function CanvasTopBar({ loadPreset, onSave, onReset, selectedDesignName }: Props) {
  return (
    <div className="h-12 border-b bg-white flex items-center justify-between px-4">

    {/* LEFT — PRESETS */}
    <div className="flex items-center gap-2">

      <Select onValueChange={loadPreset}>
        <SelectTrigger
          className="h-8 px-3
          bg-cyan-500/10 text-cyan-700 border border-cyan-200
          hover:bg-cyan-500/20 hover:border-cyan-400
          font-medium transition-all duration-200"
        >
          <span>Presets</span>
        </SelectTrigger>

        <SelectContent
          side="bottom"
          align="start"
          sideOffset={8}
          alignItemWithTrigger={false}
          className="
          w-(--radix-select-trigger-width)
          max-h-35
          overflow-y-auto
          bg-white border border-indigo-100 shadow-xl rounded-lg p-1"
        >
          {PRESETS.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <div className="flex flex-col leading-tight">
                <span className="font-medium text-gray-800 text-xs">
                  {p.name}
                </span>
                <span className="text-[10px] text-gray-400 truncate">
                  {p.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedDesignName && (
        <span className="
          h-8 px-3 text-[13.5px] rounded-md
          bg-cyan-500/10 text-cyan-700 border border-cyan-200
          hover:bg-cyan-500/20 hover:border-cyan-400
          inline-flex items-center transition-all duration-200
        ">
          {selectedDesignName}
        </span>
      )}
    </div>

    {/* RIGHT — ACTIONS */}
    <div className="flex items-center gap-2">

        <Button
        size="default"
        onClick={onSave}
        className="bg-green-500/20 text-green-700 border border-green-200 
        hover:bg-green-500/30 hover:border-green-400
        font-medium transition-all duration-200"
        >
        Save
        </Button>

        <Button
        size="default"
        onClick={onReset}
        className="bg-yellow-500/20 text-yellow-800 border border-yellow-200 
        hover:bg-yellow-500/30 hover:border-yellow-400
        font-medium transition-all duration-200"
        >
        Clear {/* changed reset button name */}
        </Button>

    </div>

    </div>
  );
}