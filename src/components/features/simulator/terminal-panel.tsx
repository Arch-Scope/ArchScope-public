import React, { useState, useRef, useEffect } from 'react';
import { X, Terminal, Trash2 } from 'lucide-react';

interface TerminalPanelProps {
  onClose: () => void;
  onAddComponent?: (type: string, nodeId?: string, serviceId?: string, label?: string) => void;
  onRemoveNode?: (label: string) => void;
  onConnectNodes?: (sourceLabel: string, targetLabel: string, animated?: boolean) => void;
  onDisconnectNodes?: (sourceLabel: string, targetLabel: string) => void;
  onRenameNode?: (oldLabel: string, newLabel: string) => void;
  onShowNodes?: () => { label: string; type: string }[];
  onShowConnections?: () => { source: string; target: string; animated: boolean }[];
}

interface LogEntry {
  type: 'command' | 'response' | 'error';
  content: string;
}

export default function TerminalPanel({ onClose, onAddComponent, onRemoveNode, onConnectNodes, onDisconnectNodes, onRenameNode, onShowNodes, onShowConnections }: TerminalPanelProps) {
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([
    { type: 'response', content: 'ArchScope Query Language (AQL) Terminal v1.0.0' },
    { type: 'response', content: 'Type help for available commands' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldFocusInput, setShouldFocusInput] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle ArrowUp - navigate back in history
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      
      const newIndex = historyIndex === -1 ? commandHistory.length - 1 : historyIndex - 1;
      if (newIndex >= 0) {
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    }
    
    // Handle ArrowDown - navigate forward in history
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      
      const newIndex = historyIndex + 1;
      if (newIndex < commandHistory.length) {
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      } else {
        // Reached the end, clear input
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  const handleCommand = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      const rawCommand = input.trim();
      const normalizedCommand = rawCommand.toLowerCase();
      const parts = rawCommand.split(/\s+/);
      
      // Add command to history (avoid duplicates)
      if (rawCommand !== commandHistory[commandHistory.length - 1]) {
        setCommandHistory((prev) => [...prev, rawCommand]);
      }
      setHistoryIndex(-1);
      
      setInput('');
      setLogs((prev) => [...prev, { type: 'command', content: rawCommand }]);

      // Handle clear command locally
      if (normalizedCommand === 'clear') {
        setLogs([]);
        setShouldFocusInput(true);
        return;
      }

      // Handle help command locally
      if (normalizedCommand === 'help') {
        setLogs((prev) => [...prev, { type: 'response', content: 'Available commands:' }]);
        setLogs((prev) => [...prev, { type: 'response', content: '  add <type> as <name>' }]);
        setLogs((prev) => [...prev, { type: 'response', content: '  remove <name>' }]);
        setLogs((prev) => [...prev, { type: 'response', content: '  connect <source> to <target> [animated]' }]);
        setLogs((prev) => [...prev, { type: 'response', content: '  disconnect <source> from <target>' }]);
        setLogs((prev) => [...prev, { type: 'response', content: '  rename <name> to <new_name>' }]);
        setLogs((prev) => [...prev, { type: 'response', content: '  show_nodes - List all nodes' }]);
        setLogs((prev) => [...prev, { type: 'response', content: '  show_connections - List all connections' }]);
        setLogs((prev) => [...prev, { type: 'response', content: '  clear - Clear terminal' }]);
        setLogs((prev) => [...prev, { type: 'response', content: '  help - Show this help' }]);
        setShouldFocusInput(true);
        return;
      }

      // Handle show_nodes command locally
      if (normalizedCommand === 'show_nodes') {
        if (onShowNodes) {
          const nodes = onShowNodes();
          if (nodes.length === 0) {
            setLogs((prev) => [...prev, { type: 'response', content: 'No nodes in the architecture' }]);
          } else {
            setLogs((prev) => [...prev, { type: 'response', content: 'Nodes in architecture:' }]);
            nodes.forEach((node) => {
              setLogs((prev) => [...prev, { type: 'response', content: `  ${node.label} (${node.type})` }]);
            });
          }
        } else {
          setLogs((prev) => [...prev, { type: 'error', content: 'Error: Unable to list nodes' }]);
        }
        setShouldFocusInput(true);
        return;
      }

      // Handle show_connections command locally
      if (normalizedCommand === 'show_connections') {
        if (onShowConnections) {
          const connections = onShowConnections();
          if (connections.length === 0) {
            setLogs((prev) => [...prev, { type: 'response', content: 'No connections in the architecture' }]);
          } else {
            setLogs((prev) => [...prev, { type: 'response', content: 'Connections in architecture:' }]);
            connections.forEach((conn) => {
              setLogs((prev) => [...prev, { type: 'response', content: `  ${conn.source} -> ${conn.target}${conn.animated ? ' (animated)' : ''}` }]);
            });
          }
        } else {
          setLogs((prev) => [...prev, { type: 'error', content: 'Error: Unable to list connections' }]);
        }
        setShouldFocusInput(true);
        return;
      }

      const command = parts[0].toLowerCase();
      const hasHelpFlag = parts.includes('--help') || parts.includes('-h');

      // Handle --help flag for commands
      if (hasHelpFlag) {
        if (command === 'add') {
          setLogs((prev) => [...prev, { type: 'response', content: 'Available component types:' }]);
          setLogs((prev) => [...prev, { type: 'response', content: '  client - Represents end users or external clients' }]);
          setLogs((prev) => [...prev, { type: 'response', content: '  load_balancer - Distributes traffic across multiple instances' }]);
          setLogs((prev) => [...prev, { type: 'response', content: '  api_server - Handles API requests and business logic' }]);
          setLogs((prev) => [...prev, { type: 'response', content: '  cache - Stores frequently accessed data for faster retrieval' }]);
          setLogs((prev) => [...prev, { type: 'response', content: '  database - Stores and manages persistent data' }]);
          setLogs((prev) => [...prev, { type: 'response', content: '  message_queue - Asynchronous message processing system' }]);
          setLogs((prev) => [...prev, { type: 'response', content: '  worker - Background job processor' }]);
          setLogs((prev) => [...prev, { type: 'response', content: '  notification_service - Sends notifications (push, email, etc.)' }]);
          setLogs((prev) => [...prev, { type: 'response', content: '  rate_limiter - Controls request rate to protect downstream services' }]);
          setLogs((prev) => [...prev, { type: 'response', content: '' }]);
          setLogs((prev) => [...prev, { type: 'response', content: 'Usage: add <component_type> as <name>' }]);
        } else if (command === 'remove') {
          setLogs((prev) => [...prev, { type: 'response', content: 'Removes a node and all its connected edges from the architecture.' }]);
          setLogs((prev) => [...prev, { type: 'response', content: 'Usage: remove <name>' }]);
          setLogs((prev) => [...prev, { type: 'response', content: 'Example: remove api1' }]);
        } else if (command === 'connect') {
          setLogs((prev) => [...prev, { type: 'response', content: 'Creates a directed edge from one node to another.' }]);
          setLogs((prev) => [...prev, { type: 'response', content: 'Usage: connect <source> to <target> [animated]' }]);
          setLogs((prev) => [...prev, { type: 'response', content: 'Example: connect api1 to db animated' }]);
        } else if (command === 'disconnect') {
          setLogs((prev) => [...prev, { type: 'response', content: 'Removes the edge between two nodes.' }]);
          setLogs((prev) => [...prev, { type: 'response', content: 'Usage: disconnect <source> from <target>' }]);
          setLogs((prev) => [...prev, { type: 'response', content: 'Example: disconnect api1 from db' }]);
        } else if (command === 'rename') {
          setLogs((prev) => [...prev, { type: 'response', content: 'Changes the display label of a node.' }]);
          setLogs((prev) => [...prev, { type: 'response', content: 'Usage: rename <name> to <new_name>' }]);
          setLogs((prev) => [...prev, { type: 'response', content: 'Example: rename api1 to auth_api' }]);
        } else {
          setLogs((prev) => [...prev, { type: 'response', content: `Unknown command: ${command}` }]);
          setLogs((prev) => [...prev, { type: 'response', content: 'Type "help" for available commands' }]);
        }
        setShouldFocusInput(true);
        return;
      }

      // add <component_type> as <name>
      if (command === 'add') {
        const componentType = parts[1];
        if (!componentType) {
          setLogs((prev) => [...prev, { type: 'error', content: 'Error: component_type is required for add command' }]);
          setShouldFocusInput(true);
          return;
        }

        const asIndex = parts.findIndex(p => p.toLowerCase() === 'as');
        const name = asIndex !== -1 ? parts[asIndex + 1] : undefined;

        if (!name) {
          setLogs((prev) => [...prev, { type: 'error', content: 'Error: name is required for add command' }]);
          setShouldFocusInput(true);
          return;
        }

        if (onAddComponent) {
          onAddComponent(componentType, undefined, undefined, name);
          setLogs((prev) => [...prev, { type: 'response', content: `Added ${componentType} as ${name}` }]);
        } else {
          setLogs((prev) => [...prev, { type: 'error', content: 'Error: Architecture commands not available' }]);
        }
        setShouldFocusInput(true);
        return;
      }

      // remove <name>
      if (command === 'remove') {
        const name = parts[1];
        if (!name) {
          setLogs((prev) => [...prev, { type: 'error', content: 'Error: name is required for remove command' }]);
          setShouldFocusInput(true);
          return;
        }

        if (onRemoveNode) {
          onRemoveNode(name);
          setLogs((prev) => [...prev, { type: 'response', content: `Removed ${name}` }]);
        } else {
          setLogs((prev) => [...prev, { type: 'error', content: 'Error: Architecture commands not available' }]);
        }
        setShouldFocusInput(true);
        return;
      }

      // connect <source> to <target> [animated]
      if (command === 'connect') {
        const source = parts[1];
        const targetIndex = parts.findIndex(p => p.toLowerCase() === 'to');
        const target = targetIndex !== -1 ? parts[targetIndex + 1] : undefined;
        const animatedIndex = parts.findIndex(p => p.toLowerCase() === 'animated');

        if (!source || !target) {
          setLogs((prev) => [...prev, { type: 'error', content: 'Error: source and target are required for connect command' }]);
          setShouldFocusInput(true);
          return;
        }

        const animated = animatedIndex !== -1;

        if (onConnectNodes) {
          onConnectNodes(source, target, animated);
          setLogs((prev) => [...prev, { type: 'response', content: `Connected ${source} to ${target}${animated ? ' (animated)' : ''}` }]);
        } else {
          setLogs((prev) => [...prev, { type: 'error', content: 'Error: Architecture commands not available' }]);
        }
        setShouldFocusInput(true);
        return;
      }

      // disconnect <source> from <target>
      if (command === 'disconnect') {
        const source = parts[1];
        const targetIndex = parts.findIndex(p => p.toLowerCase() === 'from');
        const target = targetIndex !== -1 ? parts[targetIndex + 1] : undefined;

        if (!source || !target) {
          setLogs((prev) => [...prev, { type: 'error', content: 'Error: source and target are required for disconnect command' }]);
          setShouldFocusInput(true);
          return;
        }

        if (onDisconnectNodes) {
          onDisconnectNodes(source, target);
          setLogs((prev) => [...prev, { type: 'response', content: `Disconnected ${source} from ${target}` }]);
        } else {
          setLogs((prev) => [...prev, { type: 'error', content: 'Error: Architecture commands not available' }]);
        }
        setShouldFocusInput(true);
        return;
      }

      // rename <name> to <new_name>
      if (command === 'rename') {
        const oldName = parts[1];
        const targetIndex = parts.findIndex(p => p.toLowerCase() === 'to');
        const newName = targetIndex !== -1 ? parts[targetIndex + 1] : undefined;

        if (!oldName || !newName) {
          setLogs((prev) => [...prev, { type: 'error', content: 'Error: old name and new name are required for rename command' }]);
          setShouldFocusInput(true);
          return;
        }

        if (onRenameNode) {
          onRenameNode(oldName, newName);
          setLogs((prev) => [...prev, { type: 'response', content: `Renamed ${oldName} to ${newName}` }]);
        } else {
          setLogs((prev) => [...prev, { type: 'error', content: 'Error: Architecture commands not available' }]);
        }
        setShouldFocusInput(true);
        return;
      }

      // For other commands, send to API
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
            onKeyDown={(e) => {
              handleKeyDown(e);
              handleCommand(e);
            }}
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
