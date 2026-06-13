import React, { useState, useRef, useEffect } from 'react';
import { X, Terminal, Trash2 } from 'lucide-react';

interface TerminalPanelProps {
  onClose: () => void;
}

interface LogEntry {
  type: 'command' | 'response' | 'error';
  content: string;
}

export default function TerminalPanel({ onClose }: TerminalPanelProps) {
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([
    { type: 'response', content: 'ArchScope Query Language (AQL) Terminal v1.0.0' },
    { type: 'response', content: 'Type help for available commands' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldFocusInput, setShouldFocusInput] = useState(false);
  const endOfLogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    endOfLogRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Restore input focus when needed (single focus management strategy)
  useEffect(() => {
    if (shouldFocusInput && !isProcessing) {
      inputRef.current?.focus();
      setShouldFocusInput(false);
    }
  }, [shouldFocusInput, isProcessing]);

  const handleCommand = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      const rawCommand = input.trim();
      const normalizedCommand = rawCommand.toLowerCase();
      setInput('');
      setLogs((prev) => [...prev, { type: 'command', content: rawCommand }]);

      // Handle clear command locally (use normalized command for matching)
      if (normalizedCommand === 'clear') {
        setLogs([]);
        setShouldFocusInput(true);
        return;
      }

      setIsProcessing(true);

      try {
        const res = await fetch('/api/aql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: rawCommand }),
        });

        const data = await res.json();

        if (res.ok) {
          setLogs((prev) => [...prev, { type: 'response', content: data.message }]);
        } else {
          setLogs((prev) => [...prev, { type: 'error', content: data.error || 'Failed to execute command' }]);
        }
      } catch (error) {
        setLogs((prev) => [...prev, { type: 'error', content: 'Network error or server unreachable' }]);
      } finally {
        setIsProcessing(false);
        setShouldFocusInput(true);
      }
    }
  };

  return (
    <div className="h-72 w-full bg-white text-gray-800 flex flex-col font-mono text-sm border-t border-gray-200 shadow-2xl relative z-50 transition-all duration-300 ease-in-out">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-purple-600" />
          <span className="text-xs uppercase font-bold text-gray-600 tracking-widest select-none">AQL Terminal</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLogs([])}
            className="hover:text-gray-900 text-gray-500 transition-colors flex items-center gap-1 group"
            title="Clear Terminal"
          >
            <Trash2 size={14} className="group-hover:text-red-600 transition-colors" />
          </button>
          <div className="w-px h-4 bg-gray-300"></div>
          <button
            onClick={onClose}
            className="hover:text-gray-900 text-gray-500 transition-colors"
            title="Close Terminal"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5 custom-scrollbar">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2 whitespace-pre-wrap break-words">
            {log.type === 'command' && <span className="text-green-600 shrink-0">{'>'}</span>}
            <span className={
              log.type === 'error' ? 'text-red-600' :
              log.type === 'command' ? 'text-gray-900' : 'text-gray-600'
            }>
              {log.content}
            </span>
          </div>
        ))}

        {isProcessing && (
          <div className="text-gray-500 animate-pulse">Processing...</div>
        )}

        <div className="flex gap-2 items-center mt-1">
          <span className="text-green-600 shrink-0">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleCommand}
            disabled={isProcessing}
            className="flex-1 bg-transparent outline-none text-gray-900 disabled:opacity-50"
            autoFocus
            autoComplete="off"
            spellCheck="false"
          />
        </div>
        <div ref={endOfLogRef} />
      </div>
    </div>
  );
}
