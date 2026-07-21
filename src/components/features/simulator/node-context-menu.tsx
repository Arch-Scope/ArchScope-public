import React, { useEffect, useRef } from 'react';
import { Copy, Trash2, Files } from 'lucide-react';

interface NodeContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

export default function NodeContextMenu({
  x,
  y,
  onClose,
  onDuplicate,
  onCopy,
  onDelete,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Delay adding listener slightly to prevent immediate closing from the right-click event
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{ top: y, left: x, zIndex: 9999 }}
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48 text-sm"
    >
      <button
        onClick={() => {
          onDuplicate();
          onClose();
        }}
        className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center justify-between text-gray-700 hover:text-gray-950 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Files className="w-4 h-4 text-gray-500" />
          Duplicate
        </span>
        <span className="text-xs text-gray-400 font-mono">Ctrl+D</span>
      </button>

      <button
        onClick={() => {
          onCopy();
          onClose();
        }}
        className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center justify-between text-gray-700 hover:text-gray-950 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Copy className="w-4 h-4 text-gray-500" />
          Copy
        </span>
        <span className="text-xs text-gray-400 font-mono">Ctrl+C</span>
      </button>

      <div className="h-px bg-gray-100 my-1" />

      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full text-left px-3 py-2 hover:bg-red-50 hover:text-red-600 flex items-center justify-between text-gray-700 transition-colors"
      >
        <span className="flex items-center gap-2 text-red-600">
          <Trash2 className="w-4 h-4 text-red-500" />
          Delete
        </span>
        <span className="text-xs text-gray-400 font-mono">Del</span>
      </button>
    </div>
  );
}
