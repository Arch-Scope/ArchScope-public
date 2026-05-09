'use client';

import React from 'react';
import {
  Server,
  Database,
  Layers,
  MonitorPlay,
  Bell,
  Cpu,
  Network,
  MailCheck,
  ShieldAlert,
} from 'lucide-react';
import { ComponentType } from '@/types';
import { COMPONENT_COLORS, COMPONENT_LABELS } from '@/lib/services';
import { ScrollArea } from '@/components/ui/scroll-area';

const ICONS: Record<ComponentType, React.ElementType> = {
  client: MonitorPlay,
  load_balancer: Network,
  api_server: Server,
  cache: Layers,
  database: Database,
  message_queue: MailCheck,
  worker: Cpu,
  notification_service: Bell,
  rate_limiter: ShieldAlert,
};

const COMPONENT_TYPES: ComponentType[] = [
  'client',
  'load_balancer',
  'rate_limiter',
  'api_server',
  'cache',
  'database',
  'message_queue',
  'worker',
  'notification_service',
];

interface ComponentPaletteProps {
  onAddComponent: (type: ComponentType) => void;
}

export default function ComponentPalette({ onAddComponent }: ComponentPaletteProps) {
  const onDragStart = (event: React.DragEvent, type: ComponentType) => {
    event.dataTransfer.setData('application/reactflow-type', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      <div className="flex items-center gap-2 px-1">
        <div className="w-0.5 h-5 rounded-full bg-linear-to-b from-teal-500 to-cyan-500" />

        <h3 className="text-base font-semibold bg-linear-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
          Components
        </h3>
      </div>
      <ScrollArea className="flex-1 px-4 pb-4">
        <div className="grid grid-cols-2 gap-4 pb-2 pt-1">
          {COMPONENT_TYPES.map((type) => {
            const Icon = ICONS[type];
            const color = COMPONENT_COLORS[type];
            return (
              <button
                key={type}
                // className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 bg-white
                // hover:bg-gray-50 hover:border-blue-400
                // transition-all duration-200 ease-out
                // cursor-grab active:cursor-grabbing
                // shadow-sm hover:shadow-md"
                className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-200 bg-white
                hover:bg-gray-50 hover:border-blue-400
                transition-colors duration-200
                cursor-grab active:cursor-grabbing
                shadow-sm hover:shadow-md"
                draggable
                onDragStart={(e) => onDragStart(e, type)}
                onClick={() => onAddComponent(type)}
                title={`Add ${COMPONENT_LABELS[type]}`}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-110"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <Icon className="w-4 h-4 transition-colors duration-200" style={{ color }} />
                </div>
                <span className="text-xs font-medium text-gray-700 text-center leading-tight group-hover:text-gray-900 transition-colors">
                  {COMPONENT_LABELS[type]}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
