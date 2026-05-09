'use client';

import { Button } from '@/components/ui/button';
import { Play, RotateCcw, Square } from 'lucide-react';

interface Props {
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
  isRunning: boolean;
}

export default function SimulationTopBar({
  onRun,
  onStop,
  onReset,
  isRunning,
}: Props) {
  return (
    <div className="h-12 border-b bg-white flex items-center px-4">
      <div className="flex gap-2 w-full">

        {!isRunning ? (
          <Button
            onClick={onRun}
           size="default"
            className="flex-1 gap-2 
            bg-green-500/20 text-green-800 border border-green-200
            hover:bg-green-500/10 hover:border-green-400
            transition-all duration-200"
          >
            <Play className="w-3 h-3" />
            Run Simulation
          </Button>
        ) : (
          <Button
            onClick={onStop}
           size="default"
            className="flex-1 gap-2 
            bg-red-500/20 text-red-800 border border-red-200
            hover:bg-red-500/10 hover:border-red-400
            transition-all duration-200"
          >
            <Square className="w-3 h-3" />
            Stop
          </Button>
        )}

        <Button
         size="default"
          onClick={onReset}
          className="gap-2 
          bg-yellow-500/20 text-yellow-500 border border-yellow-200
          hover:bg-yellow-500/10 hover:border-yellow-400
          transition-all duration-200"
        >
          <RotateCcw className="w-3 h-3" />
        </Button>

      </div>
    </div>
  );
}