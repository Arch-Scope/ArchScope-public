'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
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
import { SimulationNodeData, ComponentType } from '@/types';
import { COMPONENT_COLORS } from '@/lib/services';
import { cn } from '@/lib/utils';

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

function InfraNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as SimulationNodeData;
  const Icon = ICONS[nodeData.componentType] || Server;
  const color = COMPONENT_COLORS[nodeData.componentType] || '#6366f1';
  const metrics = nodeData.metrics;

  const isBottleneck = metrics?.isBottleneck;
  const utilization = metrics?.utilizationPercent ?? 0;
  const isHighlighted = !!(nodeData as Record<string, unknown>).highlighted;
  const isMultiSelected = !!(nodeData as Record<string, unknown>).isMultiSelected;

  return (
    <div
      className={cn(
        'relative rounded-xl bg-white shadow-lg transition-all min-w-[160px]',
        isBottleneck && 'animate-pulse border-red-400',
        isHighlighted && 'ring-4 ring-yellow-400/70 ring-offset-1 scale-105 z-50',
        isMultiSelected && 'ring-2 ring-blue-500 ring-offset-1'
      )}
      style={{
        border: selected || isMultiSelected ? '2px solid transparent' : `2px solid ${isBottleneck ? '#ef4444' : color}`,
        boxShadow: selected || isMultiSelected ? 
          'inset 0 0 0 2px #94a3b8, inset 0 0 0 2px transparent, inset 0 0 0 2px transparent, inset 0 0 0 2px transparent' : 
          isHighlighted ? `0 0 20px ${color}55` : undefined,
        background: 'white',
        animation: selected || isMultiSelected ? 'dashMove 0.5s linear infinite' : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} id="top-target" className="!w-3 !h-3 !bg-gray-400" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-3 !h-3 !bg-gray-400" />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-3 !h-3 !bg-gray-400" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-3 !h-3 !bg-gray-400" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-3 !h-3 !bg-gray-400" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-3 !h-3 !bg-gray-400" />

      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-800 truncate">
              {nodeData.label}
            </div>
          </div>
        </div>

        {metrics && (
          <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">Latency</span>
              <span className="font-mono font-medium text-gray-700">
                {metrics.avgLatencyMs < 1
                  ? `${(metrics.avgLatencyMs * 1000).toFixed(0)}μs`
                  : metrics.avgLatencyMs > 1000
                  ? `${(metrics.avgLatencyMs / 1000).toFixed(1)}s`
                  : `${metrics.avgLatencyMs.toFixed(1)}ms`}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">Utilization</span>
              <span
                className={cn(
                  'font-mono font-medium',
                  utilization > 90
                    ? 'text-red-600'
                    : utilization > 70
                    ? 'text-amber-600'
                    : 'text-green-600'
                )}
              >
                {utilization.toFixed(0)}%
              </span>
            </div>
            {/* Utilization bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  utilization > 90
                    ? 'bg-red-500'
                    : utilization > 70
                    ? 'bg-amber-500'
                    : 'bg-green-500'
                )}
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-3 !h-3 !bg-gray-400" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-3 !h-3 !bg-gray-400" />
    </div>
  );
}

export default memo(InfraNode);
