'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Network, BookOpen } from 'lucide-react';
import { PRESETS } from '@/data';
import AuthProfile from './auth-profile';

interface SimulatorHeaderProps {
  selectedNodesCount: number;
  loadPreset: (presetId: string | null) => void;
}

export default function SimulatorHeader({ selectedNodesCount, loadPreset }: SimulatorHeaderProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="h-12 border-b bg-white flex items-center justify-between px-4 flex-shrink-0 z-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-gray-900" />
          <div className="group cursor-pointer px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
            <h1 className="text-xl font-bold tracking-tight bg-linear-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-1">
              ArchScope
              <span className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-gray-500">
              </span>
            </h1>
          </div>
        </div>
        {selectedNodesCount > 0 && (
          <Badge variant="default" className="text-[10px] bg-blue-500">
            {selectedNodesCount} selected
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Select onValueChange={loadPreset}>
          <SelectTrigger className="h-8 text-xs w-50">
            <SelectValue placeholder="Load a preset..." />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-[10px] text-gray-400">{p.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Link href="/guide">
          <Button
            size="sm"
            className="gap-2 
            bg-teal-500/20 text-teal-800 border border-teal-200
            hover:bg-teal-500/10 hover:border-teal-400
            font-medium transition-all duration-200"
          >
            <BookOpen className="w-3 h-3" />
            Get Started
          </Button>
        </Link>

        <AuthProfile open={open} setOpen={setOpen} />
      </div>
    </div>
  );
}
