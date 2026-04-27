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
import { Network, BookOpen, Menu, Folder, Settings, HelpCircle } from 'lucide-react';
import AuthProfile from './auth-profile';

interface SimulatorHeaderProps {
  selectedNodesCount: number;
  loadPreset: (presetId: string | null) => void;
  handleLoadDesigns: (design: any) => void;
}

export default function SimulatorHeader({ selectedNodesCount, loadPreset, handleLoadDesigns }: SimulatorHeaderProps) {
  const [open, setOpen] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isDesignsOpen, setIsDesignsOpen] = React.useState(false);
  const [designs, setDesigns] = React.useState<any[]>([]);

  return (
    <div className="h-12 border-b bg-white flex items-center justify-between px-4 shrink-0 z-10 relative">

      {/* LEFT SECTION */}
      <div className="flex items-center gap-3">
        
        {/* Hamburger Menu Button (LEFT MOST) */}
        <button
          onClick={() => setIsMenuOpen(true)}
          className="w-8 h-8 rounded-md 
          bg-gray-200/50 border border-gray-200
          hover:bg-gray-200 hover:border-gray-400
          flex items-center justify-center 
          transition-all duration-200"
        >
          <Menu className="w-4 h-4 text-gray-700" />
        </button>

        {/* Selected Nodes Badge */}
        {selectedNodesCount > 0 && (
          <Badge variant="default" className="text-[10px] bg-blue-500">
            {selectedNodesCount} selected
          </Badge>
        )}
      </div>

      {/* CENTER (ABSOLUTE) */}
      {/* This stays perfectly centered regardless of left/right */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <Network className="w-5 h-5 text-gray-900" />
        <div className="group cursor-pointer px-2 py-1 rounded-lg hover:bg-purple-500/10 hover:border-purple-300 border border-transparent transition-colors">
          <h1 className="text-xl font-bold tracking-tight bg-linear-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-1">
            ArchScope
            <span className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-gray-500">
            </span>
          </h1>
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-3">

        {/* Get Started */}
        <Link href="/guide">
          <Button
            size="sm"
            // className="gap-2 
            // bg-teal-500/20 text-teal-800 border border-teal-200
            // hover:bg-teal-500/10 hover:border-teal-400
            // font-medium transition-all duration-200"
            className="bg-purple-500/20 text-purple-800 border border-purple-200 
            hover:bg-purple-500/10 hover:border-purple-400
            transition-all duration-200"
          >
            <BookOpen className="w-3 h-3" />
            Get Started
          </Button>
        </Link>

        {/* Profile */}
        <AuthProfile open={open} setOpen={setOpen} />
      </div>

      {/* SIDEBAR */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50">

          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* menu (LEFT anchored) */}
          <div className="absolute top-12 left-2 bg-white border rounded-md shadow-lg p-2 space-y-1 min-w-45 animate-in fade-in zoom-in-95">

            {/* SECTION 1 */}
            <div className="text-[10px] text-gray-400 px-2 py-1">GENERAL</div>

            <button
              onClick={async () => {
                setIsMenuOpen(false);
                setIsDesignsOpen(true);

                try {
                  const res = await fetch('/api/designs', {
                    headers: {
                      Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                  });

                  const data = await res.json();
                  setDesigns(data.designs || []);
                } catch (err) {
                  console.error(err);
                }
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-purple-500/10 hover:border-purple-300 border border-transparent text-sm transition-all"
            >
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-gray-600" />
                <span>My Designs</span>
              </div>
              <span className="text-[10px] text-gray-400">⌘D</span>
            </button>

            {/* divider */}
            <div className="h-px bg-gray-200 my-1" />

            {/* SECTION 2 */}
            <div className="text-[10px] text-gray-400 px-2 py-1">APP</div>

            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-purple-500/10 hover:border-purple-300 border border-transparent text-sm transition-all">
              <Settings className="w-4 h-4 text-gray-600" />
              <span>Settings</span>
            </button>

            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-purple-500/10 hover:border-purple-300 border border-transparent text-sm transition-all">
              <HelpCircle className="w-4 h-4 text-gray-600" />
              <span>Help</span>
            </button>

          </div>
        </div>
      )}
      {isDesignsOpen && (
        <div className="fixed inset-0 flex items-center justify-center">

          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setIsDesignsOpen(false)}
          />

          {/* modal */}
          <div className="relative bg-white rounded-xl shadow-2xl w-100 p-4">

            <h2 className="inline-block mb-3 px-3 py-1.5 rounded-md
bg-purple-500/20 text-purple-800 border border-purple-200
hover:bg-purple-500/30 hover:border-purple-400
font-medium text-sm transition-all duration-200">
              My Designs
            </h2>

            {designs.length === 0 ? (
              <p className="text-sm text-gray-400">No saved designs</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300">
                {designs.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      handleLoadDesigns(d); // we’ll adjust this next
                      setIsDesignsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md 
                    hover:bg-purple-500/10 hover:border-purple-300 
                    border border-transparent transition-all"
                  >
                    <div className="font-medium text-sm text-gray-800">
                      {d.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(d.createdAt).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
